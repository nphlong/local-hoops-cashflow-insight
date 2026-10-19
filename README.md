# Local Hoops financial dashboard

Indoor basketball court rental dashboard: Profit and Loss, cash flow, and a transaction register. Curated data comes from a Python pipeline that reads local MB Bank Excel statements into SQLite. The frontend fetches redacted tab JSON (VND). Status lives in [`JOURNEY_CURATED_PIPELINE.md`](JOURNEY_CURATED_PIPELINE.md); the mock-data POC is in [`JOURNEY_FRONTEND_POC.md`](JOURNEY_FRONTEND_POC.md).

## Getting started

Requires Node.js 20+ and Python 3.11+. If `npm install` hits a peer conflict, use `npm install --legacy-peer-deps`.

```bash
npm install --legacy-peer-deps
py -3 -m venv services/pipeline/.venv
services/pipeline/.venv/Scripts/python -m pip install -r services/pipeline/requirements.txt
copy .env.example .env
```

Drop MB Bank `.xlsx` files into `data/raw/` (gitignored), then:

```bash
npm run pipeline:ingest
npm run pipeline:export
npm run dev
```

Open http://localhost:3000/

Optional local API (full gold rows, including names — not for GitHub Pages):

```bash
npm run dev:api
```

```bash
npm run build    # tsc && vite build
npm run preview
```

## Data flow

1. `data/raw/*.xlsx` — local MB Bank daily statements (never committed)
2. `python` ingest — bronze / silver / gold tables in `data/curated/local_hoops.sqlite` (gitignored; Fernet-wrapped with `SQLITE_KEY` when set)
3. `export-pages` — redacted JSON in `public/data/v1/` (`id`, `sourceId`, date, amount, category, channel)
4. Frontend loads `/data/v1/*.json` (or `/api/v1/*` when `VITE_DATA_SOURCE=api`)

Ledger JSON does **not** include counterparty, raw memo, or bank ref. Use `id` to join back to gold in SQLite.

## What you see

Floating black pill navbar: Local Hoops basketball mark, tabs **Profit and Loss** / **Cash flow** / **Balance Sheet**, **Week | Month | Year**, and a Log in / Log out placeholder. As-of date and opening cash come from gold meta (June–October 2026 MB Bank months, VND, as-of 2026-10-19).

Income rules (credits): court rates 39/49/59k, F&B 10/15/25k and KiotViet leftovers, bank/MoMo/ZaloPay over ₫300k and under ₫20M as courts. Expense rules (debits): rent payee, inventory vendor, `tien dien` → electricity, memo `luong` / `phu cap` / `thuong` / `kpi` → employees.

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Chart.js, Zustand, Python (`openpyxl`, FastAPI), SQLite.

## Deferred

- Login / authorization
- Occupancy and RevPAH (need booking-hour logs)
- Recategorize persistence on the server
