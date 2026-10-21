from __future__ import annotations

import json
from pathlib import Path

from pipeline.paths import company_pages
from pipeline.tab_api import build_payloads


def export_pages(out_dir: Path | None = None, company: str = "local-hoops") -> Path:
    dest = out_dir or company_pages(company)
    dest.mkdir(parents=True, exist_ok=True)
    payloads = build_payloads(redacted=True, company=company)
    for name in ("meta", "pnl", "cashflow", "ledger"):
        target = dest / f"{name}.json"
        body = payloads["meta"] if name == "meta" else payloads[name]
        target.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest
