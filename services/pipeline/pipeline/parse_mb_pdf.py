"""MB Bank 'Sổ phụ' PDF statements (Oracle BI Publisher) into bronze rows.

Transaction text is a real text layer with a per-font ToUnicode map, so this
parser does not OCR. Wrapped detail and beneficiary lines join onto the row
that owns the date and FT reference.
"""

from __future__ import annotations

import re
import zlib
from pathlib import Path

from pipeline.parse_mb_bank import (
    BronzeFile,
    BronzeRow,
    _fold,
    iso_date,
    parse_amount,
    parse_datetime,
)

DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")
FT_RE = re.compile(r"FT\d+")
AMOUNT_RE = re.compile(r"-?[\d,]+\.\d{2}")
OPEN_RE = re.compile(r"Opening Balance\s*:?\s*([\d,]+\.\d{2})", re.I)
CLOSE_RE = re.compile(r"Closing Balance\s*:?\s*([\d,]+\.\d{2})", re.I)
ACCOUNT_RE = re.compile(r"Account No\s*:?\s*(\d+)", re.I)
HEADER_LABELS = {
    "date",
    "transaction no",
    "debit",
    "credit",
    "details",
    "account",
    "remitter bank",
    "beneficiary/applicant",
    "beneficiary",
    "applicant",
    "ngay",
    "so but toan",
    "phat sinh no",
    "phat sinh co",
    "noi dung",
    "tai khoan",
    "ngan hang doi tac",
    "chuyen",
    "don vi thu huong/ don vi",
    "don vi thu huong",
}


def _objects(data: bytes) -> dict[int, bytes]:
    starts = list(re.finditer(rb"(\d+)\s+0\s+obj\b", data))
    found: dict[int, bytes] = {}
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(data)
        found[int(match.group(1))] = data[match.end() : end]
    return found


def _stream_bytes(body: bytes) -> bytes | None:
    match = re.search(rb"stream\r?\n", body)
    if not match:
        return None
    start = match.end()
    end = body.find(b"endstream", start)
    if end < 0:
        return None
    raw = body[start:end].rstrip(b"\r\n")
    if b"FlateDecode" in body[: match.start()] or raw[:1] == b"x":
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return raw
    return raw


def _cmap(body: bytes) -> dict[str, str]:
    decoded = _stream_bytes(body) or b""
    mapping: dict[str, str] = {}
    for src, dst in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", decoded):
        mapping[src.decode().upper().zfill(4)] = chr(int(dst, 16))
    return mapping


def _unescape(text: str) -> str:
    return (
        text.replace(r"\(", "(")
        .replace(r"\)", ")")
        .replace(r"\\", "\\")
        .replace(r"\n", " ")
        .replace(r"\r", " ")
    )


def _page_ids(objects: dict[int, bytes]) -> list[int]:
    pages: list[int] = []
    for number, body in objects.items():
        head = body[:400]
        if b"/Type" in head and b"/Page" in head and b"/Pages" not in head and b"/Contents" in head:
            pages.append(number)
    return pages


def _fonts(body: bytes, objects: dict[int, bytes]) -> dict[str, dict[str, str] | None]:
    resource_ref = re.search(rb"/Resources\s+(\d+)\s+0\s+R", body)
    resource = objects.get(int(resource_ref.group(1)), b"") if resource_ref else body
    block = re.search(rb"/Font\s*<<(.*?)>>", resource, re.S)
    if not block:
        return {}
    fonts: dict[str, dict[str, str] | None] = {}
    for name, ref in re.findall(rb"/(F\d+)\s+(\d+)\s+0\s+R", block.group(1)):
        font_body = objects.get(int(ref), b"")
        uni = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", font_body)
        fonts[name.decode()] = _cmap(objects[int(uni.group(1))]) if uni else None
    return fonts


def _decode_hex(raw: str, mapping: dict[str, str] | None) -> str:
    compact = re.sub(r"\s+", "", raw).upper()
    if not mapping:
        return ""
    chars = []
    for index in range(0, len(compact) - 3, 4):
        chars.append(mapping.get(compact[index : index + 4], ""))
    return "".join(chars)


def _runs_from_content(content: str, fonts: dict[str, dict[str, str] | None]) -> list[tuple[float, float, str]]:
    font = ""
    x = 0.0
    y = 0.0
    runs: list[tuple[float, float, str]] = []
    token = re.compile(
        r"/F(\d+)\s+[0-9.]+\s+Tf"
        r"|([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+Tm"
        r"|([0-9.\-]+)\s+([0-9.\-]+)\s+Td"
        r"|<([0-9A-Fa-f\s]+)>\s*Tj"
        r"|\(((?:\\.|[^\\)])*)\)\s*Tj"
    )
    for match in token.finditer(content):
        if match.group(1):
            font = f"F{match.group(1)}"
        elif match.group(2):
            x = float(match.group(6))
            y = float(match.group(7))
        elif match.group(8):
            x += float(match.group(8))
            y += float(match.group(9))
        else:
            if match.group(10) is not None:
                text = _decode_hex(match.group(10), fonts.get(font))
            else:
                text = _unescape(match.group(11) or "")
            if text.strip():
                runs.append((y, x, text))
    return runs


