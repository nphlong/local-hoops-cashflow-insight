from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parents[2]
DATA_RAW = REPO_ROOT / "data" / "raw"
DATA_CURATED = REPO_ROOT / "data" / "curated"
SQLITE_PATH = DATA_CURATED / "local_hoops.sqlite"
SQLITE_ENC_PATH = DATA_CURATED / "local_hoops.sqlite.enc"
PAGES_OUT = REPO_ROOT / "public" / "data" / "v1"
TLSC_SQLITE_PATH = DATA_CURATED / "tlsc.sqlite"
TLSC_SQLITE_ENC_PATH = DATA_CURATED / "tlsc.sqlite.enc"


def company_db(company: str) -> tuple[Path, Path]:
    if company == "tlsc":
        return TLSC_SQLITE_PATH, TLSC_SQLITE_ENC_PATH
    if company == "local-hoops":
        return SQLITE_PATH, SQLITE_ENC_PATH
    raise ValueError(f"Unknown company {company}")


def company_pages(company: str) -> Path:
    if company == "tlsc":
        return PAGES_OUT / "tlsc"
    if company == "local-hoops":
        return PAGES_OUT
    raise ValueError(f"Unknown company {company}")
ENV_FILE = REPO_ROOT / ".env"
