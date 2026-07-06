#!/usr/bin/env python3
"""
Convert Breeze-ASR-26 to GGUF format for transcribe.cpp.

Downloads MediaTek-Research/Breeze-ASR-26 from HuggingFace and converts to
F32 reference GGUF. Then run tools/transcribe-quantize for Q8_0.

Usage:
  python scripts/convert_breeze_asr_26.py
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

import numpy as np
import torch
from gguf import GGMLQuantizationType, GGUFWriter, quantize as gguf_quantize
from huggingface_hub import snapshot_download
from safetensors import safe_open

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("convert")

MODEL_ID = "MediaTek-Research/Breeze-ASR-26"
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "src-tauri" / "resources" / "models" / "breeze-asr-26-Q8_0.gguf"

ENCODER_TOP = [
    ("model.encoder.conv1.weight", "enc.conv.0.weight"),
    ("model.encoder.conv1.bias", "enc.conv.0.bias"),
    ("model.encoder.conv2.weight", "enc.conv.1.weight"),
    ("model.encoder.conv2.bias", "enc.conv.1.bias"),
    ("model.encoder.embed_positions.weight", "enc.pos_emb.weight"),
    ("model.encoder.layer_norm.weight", "enc.final_norm.weight"),
    ("model.encoder.layer_norm.bias", "enc.final_norm.bias"),
]

ENCODER_BLOCK = [
    ("self_attn_layer_norm.weight", "norm_attn.weight"),
    ("self_attn_layer_norm.bias", "norm_attn.bias"),
    ("self_attn.q_proj.weight", "attn.q.weight"),
    ("self_attn.q_proj.bias", "attn.q.bias"),
    ("self_attn.k_proj.weight", "attn.k.weight"),
    ("self_attn.v_proj.weight", "attn.v.weight"),
    ("self_attn.v_proj.bias", "attn.v.bias"),
    ("self_attn.out_proj.weight", "attn.out.weight"),
    ("self_attn.out_proj.bias", "attn.out.bias"),
    ("final_layer_norm.weight", "norm_ffn.weight"),
    ("final_layer_norm.bias", "norm_ffn.bias"),
    ("fc1.weight", "ffn.fc1.weight"),
    ("fc1.bias", "ffn.fc1.bias"),
    ("fc2.weight", "ffn.fc2.weight"),
    ("fc2.bias", "ffn.fc2.bias"),
]

DECODER_TOP = [
    ("model.decoder.embed_tokens.weight", "dec.token_embd.weight"),
    ("model.decoder.embed_positions.weight", "dec.pos_emb.weight"),
    ("model.decoder.layer_norm.weight", "dec.final_norm.weight"),
    ("model.decoder.layer_norm.bias", "dec.final_norm.bias"),
]

DECODER_BLOCK = [
    ("self_attn_layer_norm.weight", "norm_self.weight"),
    ("self_attn_layer_norm.bias", "norm_self.bias"),
    ("self_attn.q_proj.weight", "self_attn.q.weight"),
    ("self_attn.q_proj.bias", "self_attn.q.bias"),
    ("self_attn.k_proj.weight", "self_attn.k.weight"),
    ("self_attn.v_proj.weight", "self_attn.v.weight"),
    ("self_attn.v_proj.bias", "self_attn.v.bias"),
    ("self_attn.out_proj.weight", "self_attn.out.weight"),
    ("self_attn.out_proj.bias", "self_attn.out.bias"),
    ("encoder_attn_layer_norm.weight", "norm_cross.weight"),
    ("encoder_attn_layer_norm.bias", "norm_cross.bias"),
    ("encoder_attn.q_proj.weight", "cross_attn.q.weight"),
    ("encoder_attn.q_proj.bias", "cross_attn.q.bias"),
    ("encoder_attn.k_proj.weight", "cross_attn.k.weight"),
    ("encoder_attn.v_proj.weight", "cross_attn.v.weight"),
    ("encoder_attn.v_proj.bias", "cross_attn.v.bias"),
    ("encoder_attn.out_proj.weight", "cross_attn.out.weight"),
    ("encoder_attn.out_proj.bias", "cross_attn.out.bias"),
    ("final_layer_norm.weight", "norm_ffn.weight"),
    ("final_layer_norm.bias", "norm_ffn.bias"),
    ("fc1.weight", "ffn.fc1.weight"),
    ("fc1.bias", "ffn.fc1.bias"),
    ("fc2.weight", "ffn.fc2.weight"),
    ("fc2.bias", "ffn.fc2.bias"),
]


def extract_tokenizer(model_dir: Path, vocab_size: int) -> dict:
    with (model_dir / "vocab.json").open(encoding="utf-8") as f:
        vocab_data = json.load(f)

    merges_path = model_dir / "merges.txt"
    if not merges_path.is_file():
        log.info("merges.txt not found, downloading from whisper-large-v2...")
        from huggingface_hub import hf_hub_download
        merges_path = Path(hf_hub_download(
            repo_id="openai/whisper-large-v2", filename="merges.txt",
        ))
    with merges_path.open(encoding="utf-8") as f:
        merges = [line.strip() for line in f if line.strip()]

    tok_by_id: dict[int, tuple[str, bool]] = {}
    for tok, tid in vocab_data.items():
        tok_by_id[int(tid)] = (tok, False)

    added_path = model_dir / "added_tokens.json"
    if added_path.is_file():
        with added_path.open(encoding="utf-8") as f:
            added_data = json.load(f)
        for content, tid in added_data.items():
            tid = int(tid)
            tok_by_id[tid] = (content, True)

    max_id = max(tok_by_id.keys())
    if max_id + 1 > vocab_size:
        raise ValueError(f"tokenizer id {max_id} > config vocab_size={vocab_size}")

    tokens: list[str] = []
    types: list[int] = []
    for i in range(vocab_size):
        if i not in tok_by_id:
            tokens.append(f"<|unused_{i}|>")
            types.append(1)
            continue
        tok, is_special = tok_by_id[i]
        tokens.append(tok)
        types.append(3 if is_special else 1)

    content_to_id = {tok: tid for tok, tid in vocab_data.items()}
    if added_path.is_file():
        with added_path.open(encoding="utf-8") as f:
            for content, tid in json.load(f).items():
                content_to_id[content] = int(tid)

    def ti(content: str) -> int | None:
        return content_to_id.get(content)

    return {
        "tokens": tokens, "types": types, "merges": merges,
        "bos_id": ti("<|endoftext|>"), "eos_id": ti("<|endoftext|>"),
        "pad_id": ti("<|endoftext|>"),
        "sot_id": ti("<|startoftranscript|>"),
        "transcribe_id": ti("<|transcribe|>"),
        "translate_id": ti("<|translate|>"),
        "no_timestamps_id": ti("<|notimestamps|>"),
        "prev_sot_id": ti("<|startofprev|>"),
    }


def main() -> int:
    t0 = time.time()

    log.info("Downloading %s...", MODEL_ID)
    model_dir = Path(snapshot_download(repo_id=MODEL_ID, allow_patterns=["*.json", "*.safetensors", "tokenizer*"]))
    log.info("Downloaded to %s", model_dir)

    with (model_dir / "config.json").open() as f:
        config = json.load(f)
    with (model_dir / "generation_config.json").open() as f:
        gen_config = json.load(f)
    with (model_dir / "preprocessor_config.json").open() as f:
        preproc = json.load(f)

    hp = {k: int(v) for k, v in {
        "d_model": config["d_model"], "enc_n_layers": config["encoder_layers"],
        "enc_n_heads": config["encoder_attention_heads"], "enc_ffn_dim": config["encoder_ffn_dim"],
        "dec_n_layers": config["decoder_layers"], "dec_n_heads": config["decoder_attention_heads"],
        "dec_ffn_dim": config["decoder_ffn_dim"], "num_mel_bins": config["num_mel_bins"],
        "max_source_positions": config["max_source_positions"],
        "max_target_positions": config["max_target_positions"], "vocab_size": config["vocab_size"],
    }.items()}
    hp["activation"] = str(config["activation_function"]).lower()
    hp["scale_embedding"] = bool(config.get("scale_embedding", False))
    hp["decoder_start_token_id"] = int(gen_config["decoder_start_token_id"])
    hp["no_timestamps_token_id"] = int(gen_config["no_timestamps_token_id"])
    hp["prev_sot_token_id"] = int(gen_config.get("prev_sot_token_id", 0) or 0)
    hp["suppress_tokens"] = [int(x) for x in gen_config.get("suppress_tokens", []) or []]
    hp["begin_suppress_tokens"] = [int(x) for x in gen_config.get("begin_suppress_tokens", []) or []]
    hp["fe_sr"] = int(preproc.get("sampling_rate", 16000))
    hp["fe_n_fft"] = int(preproc["n_fft"])
    hp["fe_hop"] = int(preproc["hop_length"])
    hp["fe_n_mels"] = int(preproc["feature_size"])
    hp["fe_chunk"] = int(preproc.get("chunk_length", 30))
    hp["fe_nsamp"] = int(preproc.get("n_samples", hp["fe_chunk"] * hp["fe_sr"]))
    hp["fe_nbf"] = int(preproc.get("nb_max_frames", hp["fe_nsamp"] // hp["fe_hop"]))

    lang_to_id = gen_config.get("lang_to_id") or {}
    languages = [tok[2:-2] for tok in lang_to_id.keys()] or ["en"]
    log.info("Languages: %d, Architecture: %d/%d enc/dec layers, d_model=%d, vocab=%d",
             len(languages), hp["enc_n_layers"], hp["dec_n_layers"],
             hp["d_model"], hp["vocab_size"])

    tok = extract_tokenizer(model_dir, hp["vocab_size"])
    log.info("Tokenizer: %d tokens, %d merges", len(tok["tokens"]), len(tok["merges"]))

    # Find safetensors files
    safetensors_files = sorted(model_dir.glob("model-*.safetensors"))
    if not safetensors_files:
        raise FileNotFoundError(f"no safetensors in {model_dir}")

    # Build tensor → shard mapping
    tensor_shard: dict[str, Path] = {}
    total_params = 0
    for sf in safetensors_files:
        with safe_open(str(sf), framework="pt") as st:
            for k in st.keys():
                tensor_shard[k] = sf
                total_params += st.get_tensor(k).numel()
    size_label = f"{total_params / 1_000_000_000:.1f}B"
    log.info("Params: %d (%s) across %d shards", total_params, size_label, len(safetensors_files))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    writer = GGUFWriter(str(OUTPUT_PATH), "whisper")

    # Metadata
    writer.add_string("general.name", "Breeze-ASR-26")
    writer.add_string("general.basename", "whisper")
    writer.add_string("general.size_label", size_label)
    writer.add_uint32("general.file_type", 7)  # MOSTLY_Q8_0
    writer.add_languages(languages)
    writer.add_string("general.author", "MediaTek Research")
    writer.add_string("general.organization", "MediaTek-Research")
    writer.add_string("general.license", "cc-by-nc-sa-4.0")
    writer.add_string("general.license.name", "CC BY-NC-SA 4.0")
    writer.add_string("general.license.link", "https://creativecommons.org/licenses/by-nc-sa/4.0/")
    writer.add_string("general.repo_url", "https://huggingface.co/MediaTek-Research/Breeze-ASR-26")
    writer.add_string("general.description", "Breeze-ASR-26: Taiwanese Hokkien (Taigi) speech recognition model")

    writer.add_string("stt.variant", "whisper-large-v2")
    writer.add_bool("stt.capability.lang_detect", len(languages) > 1)
    writer.add_bool("stt.capability.translate", len(languages) > 1)
    writer.add_bool("stt.capability.timestamps", True)
    writer.add_bool("stt.capability.streaming", False)

    writer.add_token_list(tok["tokens"])
    writer.add_token_types(tok["types"])
    writer.add_token_merges(tok["merges"])
    if tok["bos_id"] is not None:
        writer.add_uint32("tokenizer.ggml.bos_token_id", tok["bos_id"])
    if tok["eos_id"] is not None:
        writer.add_uint32("tokenizer.ggml.eos_token_id", tok["eos_id"])
    if tok["pad_id"] is not None:
        writer.add_uint32("tokenizer.ggml.padding_token_id", tok["pad_id"])
    writer.add_bool("tokenizer.ggml.add_bos_token", False)
    writer.add_string("tokenizer.ggml.model", "gpt2")
    writer.add_string("tokenizer.ggml.pre", "gpt2")

    for prefix in ("encoder", "decoder"):
        for key in ("n_layers", "d_model", "n_heads", "ffn_dim"):
            k = f"stt.whisper.{prefix}.{key}"
            if key == "d_model":
                writer.add_uint32(k, hp["d_model"])
            elif key == "n_layers":
                writer.add_uint32(k, hp[f"{prefix[:3]}_n_layers"])
            elif key == "n_heads":
                writer.add_uint32(k, hp[f"{prefix[:3]}_n_heads"])
            elif key == "ffn_dim":
                writer.add_uint32(k, hp[f"{prefix[:3]}_ffn_dim"])
        writer.add_string(f"stt.whisper.{prefix}.activation", hp["activation"])
    writer.add_uint32("stt.whisper.encoder.num_mel_bins", hp["num_mel_bins"])
    writer.add_uint32("stt.whisper.encoder.max_source_positions", hp["max_source_positions"])
    writer.add_uint32("stt.whisper.decoder.max_target_positions", hp["max_target_positions"])
    writer.add_uint32("stt.whisper.decoder.vocab_size", hp["vocab_size"])
    writer.add_bool("stt.whisper.decoder.tie_word_embeddings", True)
    writer.add_bool("stt.whisper.decoder.scale_embedding", hp["scale_embedding"])
    writer.add_uint32("stt.whisper.decoder_start_token_id", hp["decoder_start_token_id"])
    writer.add_uint32("stt.whisper.no_timestamps_token_id", hp["no_timestamps_token_id"])
    if tok["sot_id"] is not None:
        writer.add_uint32("stt.whisper.sot_token_id", tok["sot_id"])
    if tok["transcribe_id"] is not None:
        writer.add_uint32("stt.whisper.transcribe_token_id", tok["transcribe_id"])
    if tok["translate_id"] is not None:
        writer.add_uint32("stt.whisper.translate_token_id", tok["translate_id"])
    if tok["prev_sot_id"] is not None:
        writer.add_uint32("stt.whisper.prev_sot_token_id", tok["prev_sot_id"])
    if hp["suppress_tokens"]:
        writer.add_array("stt.whisper.suppress_tokens", hp["suppress_tokens"])
    if hp["begin_suppress_tokens"]:
        writer.add_array("stt.whisper.begin_suppress_tokens", hp["begin_suppress_tokens"])

    writer.add_string("stt.frontend.type", "mel")
    writer.add_uint32("stt.frontend.num_mels", hp["fe_n_mels"])
    writer.add_uint32("stt.frontend.sample_rate", hp["fe_sr"])
    writer.add_uint32("stt.frontend.n_fft", hp["fe_n_fft"])
    writer.add_uint32("stt.frontend.win_length", hp["fe_n_fft"])
    writer.add_uint32("stt.frontend.hop_length", hp["fe_hop"])
    writer.add_string("stt.frontend.window", "hann_periodic")
    writer.add_string("stt.frontend.normalize", "whisper_logmel")
    writer.add_float32("stt.frontend.dither", 0.0)
    writer.add_float32("stt.frontend.pre_emphasis", 0.0)
    writer.add_float32("stt.frontend.f_min", 0.0)
    writer.add_float32("stt.frontend.f_max", float(hp["fe_sr"]) / 2.0)
    writer.add_string("stt.frontend.pad_mode", "reflect")
    writer.add_bool("stt.frontend.center", True)
    writer.add_string("stt.frontend.mel_norm", "slaney")
    writer.add_uint32("stt.frontend.chunk_length", hp["fe_chunk"])
    writer.add_uint32("stt.frontend.n_samples", hp["fe_nsamp"])
    writer.add_uint32("stt.frontend.nb_max_frames", hp["fe_nbf"])

    # Frontend tensors
    from transformers.audio_utils import mel_filter_bank
    mel_fb = mel_filter_bank(1 + hp["fe_n_fft"] // 2, hp["fe_n_mels"], 0.0,
                             float(hp["fe_sr"]) / 2.0, hp["fe_sr"],
                             norm="slaney", mel_scale="slaney").T.astype(np.float32)
    writer.add_tensor("frontend.mel_filterbank", np.ascontiguousarray(mel_fb))
    N = hp["fe_n_fft"]
    hann = (0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(N) / N)).astype(np.float32)
    writer.add_tensor("frontend.window", np.ascontiguousarray(hann))

    # Build list of (hf_name, gguf_name) pairs
    pairs: list[tuple[str, str]] = []
    for src, dst in ENCODER_TOP:
        pairs.append((src, dst))
    for i in range(hp["enc_n_layers"]):
        for suffix_src, suffix_dst in ENCODER_BLOCK:
            pairs.append((f"model.encoder.layers.{i}.{suffix_src}", f"enc.blocks.{i}.{suffix_dst}"))
    for src, dst in DECODER_TOP:
        pairs.append((src, dst))
    for i in range(hp["dec_n_layers"]):
        for suffix_src, suffix_dst in DECODER_BLOCK:
            pairs.append((f"model.decoder.layers.{i}.{suffix_src}", f"dec.blocks.{i}.{suffix_dst}"))

    log.info("Total tensor pairs: %d", len(pairs))

    # Group by shard for efficient reading
    shard_pairs: dict[Path, list[tuple[str, str]]] = {}
    for hf_name, gguf_name in pairs:
        sf_path = tensor_shard[hf_name]
        shard_pairs.setdefault(sf_path, []).append((hf_name, gguf_name))

    n_total = len(pairs) + 2  # +2 for frontend
    n_done = 0
    bytes_f32 = 0
    bytes_stored = 0

    # Process each shard
    for sf_path, spairs in shard_pairs.items():
        log.info("Reading shard %s (%d tensors)", sf_path.name, len(spairs))
        with safe_open(str(sf_path), framework="pt") as st:
            for hf_name, gguf_name in spairs:
                t = st.get_tensor(hf_name)
                arr = t.float().numpy()
                bytes_f32 += arr.nbytes
                is_f32 = (gguf_name.endswith(".bias") or ".norm_" in gguf_name
                          or ".final_norm" in gguf_name or ".pos_emb." in gguf_name
                          or arr.ndim > 2)
                if is_f32:
                    writer.add_tensor(gguf_name, np.ascontiguousarray(arr), raw_dtype=GGMLQuantizationType.F32)
                    bytes_stored += arr.nbytes
                else:
                    qdata = gguf_quantize(arr, GGMLQuantizationType.Q8_0)
                    writer.add_tensor(gguf_name, np.ascontiguousarray(qdata), raw_dtype=GGMLQuantizationType.Q8_0)
                    bytes_stored += qdata.nbytes
                n_done += 1
                if n_done % 100 == 0:
                    log.info("  %d/%d tensors (%.0f MB -> %.0f MB stored)", n_done, n_total,
                             bytes_f32 / (1024 * 1024), bytes_stored / (1024 * 1024))

    log.info("All %d tensors processed (%.0f MB F32 -> %.0f MB Q8_0). Writing file...",
             n_done, bytes_f32 / (1024 * 1024), bytes_stored / (1024 * 1024))
    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file()
    writer.close()

    elapsed = time.time() - t0
    file_size = OUTPUT_PATH.stat().st_size
    log.info("Done! %s (%.0f MB) in %.0f seconds", OUTPUT_PATH, file_size / (1024 * 1024), elapsed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
