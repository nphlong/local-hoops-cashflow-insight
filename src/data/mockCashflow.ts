import type { TransactionType } from '../../types/cashflow.types'

export interface LedgerTransaction {
  id: string
  date: string
  amount: number
  description: string
  categoryType: TransactionType
  categoryId: string
  needsReview?: boolean
  source: 'import' | 'manual'
}

/** Dashboard “today” so week/month/year compares stay stable in the POC. */
export const AS_OF_DATE = '2026-10-18'

/** Opening cash so the Balance Sheet ledger can show a running bank balance. */
export const OPENING_BALANCE = 185000

type Draft = Omit<LedgerTransaction, 'id' | 'source'>

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

const drafts: Draft[] = []

const add = (
  date: string,
  amount: number,
  description: string,
  categoryType: TransactionType,
  categoryId: string,
  needsReview?: boolean,
) => {
  if (date > AS_OF_DATE) return
  drafts.push({ date, amount, description, categoryType, categoryId, needsReview })
}

const yearScale = (year: number) => (year === 2025 ? 0.84 : 1)

for (const year of [2025, 2026]) {
  const s = yearScale(year)
  for (const month of [5, 6, 7, 8, 9, 10]) {
    if (year === 2026 && month > 10) continue
    add(iso(year, month, 3), Math.round(1880 * s), `Facility lease & utilities — ${pad(month)}/${year}`, 'outflow', 'utilities_rent')
    add(iso(year, month, 4), Math.round(780 * s), `Floor staff / court monitor — ${pad(month)}`, 'outflow', 'security_staffing')
    add(iso(year, month, 6), Math.round(340 * s), `Court clean after peak sessions — ${pad(month)}`, 'outflow', 'cleaning_services')
    add(iso(year, month, 8), Math.round(1600 * s), `Memberships — indoor club ${pad(month)}/${year}`, 'inflow', 'membership_fees')
    add(iso(year, month, 5), Math.round(2400 * s), `Court hire — weekday league ${pad(month)}/${year}`, 'inflow', 'court_rental')
    add(iso(year, month, 12), Math.round(2100 * s), `Court hire — weekend blocks ${pad(month)}/${year}`, 'inflow', 'court_rental')
    add(iso(year, month, 19), Math.round(1950 * s), `Court hire — walk-in peak ${pad(month)}/${year}`, 'inflow', 'court_rental')
    add(iso(year, month, 11), Math.round(1250 * s), `Skills academy block — ${pad(month)}/${year}`, 'inflow', 'training_programs')
    add(iso(year, month, 15), Math.round(92 * s), `Card processing fees — ${pad(month)}/${year}`, 'outflow', 'payment_fees')
  }
  add(iso(year, 5, 24), Math.round(2900 * s), `Spring indoor showcase`, 'inflow', 'event_hosting')
  add(iso(year, 6, 16), Math.round(420 * s), `Ball cart & pump restock`, 'outflow', 'equipment_repairs')
  add(iso(year, 6, 20), Math.round(390 * s), `Neighborhood indoor-court ads`, 'outflow', 'marketing_promotion')
  add(iso(year, 7, 9), Math.round(3400 * s), `Summer indoor tournament`, 'inflow', 'event_hosting')
  add(iso(year, 7, 3), Math.round(1180 * s), `Lighting / floor patch`, 'outflow', 'facility_maintenance')
  add(iso(year, 7, 22), Math.round(1200 * s), `Baseline board sponsor`, 'inflow', 'sponsorships')
  add(iso(year, 8, 10), Math.round(540 * s), `Rim and net replacement`, 'outflow', 'equipment_repairs')
  add(iso(year, 8, 24), Math.round(980 * s), `Liability premium installment`, 'outflow', 'insurance_premiums')
  add(iso(year, 8, 21), Math.round(680 * s), `Gear hire — tournament weekend`, 'inflow', 'equipment_rental')
  add(iso(year, 9, 7), Math.round(4100 * s), `Holiday indoor classic`, 'inflow', 'event_hosting')
  add(iso(year, 9, 18), Math.round(610 * s), `Booking software seat`, 'outflow', 'platform_subscriptions')
  add(iso(year, 9, 21), Math.round(310 * s), `Sideline merch`, 'inflow', 'merchandise_sales')
  add(iso(year, 10, 9), Math.round(1250 * s), `Fall skills clinic`, 'inflow', 'training_programs')
  add(iso(year, 10, 16), Math.round(1500 * s), `Lounge cooler sponsor`, 'inflow', 'sponsorships')
}

