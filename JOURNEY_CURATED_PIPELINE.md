# Curated pipeline journey — MB Bank to dashboard

**Date:** 2026-10-19  
**Project:** Local-Hoops-Cashflow-Insight  
**Goal:** Ingest local MB Bank Excel statements into an encrypted SQLite curated zone, serve tab JSON to the frontend, and publish a redacted snapshot for GitHub Pages.

---

## Scope

**In**
- `dev` from `master`, then `feature/mb-curated-static-api`
- Python ingest of MB Bank daily `.xlsx` into bronze / silver / gold SQLite tables
- Local FastAPI over gold tables (`/api/v1/meta|pnl|cashflow|ledger`)
- Redacted Pages snapshot (`id`, `sourceId`, date, amount, category, channel)
- Frontend loads curated JSON, VND, as-of from meta
- This journey document

**Out**
- Authentication / login
- Committing raw statements or the SQLite file
- Occupancy / RevPAH
- Recategorize persistence on the server

---

## Decisions and why

**Python pipeline, not Node.** Real workbooks are merged-cell MB Bank Excel. `openpyxl` reads them; the legacy CSV processor in `services/server.ts` does not.

**SQLite is the curated zone, not bronze/silver/gold folders.** One gitignored file (`data/curated/local_hoops.sqlite`) holds all three layers. `SQLITE_KEY` HMACs opaque row ids and Fernet-wraps `local_hoops.sqlite.enc`. Git never sees the DB; the key never goes in the frontend bundle.

**Frontend never opens SQLite.** It `fetch`es tab JSON. Locally, FastAPI returns full gold rows. GitHub Pages cannot see a local DB, so `export-pages` writes commit-safe JSON under `public/data/v1/`.

**Redacted ledger columns.** Pages JSON keeps `id` (HMAC of `bank_ref`), `sourceId` (SHA-256 of the statement filename — the raw name includes the account number), `date`, `amount`, `categoryType`, `categoryId`, `channel`. It drops counterparty, raw memo, and FT numbers. Join back locally with `SELECT * FROM gold_transactions WHERE id = ?`.

**Authentication later.** Anything in `public/` on Pages is public. Login belongs on an API in front of SQLite, not this branch.

**VND and statement as-of.** Mock `$185,000` / `2026-10-18` is only a fallback. Full June–October 2026 months: as-of `2026-10-19`, opening `0` ₫ (first June credit lands on a zero balance), closing about `300,225,574` ₫, ~2552 gold rows.

**Income categories.** Court rates `39k/49k/59k` (and `thanh toan … san`) → basketball courts. F&B amounts `10k/15k/25k`, court+F&B mix (1–2 slots + one add-on), remaining **KiotViet** tickets, and `ban nuoc` → F&B. Bank transfer, MoMo, and ZaloPay over ₫300k and under ₫20M → courts. `gop von` / ₫20M+ injections stay Other Income.

**Expense categories.** Rent payee TAN AN NGUYEN; inventory NGUYEN VIET BINH MINH; memos with `tien dien` (spaces inside either word) → electricity; `luong` / `phu cap` / `thuong` (not `thuong mai`) / `kpi` → employees.

**Git.** Long-lived `dev` tracks integration. Feature work lands on `feature/mb-curated-static-api` and PRs into `dev`.

---

## Files

