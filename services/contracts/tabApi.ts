export type CompareGrain = 'week' | 'month' | 'year'
export type TransactionType = 'inflow' | 'outflow'
export type Channel = 'kiotviet' | 'momo' | 'zalopay' | 'bank_transfer' | 'unknown'

export interface DashboardMeta {
  asOf: string
  currency: 'VND'
  openingBalance: number
  closingBalance: number
  accountNo: string | null
  transactionCount: number
}

export interface RedactedLedgerRow {
  id: string
  sourceId: string
  date: string
  amount: number
  categoryType: TransactionType
  categoryId: string
  channel: Channel
  needsReview: boolean
}

export interface FullLedgerRow extends RedactedLedgerRow {
  description: string
  counterparty: string
  bankRef: string
  balanceAfter: number
}

export interface SummaryView {
  totalInflow: number
  totalOutflow: number
  netCashflow: number
  bookingCount: number
  revenuePerBooking: number
  courtHireShare: number
  fbShare: number
  reviewCount: number
}

export interface PeriodWindow {
  grain: CompareGrain
  current: { start: string; end: string }
  prior: { start: string; end: string }
  currentLabel: string
  priorLabel: string
}

export interface BucketPoint {
  key: string
  label: string
  inflow: number
  outflow: number
  cashOnHand?: number
}

export interface CategoryTrackRow {
  id: string
  name: string
  tracked: number
  budget: number
  pct: number
  remaining: number
  excess: number
}

export interface GrainPnl {
  kpis: SummaryView
  window: PeriodWindow
  lastTwelveMonths: BucketPoint[]
  cashOnHand: BucketPoint[]
}

export interface PnlPayload {
  meta: DashboardMeta
  grains: Record<CompareGrain, GrainPnl>
}

export interface GrainCashflow {
  window: PeriodWindow
  current: SummaryView
  prior: SummaryView
  incomeRows: CategoryTrackRow[]
  expenseRows: CategoryTrackRow[]
  ytdMonthly: BucketPoint[]
}

export interface CashflowPayload {
  meta: DashboardMeta
  grains: Record<CompareGrain, GrainCashflow>
}

export interface LedgerPayload {
  meta: DashboardMeta
  transactions: RedactedLedgerRow[] | FullLedgerRow[]
}
