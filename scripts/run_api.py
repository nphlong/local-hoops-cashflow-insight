from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "pipeline"))
sys.path.insert(0, str(ROOT / "services" / "api"))

import uvicorn  # noqa: E402
from pipeline.config import api_host, api_port  # noqa: E402

if __name__ == "__main__":
    uvicorn.run("main:app", host=api_host(), port=api_port(), reload=False)
