#!/usr/bin/env python3
"""
Quantize a GGUF model file (F32 reference) to Q8_0.

Usage:
  python scripts/quantize_gguf.py <input.gguf> [output.gguf]

If output is omitted, appends -Q8_0 before the extension.
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

import numpy as np
from gguf import GGMLQuantizationType, GGUFReader, GGUFWriter, quantize as gguf_quantize

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("quantize")


def should_force_f32(name: str) -> bool:
    if name.endswith(".bias"):
        return True
    if ".norm_" in name or ".final_norm" in name:
        return True
    if ".pos_emb." in name:
        return True
    if name.startswith("frontend."):
        return True
    return False


def main() -> int:
    args = sys.argv[1:]
    if not args:
        log.error("Usage: python quantize_gguf.py <input.gguf> [output.gguf]")
        return 1

    in_path = Path(args[0])
    if not in_path.is_file():
        log.error("Input file not found: %s", in_path)
        return 1

    if len(args) > 1:
        out_path = Path(args[1])
    else:
        stem = in_path.stem
        out_path = in_path.with_name(stem + "-Q8_0.gguf")

    t0 = time.time()
    log.info("Reading %s...", in_path)
    reader = GGUFReader(str(in_path))
    log.info("  %d tensors, arch=%s", len(reader.tensors), reader.filetensor_infos[0].name if reader.tensors else "?")

    # Get architecture from metadata
    arch = "whisper"
    for k, v in zip(reader.filetensor_infos, reader.tensors):
        pass

    log.info("Writing %s...", out_path)
    writer = GGUFWriter(str(out_path), arch)

    # Copy all metadata (KV pairs)
    for ki, kv in enumerate(reader.filetensor_infos):
        if kv.num_elements == 0:
            continue
        val = reader.get_fields()
        # Actually let's do it differently using the raw approach
        break

    # Simpler approach: read tensor by tensor, quantize, write new file
    # Build the tensor info list
    tensor_data: list[tuple[str, np.ndarray, GGMLQuantizationType | None]] = []
    bytes_f32 = 0
    bytes_q = 0
    n_q = 0
    n_f32 = 0

    for tensor in reader.tensors:
        name = tensor.name
        arr = tensor.data
        if arr.dtype != np.float32:
            log.warning("  Skipping %s (dtype=%s)", name, arr.dtype)
            tensor_data.append((name, arr, None))
            continue

        if should_force_f32(name) or arr.ndim > 2:
            tensor_data.append((name, arr, GGMLQuantizationType.F32))
            bytes_f32 += arr.nbytes
            bytes_q += arr.nbytes
            n_f32 += 1
        else:
            log.info("  Quantizing %s: shape=%s", name, list(arr.shape))
            qdata = gguf_quantize(arr, GGMLQuantizationType.Q8_0)
            tensor_data.append((name, qdata, GGMLQuantizationType.Q8_0))
            bytes_q += qdata.nbytes
            n_q += 1

    log.info("%d tensors quantized, %d kept F32", n_q, n_f32)
    log.info("F32 size: %.0f MB, quantized size: %.0f MB (ratio: %.2f)",
             bytes_f32 / (1024*1024), bytes_q / (1024*1024), bytes_q / bytes_f32 if bytes_f32 else 0)

    # Now write the quantized GGUF
    log.info("Writing quantized GGUF...")
    writer = GGUFWriter(str(out_path), arch)
    for name, data, dtype in tensor_data:
        writer.add_tensor(name, np.ascontiguousarray(data), raw_dtype=dtype)

    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file()
    writer.close()

    elapsed = time.time() - t0
    file_size = out_path.stat().st_size
    log.info("Done! %s (%.0f MB) in %.0f seconds", out_path, file_size / (1024 * 1024), elapsed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
