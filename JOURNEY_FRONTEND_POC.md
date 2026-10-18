# Frontend POC Journey — Indoor court cashflow

**Date:** 2026-10-18  
**Project:** Local-Hoops-Cashflow-Insight  
**Goal:** A working frontend POC: indoor basketball court rental cashflow insights on mock data, with week/month/year inflow vs outflow comparison.

---

## Scope

**In**
- Lean indoor-court operator UI (not a “night-court” scoreboard theme)
- In-memory store + court-rental mock ledger (2025–2026)
- KPIs, inflow vs outflow vs prior period, trend, mix, ledger, simulated import, manual entry
- Journey documentation

**Out**
- Express API, SQLite, Excel parsing, folder reorganization

---

## Decisions and why

**Business framing (indoor court hire)**  
Sources that shaped the KPI set:

- [EZFacility sports facility KPIs](https://www.ezfacility.com/blog/sports-facility-management-metrics/) — RevPAH, utilization, membership mix
- [Indoor sports venue economics (court hour)](https://threefoldcapitalau.com/newsroom/economics-of-an-indoor-sports-venue) — court hour as the unit of supply
- [PlayRez club analytics](https://playrez.com/features/analytics) — bookings, net revenue, week-over-week
- [Playbook facility valuation](https://www.callplaybook.com/reports/value-your-facility-right) — recurring revenue share

Bank statements do **not** contain booked hours, so occupancy / RevPAH are not invented. Proxies used:

- **Court hires** = count of inflows tagged `basketball_courts` (Basketball Courts Income (Net))
- **Hire / booking** = court-income dollars ÷ hire count (not total inflow ÷ all txns)
- **Courts income mix** and **F&B mix** of inflow

**Period compare**  
Header grain `Week | Month | Year` (as of `2026-10-18`):

| Grain | Current | Prior |
| --- | --- | --- |
| Week | last 7 days | previous 7 days |
| Month | month-to-date | same day span last month |
| Year | YTD | same YTD last year |

Charts: grouped **inflow / outflow / net** current vs prior, plus a time trend at the same grain.

**Visual**  
Warm indoor-gym floor (`#161310`), maple court-line motif, Oswald + IBM Plex Sans. Copy is facility ops (“Indoor court cashflow”), not scoreboard slang.

**Store**  
Vite 8 prebundled Zustand with a second React copy (`useRef` null). Bind `zustand/vanilla` through `useSyncExternalStore` from the app’s React. Alias/dedupe React in [`vite.config.ts`](vite.config.ts).

**Booking count** is an integer, never currency.

---

## Files

**Created**
- [`src/data/mockCashflow.ts`](src/data/mockCashflow.ts)
- [`src/store/cashflowStore.ts`](src/store/cashflowStore.ts)
- [`src/store/periods.ts`](src/store/periods.ts)
- [`src/components/Charts/PeriodCompareChart.tsx`](src/components/Charts/PeriodCompareChart.tsx)
- [`src/utils/delta.ts`](src/utils/delta.ts)
- [`JOURNEY_FRONTEND_POC.md`](JOURNEY_FRONTEND_POC.md) (this file)

**Modified**
- [`src/index.css`](src/index.css), [`src/App.tsx`](src/App.tsx), [`index.html`](index.html), [`vite.config.ts`](vite.config.ts)
- Header, SummaryCards, Trend/Inflow/Outflow charts, TransactionTable, ImportSection, ManualEntryForm

**Originally left untouched** (later revised in the 2026-10-18 chrome pass)
- [`services/api.ts`](services/api.ts), [`services/server.ts`](services/server.ts) still unused
- [`services/backend.ts`](services/backend.ts) and [`types/cashflow.types.ts`](types/cashflow.types.ts) now use the operator category set

---

## How to run

```bash
npm run dev
```

Open http://localhost:3000/

---

## Browser verification (2026-10-18)

Exercised at http://localhost:3000/ (not screenshot-only):

- Load: title **Indoor court cashflow**; month KPIs and charts render; no invalid-hook crash
- **Week**: window Oct 12–18 vs Oct 5–11; table shrinks to that week; trend label “Weekly inflow vs outflow”
- **Year**: Jan 1–Oct 18 2026 vs same span 2025
- **Month**: restated; search `zzz-no-match` → empty copy; clear search restores rows
- Recategorize `TRANSFER / MEMO BLANK` → Utilities & Rent
- Manual inflow `$2100` Court hire — walk-in evening → inflow and hire count rose
- **Load sample rows** → 3 extra rows, KPIs updated, import success copy

---

## 2026-10-18 — Tabbed statements (QuickBooks-style)

Adjusted the shell to match the user’s reference screens:

1. **Title + nav** like QuickBooks P&L: `Local Hoops financial dashboard` with tabs **Profit and Loss**, **Cash flow**, **Balance Sheet**, plus Week/Month/Year filter.
2. **Cash flow** like the budget dashboard: period chips, income/expense tracked-vs-prior tables, donuts, monthly income vs expense bars. Prior period stands in for budget until a real budget table exists.
3. **Balance Sheet** like the tracking register (not a classic assets/liabilities sheet): Date, Type, Category, Amount, Details, running Balance, Effective day, plus opening cash `$185,000`.

Light paper UI (Newsreader + IBM Plex, navy/blue/gold) so the layout reads as a financial statement, not a night gym.

---

## 2026-10-18 — P&L layout pass

Profit and Loss cards were stretching full width below the `xl` breakpoint and stacking with extra delta lines, so they looked oversized and stacked into each other. Tightened this tab only to match the QuickBooks reference: compact 2×3 KPI tiles (label + value, no delta), 12-month income/expense combo chart on the right from 960px up, two equal charts below. Shared `.card` radius reduced to 12px.

Second pass: KPI tiles stretch in three equal rows beside the combo chart; dual-axis margin line on `%`; pie uses a fixed-height body with legend on the right so it stays circular; combo/line charts keep inside padding so the last months are not clipped.

---

## 2026-10-18 — Shared chrome and operator categories

Aligned Cash flow and Balance Sheet to P&L card/KPI/chart chrome without changing what those tabs are for. Then refined mix, color, and the register.

**Shared chrome**  
`.page-title`, `.kpi-card` / `.kpi-row`, `.chart-card`, `.table-head`. Navy filled table headers dropped for paper headers. Import and manual entry sit in the same two-column card grid.

**Categories** (operator set, in [`types/cashflow.types.ts`](types/cashflow.types.ts) and the mock ledger):

- Income: Other Income, Basketball Courts Income (Net), F&B Income (Net), Misc
- Expense: Misc, Renting, Tax, Inventory, Electricity, Employees, Water

**Cash flow**  
Income and expense table/donut pairs share a row height. Donuts are a fixed 220px plot so the rings line up. Green for income, orange for expenses; larger amounts use a darker shade. Tables and legends show top 4 + Others + Total. Yearly bars use the same green/orange.

**Balance Sheet**  
Register pages 100 filtered rows at a time (`1–100 of N`). Filter changes reset to page 1.

**P&L**  
Expense-by-account donut overlapped Cash flow mix, so it was replaced with a single-series area chart of month-end **cash on hand** (opening `$185,000` + net movements). Light green fill; one legend, centered under the plot. Combo and gross-profit charts stay blue / gold / red.

Vite 8 needs Node 20+ (`npm install --legacy-peer-deps` on this machine).

---

## Known gaps / deferred

- Occupancy % and RevPAH need booking-hour logs, not bank files
- Import does not parse Excel; sample rows only
- No persistence; refresh resets the store
- Backend, SQLite, pipelines, src/server/data layout — later phases

---

## Next time

When Excel samples land, replace `simulateImport` with a pipeline behind the same store actions, and write `JOURNEY_<PHASE>.md` instead of overwriting this file.
