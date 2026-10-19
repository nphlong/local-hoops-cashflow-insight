from __future__ import annotations

import base64
import hashlib
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from cryptography.fernet import Fernet

from pipeline.config import sqlite_key
from pipeline.paths import DATA_CURATED, SQLITE_ENC_PATH, SQLITE_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS bronze_files (
  source_id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  account_no TEXT,
  currency TEXT,
  statement_from TEXT,
  statement_to TEXT,
  closing_balance REAL,
  credit_total REAL,
  row_count INTEGER,
  ingested_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bronze_rows (
  source_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  booked_at TEXT,
  posted_on TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  balance_after REAL,
  counterparty TEXT,
  description TEXT,
  bank_ref TEXT,
  PRIMARY KEY (source_id, seq),
  FOREIGN KEY (source_id) REFERENCES bronze_files(source_id)
);

CREATE TABLE IF NOT EXISTS silver_transactions (
  bank_ref TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  booked_at TEXT,
  posted_on TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  signed_amount REAL NOT NULL,
  balance_after REAL,
  counterparty TEXT,
  description TEXT,
  channel TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gold_transactions (
  id TEXT PRIMARY KEY,
  bank_ref TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL,
  posted_on TEXT NOT NULL,
  amount REAL NOT NULL,
  category_type TEXT NOT NULL,
  category_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  counterparty TEXT,
  balance_after REAL
);

CREATE TABLE IF NOT EXISTS gold_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  as_of TEXT NOT NULL,
  currency TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  closing_balance REAL NOT NULL,
  account_no TEXT,
  transaction_count INTEGER NOT NULL
);
"""


def _fernet(key: str) -> Fernet:
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _unlock() -> None:
    DATA_CURATED.mkdir(parents=True, exist_ok=True)
    key = sqlite_key()
    if not key or not SQLITE_ENC_PATH.exists():
        return
    payload = SQLITE_ENC_PATH.read_bytes()
    SQLITE_PATH.write_bytes(_fernet(key).decrypt(payload))


def seal() -> None:
    key = sqlite_key()
    if not key or not SQLITE_PATH.exists():
        return
    SQLITE_ENC_PATH.write_bytes(_fernet(key).encrypt(SQLITE_PATH.read_bytes()))


def connect(path: Path | None = None) -> sqlite3.Connection:
    _unlock()
    db_path = path or SQLITE_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    return conn


@contextmanager
def session(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    conn = connect(path)
    try:
        yield conn
        conn.commit()
        if path is None:
            seal()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
