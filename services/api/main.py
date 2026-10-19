from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "pipeline"))

from pipeline.tab_api import build_payloads  # noqa: E402

app = FastAPI(title="Local Hoops ledger API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/v1/meta")
def meta():
    return build_payloads(redacted=False)["meta"]


@app.get("/api/v1/pnl")
def pnl():
    return build_payloads(redacted=False)["pnl"]


@app.get("/api/v1/cashflow")
def cashflow():
    return build_payloads(redacted=False)["cashflow"]


@app.get("/api/v1/ledger")
def ledger():
    return build_payloads(redacted=False)["ledger"]
