from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
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


def _company(company: str) -> str:
    if company not in ("local-hoops", "tlsc"):
        raise HTTPException(status_code=400, detail="Unknown company")
    return company


@app.get("/api/v1/meta")
def meta(company: str = Query(default="local-hoops")):
    return build_payloads(redacted=False, company=_company(company))["meta"]


@app.get("/api/v1/pnl")
def pnl(company: str = Query(default="local-hoops")):
    return build_payloads(redacted=False, company=_company(company))["pnl"]


@app.get("/api/v1/cashflow")
def cashflow(company: str = Query(default="local-hoops")):
    return build_payloads(redacted=False, company=_company(company))["cashflow"]


@app.get("/api/v1/ledger")
def ledger(company: str = Query(default="local-hoops")):
    return build_payloads(redacted=False, company=_company(company))["ledger"]