def _content_ids(body: bytes) -> list[int]:
    match = re.search(rb"/Contents\s*(\d+)\s+0\s+R", body)
    if match:
        return [int(match.group(1))]
    array = re.search(rb"/Contents\s*\[(.*?)\]", body, re.S)
    if not array:
        return []
    return [int(number) for number in re.findall(rb"(\d+)\s+0\s+R", array.group(1))]


def extract_runs(path: Path) -> list[tuple[int, float, float, str]]:
    objects = _objects(path.read_bytes())
    runs: list[tuple[int, float, float, str]] = []
    for page_index, page_id in enumerate(_page_ids(objects)):
        body = objects[page_id]
        fonts = _fonts(body, objects)
        for content_id in _content_ids(body):
            decoded = _stream_bytes(objects.get(content_id, b""))
            if not decoded or b"Tj" not in decoded:
                continue
            for y, x, text in _runs_from_content(decoded.decode("latin1", "replace"), fonts):
                runs.append((page_index, y, x, text))
    return runs


def _column(x: float) -> str:
    if x < 75:
        return "date"
    if x < 190:
        return "ref"
    if x < 285:
        return "debit"
    if x < 370:
        return "credit"
    if x < 545:
        return "details"
    if x < 665:
        return "party"
    if x < 745:
        return "account"
    return "bank"


def _lines(runs: list[tuple[int, float, float, str]]) -> list[tuple[int, float, list[tuple[float, str]]]]:
    ordered = sorted(runs, key=lambda item: (item[0], -item[1], item[2]))
    lines: list[tuple[int, float, list[tuple[float, str]]]] = []
    current_page: int | None = None
    current_y: float | None = None
    for page, y, x, text in ordered:
        if current_page != page or current_y is None or abs(current_y - y) > 2.2:
            lines.append((page, y, [(x, text)]))
            current_page = page
            current_y = y
        else:
            lines[-1][2].append((x, text))
    return lines


def _join(parts: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(part.strip() for part in parts if part.strip())).strip()


def _line_text(line: list[tuple[float, str]]) -> str:
    return _join(text for _, text in sorted(line, key=lambda item: item[0]))


def _is_header_piece(text: str) -> bool:
    folded = _fold(text).strip(" /:-")
    return folded in HEADER_LABELS or folded.startswith("chung tu nay") or "signature not verified" in folded


def _tx_keys(line: list[tuple[float, str]]) -> tuple[str, str] | None:
    date = ""
    ref_bits: list[str] = []
    for x, text in line:
        stripped = text.strip()
        if x < 120 and DATE_RE.fullmatch(stripped):
            date = stripped
        elif 70 <= x < 220 and not AMOUNT_RE.search(stripped):
            ref_bits.append(stripped)
    if not date:
        return None
    debit, credit = _amounts(line)
    joined_ref = _join(ref_bits)
    ft = FT_RE.search(joined_ref)
    if ft:
        return date, ft.group(0)
    if debit or credit:
        token = re.sub(r"\s+", "", joined_ref)
        return date, token or f"ROW-{date}-{int(debit or credit)}"
    return None


def _amounts(line: list[tuple[float, str]]) -> tuple[float, float]:
    debit = 0.0
    credit = 0.0
    for x, text in line:
        if not AMOUNT_RE.search(text):
            continue
        amount = parse_amount(AMOUNT_RE.search(text).group(0))  # type: ignore[union-attr]
        bucket = _column(x)
        if bucket == "debit":
            debit = amount
        elif bucket == "credit":
            credit = amount
    return debit, credit


def _account_number(text: str) -> str:
    found = re.findall(r"\d{6,}", text)
    return found[0] if found else ""


def _append(bucket: dict[str, list[str]], line: list[tuple[float, str]], fill_amounts: bool) -> None:
    for x, text in line:
        if _is_header_piece(text):
            continue
        column = _column(x)
        if column in {"details", "party", "account", "bank"}:
            bucket[column].append(text)
        elif fill_amounts and column in {"debit", "credit"} and AMOUNT_RE.search(text):
            bucket[column].append(AMOUNT_RE.search(text).group(0))  # type: ignore[union-attr]


def _has_body(line: list[tuple[float, str]]) -> bool:
    return any(_column(x) in {"details", "party"} and not _is_header_piece(text) for x, text in line)


