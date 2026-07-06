"""
上傳 Breeze-ASR-26 GGUF 到 HuggingFace + 寫入 catalog.json

用法：
  1. 先在 https://huggingface.co/settings/tokens 產生 write token
  2. 執行: $env:HF_TOKEN="hf_xxxx"; python scripts\\upload_breeze.py
"""
import json, os, sys, datetime

HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    print("❌ 請先設定環境變數 HF_TOKEN")
    print("   PowerShell: $env:HF_TOKEN=\"hf_xxxx\"")
    sys.exit(1)

# ── 設定 ──────────────────────────────────────────────
REPO_ID = "m45801ch/breeze-asr-26-gguf"    # 上傳目標（改成你自己的 HF 帳號）
GGUF_PATH = os.path.join(os.path.dirname(__file__), "..",
                         "src-tauri", "resources", "models",
                         "breeze-asr-26-Q8_0.gguf")
CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..",
                            "src-tauri", "src", "catalog", "catalog.json")
REVISION = "main"

# ── 上傳到 HuggingFace ────────────────────────────────
print(f"📤 上傳 {GGUF_PATH} → {REPO_ID}")
print(f"    檔案大小: {os.path.getsize(GGUF_PATH) / 1024 / 1024:.1f} MB")

from huggingface_hub import HfApi
api = HfApi(token=HF_TOKEN)

# 建立/取得 repo
try:
    api.repo_info(REPO_ID, repo_type="model")
    print(f"✅ Repo 已存在: {REPO_ID}")
except Exception:
    api.create_repo(REPO_ID, repo_type="model", private=False)
    print(f"✅ 已建立新 repo: {REPO_ID}")

# 上傳 GGUF（LFS 自動處理）
api.upload_file(
    path_or_fileobj=GGUF_PATH,
    path_in_repo="breeze-asr-26-Q8_0.gguf",
    repo_id=REPO_ID,
    repo_type="model",
)
print("✅ GGUF 上傳完成")

# ── 加入 catalog.json ─────────────────────────────────
print(f"📝 更新 {CATALOG_PATH}")

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

# 建立新條目
entry = {
    "id": REPO_ID,
    "slug": "breeze-asr-26",
    "name": "Breeze-ASR-26",
    "architecture": "whisper",
    "family": "whisper",
    "parameters": "1.6B",
    "description": "Optimized for Taiwanese Mandarin. Code-switching support.",
    "base_model": "MediaTek-Research/Breeze-ASR-26",
    "license": "other",
    "language_count": 2,
    "languages": ["zh", "nan"],
    "capabilities": {
        "streaming": False,
        "translate": True,
        "lang_detect": True,
        "timestamps": "segment",
    },
    "speed_score": 36,
    "accuracy_score": 84,
    "files": [
        {
            "filename": "breeze-asr-26-Q8_0.gguf",
            "quant": "Q8_0",
            "size_bytes": os.path.getsize(GGUF_PATH),
        }
    ],
    "default_quant": "Q8_0",
    "recommended": False,
    "recommended_rank": None,
}

# 避免重複加入
existing = [m for m in catalog["models"] if m["id"] != REPO_ID]
existing.append(entry)
catalog["models"] = existing
catalog["generated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

# 寫回（保持縮排與 gen_catalog.py 一致）
text = json.dumps(catalog, indent=2, ensure_ascii=False)
text = text.replace(
    '"languages": ',
    '"languages": ',
)
import re
text = re.sub(
    r'"languages": \[(.*?)\]',
    lambda m: '"languages": [' + ", ".join(re.findall(r'"[^"]*"', m.group(1))) + ']',
    text,
    flags=re.S,
)
with open(CATALOG_PATH, "w", encoding="utf-8") as f:
    f.write(text)

print(f"✅ catalog.json 已更新！共有 {len(catalog['models'])} 個模型")
print("\n🎉 完成！現在可以重新 build App，Breeze-ASR-26 會出現在模型清單中可自動下載。")
