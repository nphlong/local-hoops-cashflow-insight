from __future__ import annotations

from pathlib import Path

from pipeline.categorize import categorize, detect_channel
from pipeline.config import sqlite_key
from pipeline.db import session
from pipeline.ids import row_id, source_id
from pipeline.parse_mb_bank import parse_workbook
from pipeline.paths import DATA_RAW


def ingest_dir(raw_dir: Path | None = None) -> dict:
    folder = raw_dir or DATA_RAW
    files = sorted(folder.glob("*.xlsx"))
    if not files:
        raise FileNotFoundError(f"No .xlsx files in {folder}")

    key = sqlite_key()
    stats = {"files": 0, "rows": 0, "credits": 0.0, "debits": 0.0, "skipped_refs": 0}

    with session() as conn:
        for path in files:
            bronze = parse_workbook(path)
            sid = source_id(bronze.filename)
            conn.execute(
                """
                INSERT INTO bronze_files (
                  source_id, filename, account_no, currency, statement_from, statement_to,
                  closing_balance, credit_total, row_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                  filename=excluded.filename,
                  account_no=excluded.account_no,
                  closing_balance=excluded.closing_balance,
                  credit_total=excluded.credit_total,
                  row_count=excluded.row_count
                """,
                (
                    sid,
                    bronze.filename,
                    bronze.account_no,
                    bronze.currency,
                    bronze.statement_from,
                    bronze.statement_to,
                    bronze.closing_balance,
                    bronze.credit_total,
                    len(bronze.rows),
                ),
            )
            conn.execute("DELETE FROM bronze_rows WHERE source_id = ?", (sid,))
            for row in bronze.rows:
                bank_ref = row.bank_ref or f"{sid}:{row.seq}:{row.booked_at}"
                conn.execute(
                    """
                    INSERT INTO bronze_rows (
                      source_id, seq, booked_at, posted_on, debit, credit, balance_after,
                      counterparty, description, bank_ref
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        sid,
                        row.seq,
                        row.booked_at,
                        row.posted_on,
                        row.debit,
                        row.credit,
                        row.balance_after,
                        row.counterparty,
                        row.description,
                        bank_ref,
                    ),
                )
                signed = row.credit - row.debit
                channel = detect_channel(row.counterparty, row.description)
                existing = conn.execute(
                    "SELECT 1 FROM silver_transactions WHERE bank_ref = ?",
                    (bank_ref,),
                ).fetchone()
                if existing:
                    stats["skipped_refs"] += 1
                conn.execute(
                    """
                    INSERT INTO silver_transactions (
                      bank_ref, source_id, booked_at, posted_on, debit, credit, signed_amount,
                      balance_after, counterparty, description, channel
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(bank_ref) DO UPDATE SET
                      source_id=excluded.source_id,
                      booked_at=excluded.booked_at,
                      posted_on=excluded.posted_on,
                      debit=excluded.debit,
                      credit=excluded.credit,
                      signed_amount=excluded.signed_amount,
                      balance_after=excluded.balance_after,
                      counterparty=excluded.counterparty,
                      description=excluded.description,
                      channel=excluded.channel
                    """,
                    (
                        bank_ref,
                        sid,
                        row.booked_at,
                        row.posted_on or (row.booked_at or "")[:10],
                        row.debit,
                        row.credit,
                        signed,
                        row.balance_after,
                        row.counterparty,
                        row.description,
                        channel,
                    ),
                )
                category_type, category_id, needs_review = categorize(
                    row.description,
                    row.counterparty,
                    row.credit,
                    row.debit,
                    row.posted_on,
                )
                opaque = row_id(bank_ref, key)
                conn.execute(
                    """
                    INSERT INTO gold_transactions (
                      id, bank_ref, source_id, posted_on, amount, category_type, category_id,
                      channel, needs_review, description, counterparty, balance_after
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(bank_ref) DO UPDATE SET
                      source_id=excluded.source_id,
                      posted_on=excluded.posted_on,
                      amount=excluded.amount,
                      category_type=excluded.category_type,
                      category_id=excluded.category_id,
                      channel=excluded.channel,
                      needs_review=excluded.needs_review,
                      description=excluded.description,
                      counterparty=excluded.counterparty,
                      balance_after=excluded.balance_after
                    """,
                    (
                        opaque,
                        bank_ref,
                        sid,
                        row.posted_on or (row.booked_at or "")[:10],
                        abs(signed),
                        category_type,
                        category_id,
                        channel,
                        1 if needs_review else 0,
                        row.description,
                        row.counterparty,
                        row.balance_after,
                    ),
                )
                stats["rows"] += 1
                stats["credits"] += row.credit
                stats["debits"] += row.debit
            stats["files"] += 1

        silver = conn.execute(
            """
            SELECT posted_on, signed_amount, balance_after
            FROM silver_transactions
            ORDER BY posted_on ASC, booked_at ASC, bank_ref ASC
            """
        ).fetchall()
        if not silver:
            raise RuntimeError("No silver rows after ingest")
        first = silver[0]
        opening = (first["balance_after"] or 0) - first["signed_amount"]
        last = silver[-1]
        as_of = last["posted_on"]
        account = conn.execute(
            "SELECT account_no FROM bronze_files WHERE account_no IS NOT NULL LIMIT 1"
        ).fetchone()
        conn.execute(
            """
            INSERT INTO gold_meta (
              id, as_of, currency, opening_balance, closing_balance, account_no, transaction_count
            ) VALUES (1, ?, 'VND', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              as_of=excluded.as_of,
              opening_balance=excluded.opening_balance,
              closing_balance=excluded.closing_balance,
              account_no=excluded.account_no,
              transaction_count=excluded.transaction_count
            """,
            (
                as_of,
                opening,
                last["balance_after"] or opening,
                account["account_no"] if account else None,
                len(silver),
            ),
        )

    stats["opening"] = opening
    stats["as_of"] = as_of
    return stats
