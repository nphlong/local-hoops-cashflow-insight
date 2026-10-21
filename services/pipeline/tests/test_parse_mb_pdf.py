from pipeline.categorize import categorize
from pipeline.parse_mb_pdf import statement_from_runs


def _sample_runs() -> list[tuple[int, float, float, str]]:
    return [
        (0, 500, 36, "Từ ngày/"),
        (0, 500, 90, "From"),
        (0, 500, 140, ":  01/02/2026 Đến ngày/"),
        (0, 500, 280, "To"),
        (0, 500, 320, ": 28/02/2026"),
        (0, 470, 30, "Account No :"),
        (0, 470, 150, "3395880880"),
        (0, 450, 36, "Opening Balance"),
        (0, 450, 170, ": 1,000,000.00"),
        (0, 430, 36, "Closing Balance"),
        (0, 430, 170, ": 2,310,000.00"),
        (0, 300, 31, "02/02/2026"),
        (0, 300, 82, "FT26033492739001"),
        (0, 300, 233, "130,000.00"),
        (0, 300, 374, "TLSC HOAN TIEN."),
        (0, 300, 559, "NGUYEN HOANG NAM"),
        (0, 300, 671, "1037731990"),
        (0, 296, 374, "extra detail"),
        (0, 296, 559, "wrapped party"),
        (0, 274, 374, "thue san"),
        (0, 270, 31, "05/02/2026"),
        (0, 270, 82, "FT26036574371254"),
        (0, 270, 322, "1,440,000.00"),
        (0, 270, 559, "YOSHIKAWA"),
        (0, 270, 671, "100098988"),
    ]


def test_wrapped_lines_and_balances() -> None:
    statement = statement_from_runs(_sample_runs(), "SP_sample.pdf")
    assert statement.account_no == "3395880880"
    assert statement.statement_from == "2026-02-01"
    assert statement.statement_to == "2026-02-28"
    assert statement.opening_balance == 1_000_000
    assert statement.closing_balance == 2_310_000
    assert len(statement.rows) == 2
    refund, court = statement.rows
    assert refund.bank_ref == "FT26033492739001"
    assert refund.debit == 130_000
    assert refund.credit == 0
    assert refund.description == "TLSC HOAN TIEN. extra detail"
    assert refund.counterparty == "NGUYEN HOANG NAM wrapped party"
    assert refund.counterparty_account == "1037731990"
    assert court.credit == 1_440_000
    assert court.debit == 0
    assert court.description == "thue san"
    assert categorize(court.description, court.counterparty, court.credit, 0, profile="tlsc")[1] == "basketball_courts"


def test_tlsc_credit_rules() -> None:
    court = categorize("thue san", "KHACH", 500_000, 0, profile="tlsc")
    assert court == ("inflow", "basketball_courts", False)
    drinks = categorize("tien nuoc", "KHACH", 20_000, 0, profile="tlsc")
    assert drinks == ("inflow", "fb_income", False)
    owner = categorize(
        "chuyen tien",
        "NGUYEN THE LAM",
        5_000_000,
        0,
        profile="tlsc",
        counterparty_account="10000567031",
    )
    assert owner == ("inflow", "other_income", False)
    owner_court = categorize(
        "tra tien san",
        "NGUYEN THE LAM",
        1_000_000,
        0,
        profile="tlsc",
        counterparty_account="10000567031",
    )
    assert owner_court == ("inflow", "basketball_courts", False)
    owner_drinks = categorize(
        "tien nuoc",
        "NGUYEN THE LAM",
        15_000,
        0,
        profile="tlsc",
        counterparty_account="10000567031",
    )
    assert owner_drinks == ("inflow", "fb_income", False)


def test_tlsc_debit_rules() -> None:
    salary = categorize("TLSC TT LUONG T126", "NHAN VIEN", 0, 5_370_000, profile="tlsc")
    assert salary == ("outflow", "employees", False)
    utility = categorize(
        "tien nuoc thang 2",
        "CAP NUOC",
        0,
        800_000,
        profile="tlsc",
        counterparty_account="112002860659",
    )
    assert utility == ("outflow", "water", False)
    other_nuoc = categorize(
        "tien nuoc",
        "AI DO",
        0,
        50_000,
        profile="tlsc",
        counterparty_account="9999999999",
    )
    assert other_nuoc == ("outflow", "expense_misc", True)
    plain = categorize("chuyen tien", "AI DO", 0, 100_000, profile="tlsc")
    assert plain == ("outflow", "expense_misc", True)
    power = categorize("thanh toan tien dien", "EVN", 0, 1_000_000, profile="tlsc")
    assert power == ("outflow", "electricity", False)