def _belongs_to_previous(line: list[tuple[float, str]], y: float, prev_y: float | None, next_y: float | None) -> bool:
    """Keep a short tail, and bank-only wraps, on the row above.

    Detail and beneficiary text that sits just above the next date belongs to
    that next row. Those cells are top-aligned while the date sits lower.
    """
    if prev_y is None or not (prev_y > y):
        return False
    dist_prev = prev_y - y
    if dist_prev <= 6:
        return True
    if _has_body(line):
        return False
    if next_y is None:
        return dist_prev <= 24
    return dist_prev <= 24 and dist_prev <= (y - next_y) + 20


def _skip_line(line: list[tuple[float, str]]) -> bool:
    folded = _fold(_line_text(line))
    if not folded:
        return True
    if any(token in folded for token in ("closing balance", "so du cuoi", "opening balance", "so du dau")):
        return True
    if any(token in folded for token in ("chung tu nay", "signature not verified", "da ky boi", "lap bieu", "kiem soat")):
        return True
    pieces = [_fold(text).strip(" /:-") for _, text in line]
    return all(not piece or piece in HEADER_LABELS for piece in pieces)


def statement_from_runs(runs: list[tuple[int, float, float, str]], filename: str) -> BronzeFile:
    statement = BronzeFile(filename=filename)
    lines = _lines(runs)
    joined = [_line_text(line) for _, _, line in lines]
    blob = "\n".join(joined)
    account = ACCOUNT_RE.search(blob)
    if account:
        statement.account_no = account.group(1)
    opened = OPEN_RE.search(blob)
    closed = CLOSE_RE.search(blob)
    if opened:
        statement.opening_balance = parse_amount(opened.group(1))
    if closed:
        statement.closing_balance = parse_amount(closed.group(1))
    for line in joined:
        folded_line = _fold(line)
        if "from" not in folded_line and "tu ngay" not in folded_line:
            continue
        dates = DATE_RE.findall(line)
        if dates:
            statement.statement_from = iso_date(parse_datetime(dates[0]))
        if len(dates) > 1:
            statement.statement_to = iso_date(parse_datetime(dates[1]))
        break

    rows: list[BronzeRow] = []
    current: dict[str, list[str]] | None = None
    current_y: float | None = None
    anchor_pages: set[int] = set()
    pending: list[list[tuple[float, str]]] = []
    indexed = [(page, y, line, _tx_keys(line)) for page, y, line in lines if not _skip_line(line)]

    def flush() -> None:
        nonlocal current, current_y
        if not current:
            return
        posted = iso_date(parse_datetime(current["date"][0]))
        debit = parse_amount(current["debit"][-1]) if current["debit"] else 0.0
        credit = parse_amount(current["credit"][-1]) if current["credit"] else 0.0
        rows.append(
            BronzeRow(
                seq=len(rows) + 1,
                booked_at=f"{posted}T00:00:00" if posted else None,
                posted_on=posted,
                debit=debit,
                credit=credit,
                balance_after=None,
                counterparty=_join(current["party"]),
                description=_join(current["details"]),
                bank_ref=current["ref"][0],
                counterparty_account=_account_number(_join(current["account"])),
            )
        )
        current = None
        current_y = None

    def next_anchor_y(start: int) -> float | None:
        for later in indexed[start + 1 :]:
            if later[3]:
                return later[1]
        return None

    for index, (page, y, line, keys) in enumerate(indexed):
        if keys:
            flush()
            date, ref = keys
            debit, credit = _amounts(line)
            current = {
                "date": [date],
                "ref": [ref],
                "debit": [f"{debit:.2f}"] if debit else [],
                "credit": [f"{credit:.2f}"] if credit else [],
                "details": [],
                "party": [],
                "account": [],
                "bank": [],
            }
            current_y = y
            anchor_pages.add(page)
            for extra in pending:
                _append(current, extra, fill_amounts=False)
            pending = []
            _append(current, line, fill_amounts=False)
            continue
        if current is None:
            continue
        if page not in anchor_pages:
            _append(current, line, fill_amounts=not current["debit"] and not current["credit"])
            continue
        if _belongs_to_previous(line, y, current_y, next_anchor_y(index)):
            _append(current, line, fill_amounts=not current["debit"] and not current["credit"])
            continue
        pending.append(line)

    flush()
    statement.rows = rows
    statement.credit_total = sum(row.credit for row in rows)
    if statement.closing_balance is None and statement.opening_balance is not None:
        net = sum(row.credit - row.debit for row in rows)
        statement.closing_balance = statement.opening_balance + net
    return statement


def parse_pdf(path: Path) -> BronzeFile:
    statement = statement_from_runs(extract_runs(path), path.name)
    if not statement.rows:
        raise ValueError(f"No transactions in {path.name}")
    return statement
