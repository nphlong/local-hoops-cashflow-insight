from __future__ import annotations

import json
from pathlib import Path

from pipeline.paths import PAGES_OUT
from pipeline.tab_api import build_payloads


def export_pages(out_dir: Path | None = None) -> Path:
    dest = out_dir or PAGES_OUT
    dest.mkdir(parents=True, exist_ok=True)
    payloads = build_payloads(redacted=True)
    for name in ("meta", "pnl", "cashflow", "ledger"):
        target = dest / f"{name}.json"
        body = payloads["meta"] if name == "meta" else payloads[name]
        target.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest
