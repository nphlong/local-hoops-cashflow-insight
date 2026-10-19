from __future__ import annotations

from pipeline.aggregate import as_ledger_rows, grain_payloads
from pipeline.categorize import CHANNEL_LABELS
from pipeline.db import connect


def load_gold(conn=None):
    own = conn is None
    if own:
        conn = connect()
    try:
        meta_row = conn.execute("SELECT * FROM gold_meta WHERE id = 1").fetchone()
        if meta_row is None:
            raise RuntimeError("gold_meta is empty — run ingest first")
        gold = conn.execute(
            """
            SELECT id, bank_ref, source_id, posted_on, amount, category_type, category_id,
                   channel, needs_review, description, counterparty, balance_after
            FROM gold_transactions
            ORDER BY posted_on ASC, id ASC
            """
        ).fetchall()
        meta = {
            "asOf": meta_row["as_of"],
            "currency": meta_row["currency"],
            "openingBalance": meta_row["opening_balance"],
            "closingBalance": meta_row["closing_balance"],
            "accountNo": meta_row["account_no"],
            "transactionCount": meta_row["transaction_count"],
        }
        return meta, [dict(row) for row in gold]
    finally:
        if own:
            conn.close()


def build_payloads(redacted: bool = True) -> dict:
    meta, gold = load_gold()
    ledger_rows = as_ledger_rows(gold)
    pnl_grains, cash_grains = grain_payloads(ledger_rows, meta["asOf"], meta["openingBalance"])
    if redacted:
        transactions = [
            {
                "id": row["id"],
                "sourceId": row["source_id"],
                "date": row["posted_on"],
                "amount": row["amount"],
                "categoryType": row["category_type"],
                "categoryId": row["category_id"],
                "channel": row["channel"],
                "needsReview": bool(row["needs_review"]),
            }
            for row in gold
        ]
    else:
        transactions = [
            {
                "id": row["id"],
                "sourceId": row["source_id"],
                "date": row["posted_on"],
                "amount": row["amount"],
                "categoryType": row["category_type"],
                "categoryId": row["category_id"],
                "channel": row["channel"],
                "needsReview": bool(row["needs_review"]),
                "description": row["description"] or CHANNEL_LABELS.get(row["channel"], row["channel"]),
                "counterparty": row["counterparty"] or "",
                "bankRef": row["bank_ref"],
                "balanceAfter": row["balance_after"],
            }
            for row in gold
        ]
    return {
        "meta": meta,
        "pnl": {"meta": meta, "grains": pnl_grains},
        "cashflow": {"meta": meta, "grains": cash_grains},
        "ledger": {"meta": meta, "transactions": transactions},
    }
