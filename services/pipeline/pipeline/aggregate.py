from __future__ import annotations

from calendar import monthrange
from datetime import date

from pipeline.periods import in_window, resolve_window, to_date

INFLOW_NAMES = [
    {"id": "other_income", "name": "Other Income"},
    {"id": "basketball_courts", "name": "Basketball Courts Income (Net)"},
    {"id": "fb_income", "name": "F&B Income (Net)"},
    {"id": "income_misc", "name": "Misc"},
]
OUTFLOW_NAMES = [
    {"id": "expense_misc", "name": "Misc"},
    {"id": "renting", "name": "Renting"},
    {"id": "tax", "name": "Tax"},
    {"id": "inventory", "name": "Inventory"},
    {"id": "electricity", "name": "Electricity"},
    {"id": "employees", "name": "Employees"},
    {"id": "water", "name": "Water"},
]


def as_ledger_rows(gold_rows: list[dict]) -> list[dict]:
    return [
        {
            "id": row["id"],
            "date": row["posted_on"],
            "amount": row["amount"],
            "categoryType": row["category_type"],
            "categoryId": row["category_id"],
            "needsReview": bool(row["needs_review"]),
            "channel": row["channel"],
            "sourceId": row["source_id"],
        }
        for row in gold_rows
    ]


def summarize(transactions: list[dict]) -> dict:
    inflows = [t for t in transactions if t["categoryType"] == "inflow"]
    outflows = [t for t in transactions if t["categoryType"] == "outflow"]
    total_in = sum(t["amount"] for t in inflows)
    total_out = sum(t["amount"] for t in outflows)
    courts = [t for t in inflows if t["categoryId"] == "basketball_courts"]
    court_amt = sum(t["amount"] for t in courts)
    fb_amt = sum(t["amount"] for t in inflows if t["categoryId"] == "fb_income")
    bookings = len(courts)
    return {
        "totalInflow": total_in,
        "totalOutflow": total_out,
        "netCashflow": total_in - total_out,
        "bookingCount": bookings,
        "revenuePerBooking": court_amt / bookings if bookings else 0,
        "courtHireShare": court_amt / total_in if total_in else 0,
        "fbShare": fb_amt / total_in if total_in else 0,
        "reviewCount": sum(1 for t in transactions if t.get("needsReview")),
    }


def mix_by_category(transactions: list[dict], kind: str) -> dict[str, float]:
    mix: dict[str, float] = {}
    for tx in transactions:
        if tx["categoryType"] != kind:
            continue
        mix[tx["categoryId"]] = mix.get(tx["categoryId"], 0) + tx["amount"]
    return mix


def category_track_rows(current: dict[str, float], prior: dict[str, float], names: list[dict]) -> list[dict]:
    ids = sorted(set(current) | set(prior) | {n["id"] for n in names})
    lookup = {n["id"]: n["name"] for n in names}
    rows = []
    for cat_id in ids:
        tracked = current.get(cat_id, 0)
        budget = prior.get(cat_id, 0)
        if tracked == 0 and budget == 0:
            continue
        pct = 0 if budget == 0 and tracked == 0 else (1 if budget == 0 else tracked / budget)
        rows.append(
            {
                "id": cat_id,
                "name": lookup.get(cat_id, cat_id),
                "tracked": tracked,
                "budget": budget,
                "pct": pct,
                "remaining": max(budget - tracked, 0),
                "excess": max(tracked - budget, 0),
            }
        )
    rows.sort(key=lambda row: row["tracked"], reverse=True)
    return rows


def last_twelve_months(transactions: list[dict], as_of: str) -> list[dict]:
    as_of_date = to_date(as_of)
    buckets: dict[str, dict] = {}
    for tx in transactions:
        key = tx["date"][:7]
        point = buckets.setdefault(key, {"key": key, "inflow": 0.0, "outflow": 0.0})
        if tx["categoryType"] == "inflow":
            point["inflow"] += tx["amount"]
        else:
            point["outflow"] += tx["amount"]
    points = []
    for i in range(11, -1, -1):
        month = as_of_date.month - i
        year = as_of_date.year
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year:04d}-{month:02d}"
        label = date(year, month, 1).strftime("%b %y")
        existing = buckets.get(key, {"inflow": 0.0, "outflow": 0.0})
        points.append({"key": key, "label": label, "inflow": existing["inflow"], "outflow": existing["outflow"]})
    return points


def ytd_monthly(transactions: list[dict], as_of: str) -> list[dict]:
    year = as_of[:4]
    through = int(as_of[5:7])
    buckets: dict[str, dict] = {}
    for tx in transactions:
        if not tx["date"].startswith(year) or tx["date"] > as_of:
            continue
        key = tx["date"][:7]
        point = buckets.setdefault(key, {"key": key, "inflow": 0.0, "outflow": 0.0})
        if tx["categoryType"] == "inflow":
            point["inflow"] += tx["amount"]
        else:
            point["outflow"] += tx["amount"]
    points = []
    for month in range(1, through + 1):
        key = f"{year}-{month:02d}"
        label = date(int(year), month, 1).strftime("%b %y")
        existing = buckets.get(key, {"inflow": 0.0, "outflow": 0.0})
        points.append({"key": key, "label": label, "inflow": existing["inflow"], "outflow": existing["outflow"]})
    return points


def running_cash_on_hand(transactions: list[dict], opening: float, series: list[dict], as_of: str) -> list[dict]:
    ordered = sorted(transactions, key=lambda tx: (tx["date"], tx["id"]))
    ledger = []
    balance = opening
    for tx in ordered:
        signed = tx["amount"] if tx["categoryType"] == "inflow" else -tx["amount"]
        balance += signed
        ledger.append({"date": tx["date"], "balance": balance})
    out = []
    for point in series:
        year, month = (int(part) for part in point["key"].split("-"))
        last_day = monthrange(year, month)[1]
        cutoff_day = min(int(as_of[8:10]), last_day) if point["key"] == as_of[:7] else last_day
        cutoff = f"{point['key']}-{cutoff_day:02d}"
        cash = opening
        for row in ledger:
            if row["date"] > cutoff:
                break
            cash = row["balance"]
        out.append({**point, "cashOnHand": cash})
    return out


def grain_payloads(transactions: list[dict], as_of: str, opening: float) -> tuple[dict, dict]:
    series = last_twelve_months(transactions, as_of)
    cash_series = running_cash_on_hand(transactions, opening, series, as_of)
    pnl_grains = {}
    cash_grains = {}
    for grain in ("week", "month", "year"):
        window = resolve_window(grain, as_of)
        current_rows = in_window(transactions, window["current"])
        prior_rows = in_window(transactions, window["prior"])
        current = summarize(current_rows)
        prior = summarize(prior_rows)
        pnl_grains[grain] = {
            "kpis": current,
            "window": window,
            "lastTwelveMonths": series,
            "cashOnHand": cash_series,
        }
        cash_grains[grain] = {
            "window": window,
            "current": current,
            "prior": prior,
            "incomeRows": category_track_rows(
                mix_by_category(current_rows, "inflow"),
                mix_by_category(prior_rows, "inflow"),
                INFLOW_NAMES,
            ),
            "expenseRows": category_track_rows(
                mix_by_category(current_rows, "outflow"),
                mix_by_category(prior_rows, "outflow"),
                OUTFLOW_NAMES,
            ),
            "ytdMonthly": ytd_monthly(transactions, as_of),
        }
    return pnl_grains, cash_grains
