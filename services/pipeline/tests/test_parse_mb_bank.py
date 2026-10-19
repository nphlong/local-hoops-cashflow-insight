from pathlib import Path

from openpyxl import Workbook

from pipeline.categorize import categorize, detect_channel
from pipeline.parse_mb_bank import parse_workbook


def _write_sample(path: Path) -> None:
    wb = Workbook()
    sheet = wb.active
    sheet["F1"] = "SAO KÊ CHI TIẾT TÀI KHOẢN"
    sheet["F2"] = "Từ ngày/From:22/08/2026 00:00:00 Đến ngày/To:22/08/2026 23:59:59"
    sheet["Q4"] = "Tài khoản/Account No: 7789797968\nLoại tiền/Currency: VND"
    sheet["A7"] = "STT"
    sheet["D7"] = "NGÀY GIAO DỊCH"
    sheet["G7"] = "NGÀY HẠCH TOÁN"
    sheet["H7"] = "PHÁT SINH NỢ"
    sheet["I7"] = "PHÁT SINH CÓ"
    sheet["J7"] = "SỐ DƯ"
    sheet["L7"] = "ĐƠN VỊ THỤ HƯỞNG/ĐƠN VỊ CHUYỂN"
    sheet["M7"] = "NỘI DUNG"
    sheet["R7"] = "BÚT TOÁN"
    # Newest first, as in MB Bank exports.
    sheet["A8"] = 1
    sheet["D8"] = "22/08/2026 21:00:00"
    sheet["G8"] = "22/08/2026"
    sheet["H8"] = 0
    sheet["I8"] = "1,578,000"
    sheet["J8"] = "10,000,000"
    sheet["L8"] = "NGUYEN PHUC HOANG LONG"
    sheet["M8"] = "thanh toan tien thue san"
    sheet["R8"] = "FTTESTCOURT"
    sheet["A9"] = 2
    sheet["D9"] = "22/08/2026 10:00:00"
    sheet["G9"] = "22/08/2026"
    sheet["H9"] = 0
    sheet["I9"] = "15,000"
    sheet["J9"] = "8,422,000"
    sheet["L9"] = "DAO HUU KIEN"
    sheet["M9"] = "QALK KIOTVIET26939 KOVQR07 snack"
    sheet["R9"] = "FTTESTKIOT"
    sheet["A10"] = 3
    sheet["D10"] = "22/08/2026 09:00:00"
    sheet["G10"] = "22/08/2026"
    sheet["H10"] = 0
    sheet["I10"] = "1,200,000"
    sheet["J10"] = "8,407,000"
    sheet["L10"] = "PHAM THI NGOC YEN"
    sheet["M10"] = "Nop tien ban nuoc"
    sheet["R10"] = "FTTESTWATER"
    sheet["I11"] = "2,793,000"
    sheet["A12"] = "Số dư cuối kỳ/ Closing Balance: 10,000,000 VND"
    wb.save(path)


def test_parse_and_categorize(tmp_path: Path) -> None:
    xlsx = tmp_path / "Bang ket qua giao dich - 7789797968_20260822.xlsx"
    _write_sample(xlsx)
    statement = parse_workbook(xlsx)
    assert statement.account_no == "7789797968"
    assert len(statement.rows) == 3
    assert statement.rows[0].bank_ref == "FTTESTWATER"
    assert statement.rows[-1].bank_ref == "FTTESTCOURT"
    water = statement.rows[0]
    kiot = statement.rows[1]
    court = statement.rows[2]
    assert detect_channel(kiot.counterparty, kiot.description) == "kiotviet"
    assert categorize(court.description, court.counterparty, court.credit, 0)[1] == "basketball_courts"
    assert categorize(water.description, water.counterparty, water.credit, 0)[1] == "fb_income"
    assert categorize(kiot.description, kiot.counterparty, kiot.credit, 0)[1] == "fb_income"


