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

# Reasoning tokens dominate Spark latency: on a test photo "low" took 2.9 s vs 7.0 s
# for the default, with the same items found. Raise it if recognition gets worse.
SPARK_IDENTIFY_EFFORT = os.environ.get("SPARK_IDENTIFY_EFFORT", "low")

SESSION_TTL_MINUTES = int(os.environ.get("SESSION_TTL_MINUTES", "60"))
MAX_IMAGE_SIDE = 2048  # downscale before sending to models: cheaper and faster
SAM_PROMPTS_PER_PHOTO = 12  # SAM is cheap ($2.50 / 1,000 images) and ~1 s per call
MAX_PARALLEL_SPARK_CALLS = 8  # rate limit is 3,000 RPM; this only smooths bursts
MAX_PARALLEL_SAM_CALLS = 12

BRAND = json.loads((REPO_ROOT / "packages" / "shared" / "brand.json").read_text(encoding="utf-8"))
