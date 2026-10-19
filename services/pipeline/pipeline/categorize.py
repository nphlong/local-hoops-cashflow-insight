from __future__ import annotations

import re
import unicodedata

CHANNEL_LABELS = {
    "kiotviet": "KiotViet POS",
    "momo": "MoMo",
    "zalopay": "ZaloPay",
    "bank_transfer": "Bank transfer",
    "unknown": "Other",
}

RENT_COUNTERPARTY = "cong ty tnhh thuong mai dich vu phat trien tan an nguyen"
INVENTORY_COUNTERPARTY = "nguyen viet binh minh"
COURT_AMOUNTS = (39_000, 49_000, 59_000)
FB_AMOUNTS = (10_000, 15_000, 25_000)
COURT_BANK_MIN = 300_000
COURT_BANK_MAX = 20_000_000
COURT_CHANNELS = {"bank_transfer", "momo", "zalopay"}
THANH_TOAN_SAN = re.compile(r"thanh\s+toan.*san")
TIEN_DIEN = re.compile(r"t\s*i\s*e\s*n\s*d\s*i\s*e\s*n")
STAFF_MEMO = re.compile(r"luong|phu\s+cap|kpi|(?<![a-z])thuong(?!\s*mai)")


def _fold(text: str) -> str:
    swapped = (text or "").replace("đ", "d").replace("Đ", "D")
    normalized = unicodedata.normalize("NFD", swapped)
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", stripped).strip().lower()


def _divisible(amount: float, divisors: tuple[int, ...]) -> bool:
    units = int(round(amount))
    if units <= 0:
        return False
    return any(units % divisor == 0 for divisor in divisors)


def is_court_fb_mix(amount: float) -> bool:
    """One or two court slots plus a single F&B add-on (e.g. 49_000 + 25_000)."""
    units = int(round(amount))
    if units <= 0:
        return False
    for court in COURT_AMOUNTS:
        for slots in (1, 2):
            rest = units - slots * court
            if rest in FB_AMOUNTS:
                return True
    return False


def detect_channel(counterparty: str, description: str) -> str:
    blob = _fold(f"{counterparty} {description}")
    if "kiotviet" in blob or "kovqr" in blob:
        return "kiotviet"
    if "momo" in blob or "dich vu di dong truc tuyen" in blob:
        return "momo"
    if "zalo" in blob or "cong ty co phan zion" in blob:
        return "zalopay"
    if re.search(r"\w", blob):
        return "bank_transfer"
    return "unknown"


def categorize(
    description: str,
    counterparty: str,
    credit: float,
    debit: float,
    posted_on: str | None = None,
) -> tuple[str, str, bool]:
    party = _fold(counterparty)
    memo = _fold(description)
    blob = f"{party} {memo}".strip()
    channel = detect_channel(counterparty, description)

    if debit > 0 and credit == 0:
        if RENT_COUNTERPARTY in party:
            return "outflow", "renting", False
        if INVENTORY_COUNTERPARTY in party:
            return "outflow", "inventory", False
        if "thue mat bang" in blob or "tien thue mb" in blob:
            return "outflow", "renting", False
        if TIEN_DIEN.search(memo) or "electric" in blob:
            return "outflow", "electricity", False
        if STAFF_MEMO.search(memo) or "salary" in blob or "nhan vien" in blob:
            return "outflow", "employees", False
        if "nuoc" in blob or "water" in blob:
            return "outflow", "water", False
        if "thue tncn" in blob or "tax" in blob:
            return "outflow", "tax", False
        return "outflow", "expense_misc", True

    if THANH_TOAN_SAN.search(memo) or "thue san" in memo or _divisible(credit, COURT_AMOUNTS):
        return "inflow", "basketball_courts", False
    if is_court_fb_mix(credit) or (_divisible(credit, FB_AMOUNTS) and credit <= COURT_BANK_MIN):
        return "inflow", "fb_income", False
    if "ban nuoc" in memo or channel == "kiotviet":
        return "inflow", "fb_income", False
    if channel in COURT_CHANNELS and COURT_BANK_MIN < credit < COURT_BANK_MAX:
        return "inflow", "basketball_courts", False
    if credit > 0:
        return "inflow", "other_income", True
    return "inflow", "income_misc", True
