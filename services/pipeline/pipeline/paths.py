from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parents[2]
DATA_RAW = REPO_ROOT / "data" / "raw"
DATA_CURATED = REPO_ROOT / "data" / "curated"
SQLITE_PATH = DATA_CURATED / "local_hoops.sqlite"
SQLITE_ENC_PATH = DATA_CURATED / "local_hoops.sqlite.enc"
PAGES_OUT = REPO_ROOT / "public" / "data" / "v1"
ENV_FILE = REPO_ROOT / ".env"
