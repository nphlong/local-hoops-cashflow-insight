from __future__ import annotations

import os

from dotenv import load_dotenv

from pipeline.paths import ENV_FILE

load_dotenv(ENV_FILE)


def sqlite_key() -> str:
    return os.getenv("SQLITE_KEY", "").strip()


def api_host() -> str:
    return os.getenv("API_HOST", "127.0.0.1")


def api_port() -> int:
    return int(os.getenv("API_PORT", "8000"))
