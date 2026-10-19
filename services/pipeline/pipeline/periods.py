from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from typing import Iterable


def to_date(iso: str) -> date:
    y, m, d = (int(part) for part in iso.split("-"))
    return date(y, m, d)


def to_iso(value: date) -> str:
    return value.isoformat()


def add_days(iso: str, days: int) -> str:
    return to_iso(to_date(iso) + timedelta(days=days))


def format_range(start: str, end: str) -> str:
    a = to_date(start)
    b = to_date(end)
    left = a.strftime("%b %d").replace(" 0", " ")
    if a.year != b.year:
        left = a.strftime("%b %d, %Y").replace(" 0", " ")
    right = b.strftime("%b %d, %Y").replace(" 0", " ")
    return f"{left} – {right}"


def resolve_window(grain: str, as_of: str) -> dict:
    as_of_date = to_date(as_of)
    if grain == "week":
        current = {"start": add_days(as_of, -6), "end": as_of}
        prior = {"start": add_days(as_of, -13), "end": add_days(as_of, -7)}
        return {
            "grain": grain,
            "current": current,
            "prior": prior,
            "currentLabel": f"This week ({format_range(current['start'], current['end'])})",
            "priorLabel": f"Last week ({format_range(prior['start'], prior['end'])})",
        }
    if grain == "month":
        start = date(as_of_date.year, as_of_date.month, 1)
        current = {"start": to_iso(start), "end": as_of}
        if as_of_date.month == 1:
            prior_month = date(as_of_date.year - 1, 12, 1)
        else:
            prior_month = date(as_of_date.year, as_of_date.month - 1, 1)
        last_prior = monthrange(prior_month.year, prior_month.month)[1]
        prior_day = min(as_of_date.day, last_prior)
        prior_end = date(prior_month.year, prior_month.month, prior_day)
        prior = {"start": to_iso(prior_month), "end": to_iso(prior_end)}
        return {
            "grain": grain,
            "current": current,
            "prior": prior,
            "currentLabel": f"This month ({format_range(current['start'], current['end'])})",
            "priorLabel": f"Last month ({format_range(prior['start'], prior['end'])})",
        }
    current = {"start": f"{as_of_date.year}-01-01", "end": as_of}
    try:
        prior_end = date(as_of_date.year - 1, as_of_date.month, as_of_date.day)
    except ValueError:
        prior_end = date(as_of_date.year - 1, as_of_date.month, 28)
    prior = {"start": f"{as_of_date.year - 1}-01-01", "end": to_iso(prior_end)}
    return {
        "grain": grain,
        "current": current,
        "prior": prior,
        "currentLabel": f"This year ({format_range(current['start'], current['end'])})",
        "priorLabel": f"Last year ({format_range(prior['start'], prior['end'])})",
    }


def in_range(iso: str, start: str, end: str) -> bool:
    return start <= iso <= end


def in_window(rows: Iterable[dict], window: dict) -> list[dict]:
    rng = window
    return [row for row in rows if in_range(row["date"], rng["start"], rng["end"])]
