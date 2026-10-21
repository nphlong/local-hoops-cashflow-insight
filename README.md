# Local Hoops financial dashboard

Indoor basketball court rental dashboard: Profit and Loss, cash flow, and a transaction register. The header logo switches company. Curated data comes from a Python pipeline into one SQLite file per company. The frontend fetches that company's redacted tab JSON (VND). Status lives in [`JOURNEY_CURATED_PIPELINE.md`](JOURNEY_CURATED_PIPELINE.md); the mock-data POC is in [`JOURNEY_FRONTEND_POC.md`](JOURNEY_FRONTEND_POC.md).

## Getting started

Requires Node.js 20+ and Python 3.11+. If `npm install` hits a peer conflict, use `npm install --legacy-peer-deps`.

```bash
npm install --legacy-peer-deps
py -3 -m venv services/pipeline/.venv
services/pipeline/.venv/Scripts/python -m pip install -r services/pipeline/requirements.txt
copy .env.example .env
copy .env.example .env.local
```

Fill `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_ALLOWED_EMAILS` in `.env.local` after creating a Web OAuth client (see comments in `.env.example`). Google Cloud: External consent, Testing, test users = allowlist, JS origins `http://localhost:3000`, `http://127.0.0.1:3000`, `https://nphlong.github.io`. Do not add Gmail scopes or the client secret.

For GitHub Pages, add those two names as Actions secrets so `.github/workflows/pages.yml` can inject them at build.

Local Hoops uses MB Bank `.xlsx` in `data/raw/` (gitignored):

```bash
npm run pipeline:ingest
npm run pipeline:export
```

The Lam Sport Center uses MB Bank sổ phụ PDFs named `SP_*.pdf` (ignore `CT_*`). Pass the folder that holds them:

```bash
services/pipeline/.venv/Scripts/python scripts/run_pipeline.py ingest --company tlsc --raw C:\path\to\src_raw
services/pipeline/.venv/Scripts/python scripts/run_pipeline.py export-pages --company tlsc
```

Then:

```bash
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

1. Local Hoops: `data/raw/*.xlsx`. The Lam: `SP_*.pdf` sổ phụ statements. Neither is committed.
2. `python` ingest — bronze / silver / gold in `data/curated/local_hoops.sqlite` or `data/curated/tlsc.sqlite` (gitignored; Fernet-wrapped with `SQLITE_KEY` when set)
3. `export-pages` — redacted JSON in `public/data/v1/` (Local Hoops) or `public/data/v1/tlsc/` (`id`, `sourceId`, date, amount, category, channel)
4. The logo menu loads that prefix (or `/api/v1/*?company=local-hoops|tlsc` when `VITE_DATA_SOURCE=api`). The choice is remembered in `localStorage`.

Ledger JSON does **not** include counterparty, raw memo, or bank ref. Use `id` to join back to gold in SQLite.

## What you see

Floating charcoal pill navbar: company mark (opens Local Hoops / The Lam Sport Center), tabs **Profit and Loss** / **Cash flow** / **Balance Sheet**, date range picker, and Google account Log out. The mobile drawer lists the same companies. Sign-in stays Local Hoops. The UI is gated behind Sign in with Google plus an email allowlist; redacted JSON on Pages is still public.

Local Hoops gold meta is June–October 2026 MB Bank months, VND, as-of 2026-10-19. The Lam snapshot is February 2025–September 2026, account `3395880880`, as-of 2026-09-30. While The Lam is selected, the court category is labeled **Court Income**; Local Hoops keeps **Basketball Courts Income (Net)**.

Local Hoops income rules (credits): court rates 39/49/59k, F&B 10/15/25k and KiotViet leftovers, bank/MoMo/ZaloPay over ₫300k and under ₫20M as courts. Expense rules (debits): rent payee, inventory vendor, `tien dien` → electricity, memo `luong` / `phu cap` / `thuong` / `kpi` → employees.

The Lam credits default to Court Income, including `thue san`. A `tien nuoc` credit is F&B. A credit from account `10000567031` or `24976907` is Other Income unless the memo is a court payment (`thue san`, `tra tien san`, `thanh toan san`, or a close variant such as `tien san`). Accent-folded matching treats `thuê sân` and `trả tiền sân` the same way. Debits use the shared salary, electricity, tax, and water rules. A memo `TLSC TT HD … <code>` is classified by its last code: `DIEN` electricity, `MB` rent, `RAC` misc, `NUOC` water, and any other code misc. A `tien nuoc` debit to account `112002860659` is the water bill; any other `tien nuoc` debit is Misc and needs review.

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Chart.js, Zustand, Python (`openpyxl`, FastAPI), SQLite.

## Deferred

- Occupancy and RevPAH (need booking-hour logs)
- Recategorize persistence on the server
- Private hosting so `/data/v1` and `/data/v1/tlsc` JSON are not world-readable on Pages
