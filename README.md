# Local Hoops financial dashboard

Frontend proof of concept for an indoor basketball court rental business. It shows Profit and Loss, cash flow, and a transaction register from an in-memory mock ledger (2025–2026), with week, month, and year comparison against the prior period.

As-of date for the POC is **2026-10-18**. Refresh resets the ledger. Status and decisions live in [`JOURNEY_FRONTEND_POC.md`](JOURNEY_FRONTEND_POC.md).

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:3000/

```bash
npm run build    # tsc && vite build
npm run preview  # serve the production build
```

## What you see

The header is **Local Hoops financial dashboard**, with statement tabs and a **Week | Month | Year** filter.

| Grain | Current window | Prior window |
| --- | --- | --- |
| Week | last 7 days | previous 7 days |
| Month | month-to-date | same day span last month |
| Year | year-to-date | same year-to-date last year |

**Profit and Loss** — six compact KPI tiles for the selected period (income, gross / operating / net profit, court-hire mix, membership mix) beside a 12-month income, expense, and operating-margin chart. Below that: gross profit and margin, and an expense mix pie.

**Cash flow** — period summary, income and expense tables tracked against the prior period (prior stands in for a budget), category donuts, and year-to-date monthly income vs expense bars.

**Balance Sheet** — a tracking register, not a classic assets-and-liabilities sheet. Columns include date, type, category, amount, details, running balance, and effective day. Opening cash is `$185,000`. Search, recategorize, add a manual transaction, or load sample rows (the file is not parsed).

Court-hire count is the number of inflows tagged Basketball Courts Income (Net). Hire value is those dollars divided by that count. Occupancy and revenue per available hour are not shown: bank rows do not include booked hours.

## Project structure

```
src/
├── pages/                  # ProfitAndLossPage, CashflowPage, BalanceSheetPage
├── components/
│   ├── Charts/             # Period, trend, inflow, and outflow charts
│   ├── Dashboard/          # Summary cards, transaction table
│   ├── Forms/              # Simulated import, manual entry
│   └── Layouts/            # Header (title, tabs, period filter)
├── store/
│   ├── cashflowStore.ts    # In-memory Zustand store (vanilla + useSyncExternalStore)
│   └── periods.ts          # Week / month / year windows
├── data/mockCashflow.ts    # Mock ledger, as-of date, opening balance
├── utils/                  # Currency and period-delta helpers
├── App.tsx
└── main.tsx
types/cashflow.types.ts     # Category definitions
services/                   # Earlier Express API — not used by this POC
```

## Categories

**Income:** Other Income, Basketball Courts Income (Net), F&B Income (Net), Misc.

**Expense:** Misc, Renting, Tax, Inventory, Electricity, Employees, Water.

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Chart.js, Zustand. The store binds `zustand/vanilla` through the app’s React `useSyncExternalStore`, and Vite dedupes React, so the prebundled Zustand copy does not crash hooks.

## Deferred

- Occupancy and revenue per available hour (need booking-hour logs)
- Real Excel or CSV import (sample rows only)
- Persistence across refresh
- Backend, SQLite, and the unused `services/` API