// Dense recent indoor hires so week-over-week has a real signal (as-of 18 Oct 2026).
const recentHires: Array<[string, number, string]> = [
  ['2026-09-05', 860, 'Court hire — Sep weekday block'],
  ['2026-09-07', 1200, 'Court hire — Sep weekend block'],
  ['2026-09-10', 780, 'Court hire — Sep school hire'],
  ['2026-09-12', 940, 'Court hire — Sep after-work'],
  ['2026-09-14', 1100, 'Court hire — Sep league'],
  ['2026-09-16', 1500, 'Court hire — Sep Friday run'],
  ['2026-09-18', 1380, 'Court hire — Sep Sunday open'],
  ['2026-10-05', 900, 'Court hire — Mon after-work 18:00'],
  ['2026-10-06', 750, 'Court hire — Tue school block'],
  ['2026-10-07', 1100, 'Court hire — Wed league'],
  ['2026-10-08', 800, 'Court hire — Thu walk-in'],
  ['2026-10-09', 1400, 'Court hire — Fri night run'],
  ['2026-10-10', 1600, 'Court hire — Sat morning'],
  ['2026-10-11', 1500, 'Court hire — Sun open play'],
  ['2026-10-12', 980, 'Court hire — Mon after-work 18:00'],
  ['2026-10-13', 820, 'Court hire — Tue school block'],
  ['2026-10-14', 1250, 'Court hire — Wed league'],
  ['2026-10-15', 860, 'Court hire — Thu walk-in'],
  ['2026-10-16', 1550, 'Court hire — Fri night run'],
  ['2026-10-17', 1720, 'Court hire — Sat morning'],
  ['2026-10-18', 1480, 'Court hire — Sun open play'],
  ['2025-10-05', 780, 'Court hire — prior-year weekday'],
  ['2025-10-12', 810, 'Court hire — prior-year weekday'],
  ['2025-10-18', 1200, 'Court hire — prior-year weekend'],
]

for (const [date, amount, description] of recentHires) {
  add(date, amount, description, 'inflow', 'court_rental')
}

add('2026-06-11', 240, 'TRANSFER / POS 4412', 'outflow', 'miscellaneous', true)
add('2026-07-29', 175, 'ACH UNKNOWN VENDOR', 'outflow', 'miscellaneous', true)
add('2026-09-29', 220, 'POS SETTLEMENT ADJ', 'inflow', 'court_rental', true)
add('2026-10-18', 190, 'TRANSFER / MEMO BLANK', 'outflow', 'miscellaneous', true)
add('2026-10-11', 64, 'VISA DES:FEE ID:8821', 'outflow', 'payment_fees', true)

export const MOCK_TRANSACTIONS: LedgerTransaction[] = drafts.map((row, index) => ({
  ...row,
  id: `tx-${String(index + 1).padStart(3, '0')}`,
  source: 'import',
}))

export const MOCK_IMPORT_BATCH: LedgerTransaction[] = [
  {
    id: 'import-live-1',
    date: '2026-10-18',
    amount: 2100,
    description: 'Court hire — parsed from statement',
    categoryType: 'inflow',
    categoryId: 'court_rental',
    source: 'import',
  },
  {
    id: 'import-live-2',
    date: '2026-10-18',
    amount: 64,
    description: 'VISA DES:FEE ID:8821',
    categoryType: 'outflow',
    categoryId: 'payment_fees',
    needsReview: true,
    source: 'import',
  },
  {
    id: 'import-live-3',
    date: '2026-10-17',
    amount: 450,
    description: 'Membership — walk-in conversion',
    categoryType: 'inflow',
    categoryId: 'membership_fees',
    source: 'import',
  },
]