def test_operator_category_rules() -> None:
    rent = categorize("", "CONG TY TNHH THUONG MAI DICH VU PHAT TRIEN TAN AN NGUYEN", 0, 80_000_000)
    assert rent == ("outflow", "renting", False)
    stock = categorize("hang hoa", "NGUYEN VIET BINH MINH CO LTD", 0, 12_000_000)
    assert stock == ("outflow", "inventory", False)
    court_memo = categorize("KH thanh toan tien san 1", "NGUYEN VAN A", 200_000, 0)
    assert court_memo[1] == "basketball_courts"
    court_rate = categorize("chuyen tien", "NGUYEN VAN A", 49_000, 0)
    assert court_rate[1] == "basketball_courts"
    court_39 = categorize("qr", "walk in", 117_000, 0)
    assert court_39[1] == "basketball_courts"
    fb = categorize("QALK KIOTVIET26939 KOVQR07", "DAO HUU KIEN", 25_000, 0)
    assert fb == ("inflow", "fb_income", False)
    kiot_other = categorize("QALK KIOTVIET26939 KOVQR07", "DAO HUU KIEN", 35_000, 0)
    assert kiot_other == ("inflow", "fb_income", False)
    momo_fb = categorize("chuyen tien qua MoMo", "NGUYEN VAN A", 15_000, 0)
    assert momo_fb == ("inflow", "fb_income", False)
    zalo_fb = categorize("chuyen khoan nhanh qua Zalo", "TRAN VAN B", 10_000, 0)
    assert zalo_fb == ("inflow", "fb_income", False)
    bank_fb = categorize("chuyen tien", "NGUYEN VAN A", 25_000, 0)
    assert bank_fb == ("inflow", "fb_income", False)
    mixed = categorize("QALK KIOTVIET26939", "walk in", 74_000, 0)
    assert mixed == ("inflow", "fb_income", False)
    mixed_39 = categorize("chuyen tien", "walk in", 64_000, 0)
    assert mixed_39 == ("inflow", "fb_income", False)
    still_court = categorize("chuyen tien", "NGUYEN VAN A", 49_000, 0)
    assert still_court[1] == "basketball_courts"
    bank_court = categorize("chuyen tien", "NGUYEN VAN A", 500_000, 0)
    assert bank_court == ("inflow", "basketball_courts", False)
    momo_court = categorize("chuyen tien qua MoMo", "NGUYEN VAN A", 1_890_000, 0)
    assert momo_court == ("inflow", "basketball_courts", False)
    zalo_court = categorize("chuyen khoan nhanh qua Zalo", "TRAN VAN B", 3_000_000, 0)
    assert zalo_court == ("inflow", "basketball_courts", False)
    capital = categorize("gop von lan 1", "PHAM THI NGOC YEN", 150_000_000, 0)
    assert capital[1] == "other_income"
    large_bank = categorize("chuyen tien", "NGUYEN VAN A", 20_000_000, 0)
    assert large_bank[1] == "other_income"
    power = categorize("Local Hoops thanh toan tien  d i e n thang 7", "EVN", 0, 1_000_000)
    assert power == ("outflow", "electricity", False)
    power_wrap = categorize("thanh toan tie  n dien thang 07", "EVN", 0, 1_000_000)
    assert power_wrap == ("outflow", "electricity", False)
    staff = categorize("KPI thang 9", "THACH ANH", 0, 2_000_000, "2026-10-12")
    assert staff == ("outflow", "employees", False)
    allowance = categorize("Phu cap T9.2026", "TRUONG PHUOC MY LINH", 0, 2_000_000)
    assert allowance == ("outflow", "employees", False)
    bonus = categorize("thuong thang 9", "NV", 0, 1_500_000)
    assert bonus == ("outflow", "employees", False)
    payroll = categorize("thanh toan luong T9", "NV", 0, 5_000_000)
    assert payroll == ("outflow", "employees", False)
    not_staff = categorize("tam ung chi phi xay dung", "CTCP VAT TU", 0, 2_000_000, "2026-07-09")
    assert not_staff[1] != "employees"
    not_trading = categorize("mua hang thuong mai", "AI DO", 0, 2_000_000)
    assert not_trading[1] != "employees"
