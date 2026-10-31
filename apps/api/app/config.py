"""Settings, read from the repo-root .env (never committed) and the environment."""

import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_dotenv(path: Path) -> None:
    # Tiny .env reader: KEY=VALUE lines; real environment variables win.
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(REPO_ROOT / ".env")

MODEL_API_KEY = os.environ.get("MODEL_API_KEY", "")
MODEL_BASE_URL = os.environ.get("MODEL_BASE_URL", "https://api.meta.ai/v1")

# Mock mode returns fake, clearly labeled results so the UI can be tested without a key.
MOCK = os.environ.get("MOCK", "").lower() in ("1", "true") or not MODEL_API_KEY

# Standard mode only: contributor variants let Meta train on user photos.
SPARK_MODEL = "muse-spark-1.3"
SAM_MODEL = "sam-3.1"
for _m in (SPARK_MODEL, SAM_MODEL):
    if "contributor" in _m:
        raise RuntimeError(f"{_m}: -contributor models are not allowed (privacy rule)")

SESSION_TTL_MINUTES = int(os.environ.get("SESSION_TTL_MINUTES", "60"))
MAX_IMAGE_SIDE = 2048  # downscale before sending to models: cheaper and faster
SAM_PROMPTS_PER_PHOTO = 4
MAX_PARALLEL_MODEL_CALLS = 4

BRAND = json.loads((REPO_ROOT / "packages" / "shared" / "brand.json").read_text(encoding="utf-8"))