**Created**
- [`services/pipeline/`](services/pipeline/) — ingest, categorize, periods, aggregators, export
- [`services/api/main.py`](services/api/main.py) — FastAPI gold reader
- [`services/contracts/tabApi.ts`](services/contracts/tabApi.ts)
- [`scripts/run_pipeline.py`](scripts/run_pipeline.py), [`scripts/run_api.py`](scripts/run_api.py)
- [`public/data/v1/*.json`](public/data/v1/) — redacted snapshot
- [`src/data/loadDashboard.ts`](src/data/loadDashboard.ts)
- [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
- [`JOURNEY_CURATED_PIPELINE.md`](JOURNEY_CURATED_PIPELINE.md) (this file)

**Modified**
- Store, pages, currency formatter, Vite proxy/`base`, `.gitignore`, `README.md`, `package.json`

**Left untouched**
- [`JOURNEY_FRONTEND_POC.md`](JOURNEY_FRONTEND_POC.md)
- Legacy Express CSV stack (unused)

---

## How to run

```bash
copy .env.example .env
py -3 -m venv services/pipeline/.venv
services/pipeline/.venv/Scripts/python -m pip install -r services/pipeline/requirements.txt
# drop MB Bank xlsx into data/raw/
npm run pipeline:ingest
npm run pipeline:export
npm run dev
```

Open http://localhost:3000/

Optional: `npm run dev:api` then `VITE_DATA_SOURCE=api npm run dev` for full ledger descriptions.

---

## Browser verification (2026-10-19)

Exercised at http://localhost:3000/ against the redacted snapshot (not screenshot-only):

- Load: toast “Loaded 168 curated rows”; P&L month income **₫19.5M**; courts mix **39.51%**; F&B mix **26.16%**
- Cash flow: period Aug 1 – Aug 25, 2026; income courts 7,720,500 / other 6,708,000 / F&B 5,111,000; **No expenses in this period**
- Balance Sheet: as-of **2026-08-25**, **168** rows, closing **252.482.523 ₫**, opening **232.943.023 ₫**; Details show channel labels (KiotViet POS, MoMo, Bank transfer) not customer names
- Week grain on P&L still ₫19.5M (all sample rows fall in the last 7 days)

Ingest stats: 3 files, 168 credits, 0 debits, `19539500` VND inflow. Local `GET /api/v1/meta` matches gold meta.

---

## 2026-10-19 — Full months, rules, and chrome

Copied monthly MB Bank files (June–October 2026) into gitignored `data/raw/`, re-ingested, and iterated operator rules until income/expense labels matched the books.

**Pipeline / categories** live in [`services/pipeline/pipeline/categorize.py`](services/pipeline/pipeline/categorize.py). Tests in [`services/pipeline/tests/test_parse_mb_bank.py`](services/pipeline/tests/test_parse_mb_bank.py).

**Dashboard chrome**
- Dark charcoal (`#1b1f24`) floating pill navbar matching the date picker (Local Hoops mark, statement tabs, date range, Google Log out). Mobile drawer mirrors the same controls. UI is gated by Sign in with Google; Pages JSON is still public.
- P&L overview cards: income and mix vs prior (green up / red down); profit cards by sign.
- Cash flow `% vs prior`: income green when over prior, expenses the inverse; 100% orange; totals bold.
- Balance Sheet register follows the time filter; Excel import and manual-entry POC cards removed.
- Syne + IBM Plex Sans; VND `vi-VN`.

**Git hygiene.** Raw `.xlsx`, SQLite, `.enc`, and `.env` stay gitignored. `public/data/v1/*.json` is the redacted Pages snapshot (no names, memos, or FT refs).

Year snapshot after the last recategorize pass: Courts **₫626.8M**, F&B **₫68.8M**, Other **₫638.6M** (mostly capital), Electricity **₫8.9M**, Employees **₫6.0M**.

---

## 2026-10-20 — Dark navbar, date picker, cash-flow trends

- Dark charcoal floating pill navbar (`#1b1f24`) with white active-tab pill; mobile Menu drawer overlays the page (absolute, Escape / outside click) instead of pushing layout.
- Cursor-style date range picker: presets `1d` / `7d` / `30d` / This week / Last week / This month / Last month / This year / Last year, dual-month calendar for custom ranges. Store keeps `filters.customRange`; prior period is the preceding window of the same length.
- Cash flow yearly summary chart overlays separate income and expense trend lines on the bars.

---

## 2026-10-20 — Google Sign-In gate

- Dashboard UI is gated behind Google Identity Services (Sign in with Google) plus `VITE_GOOGLE_ALLOWED_EMAILS`. Session lives in `sessionStorage` until the ID token expires (~1 hour).
- This hides statement pages only. `public/data/v1/*.json` on GitHub Pages is still world-readable.
- GCP: External OAuth consent in Testing, test users = allowlist, Web client JS origins `http://localhost:3000`, `http://127.0.0.1:3000`, `https://nphlong.github.io`. No Gmail API or client secret in the app.

---

## 2026-10-21 — Company switch for The Lam Sport Center

The header mark is a company menu. Local Hoops (account `7789797968`, `public/data/v1/`) and The Lam Sport Center (account `3395880880`, `public/data/v1/tlsc/`) share the same three tabs. The choice is stored in `localStorage`. FastAPI takes `?company=local-hoops|tlsc`. Sign-in still uses the Local Hoops mark.

The Lam source is MB Bank sổ phụ PDFs (`SP_*.pdf`), parsed in [`services/pipeline/pipeline/parse_mb_pdf.py`](services/pipeline/pipeline/parse_mb_pdf.py) from the text layer (per-font ToUnicode), not Excel. `CT_*` files in the same folder are ignored. Each company has its own SQLite file (`local_hoops.sqlite`, `tlsc.sqlite`). Statement opening and closing balances come from the PDF header because those files have no per-row balance. February 2025 through September 2026: 20 files, 906 gold rows, opening ₫0, closing ₫2,034,357, as-of 2026-09-30. Each month's opening plus movements matches that month's closing balance.

The Lam category profile is separate from the Local Hoops court-rate rules. Credits default to Court Income (same id `basketball_courts`, label **Court Income**). Account `10000567031` without a court-payment memo (`thue san`, `tra tien san`, `thanh toan san`, and close variants) is Other Income. A `tien nuoc` credit would be F&B; none appeared. Debits keep salary, electricity, tax, and water. A `tien nuoc` debit to `112002860659` is the water utility; other `tien nuoc` debits are Misc and need review. The account number is used only during ingest and is not written to the public JSON.

```bash
services/pipeline/.venv/Scripts/python scripts/run_pipeline.py ingest --company tlsc --raw C:\path\to\src_raw
services/pipeline/.venv/Scripts/python scripts/run_pipeline.py export-pages --company tlsc
```

Browser check at http://localhost:3000/: Local Hoops P&L still shows **₫104.4M** income and **Basketball Courts Income (Net)**. The Lam September 2026 shows **₫90.8M** income, **Court Income**, F&B mix **0%**, and the TLSC logo on all three tabs. Switching back restores Local Hoops.

---

## Known gaps / deferred

- File naming convention and ingest cadence for new monthly statements
- Recategorize / manual entry do not write back to SQLite
- Occupancy / RevPAH
- SQLCipher native driver (Fernet file wrap + gitignore instead)

---

## Next time

Persist recategorize to gold, and a file-naming convention for monthly drops. Do not overwrite this file; add a dated section or a new `JOURNEY_<PHASE>.md`.
