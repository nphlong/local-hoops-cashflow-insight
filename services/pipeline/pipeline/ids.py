from __future__ import annotations

import hashlib
import hmac
from pathlib import Path


def source_id(filename: str) -> str:
    return hashlib.sha256(Path(filename).name.encode("utf-8")).hexdigest()


def row_id(bank_ref: str, key: str) -> str:
    secret = (key or "local-dev-only").encode("utf-8")
    return hmac.new(secret, bank_ref.encode("utf-8"), hashlib.sha256).hexdigest()
