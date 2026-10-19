import type { LedgerTransaction } from './mockCashflow'

export type Channel = 'kiotviet' | 'momo' | 'zalopay' | 'bank_transfer' | 'unknown'

export interface DashboardMeta {
  asOf: string
  currency: 'VND' | string
  openingBalance: number
  closingBalance: number
  accountNo: string | null
  transactionCount: number
}

export interface LedgerFileRow {
  id: string
  sourceId: string
  date: string
  amount: number
  categoryType: 'inflow' | 'outflow'
  categoryId: string
  channel: Channel
  needsReview?: boolean
  description?: string
}

export interface LedgerFile {
  meta: DashboardMeta
  transactions: LedgerFileRow[]
}

export interface LoadedDashboard {
  meta: DashboardMeta
  transactions: LedgerTransaction[]
  source: 'api' | 'static'
}

const CHANNEL_LABELS: Record<string, string> = {
  kiotviet: 'KiotViet POS',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  bank_transfer: 'Bank transfer',
  unknown: 'Other',
}

const toTx = (row: LedgerFileRow): LedgerTransaction => ({
  id: row.id,
  date: row.date,
  amount: row.amount,
  description: row.description || CHANNEL_LABELS[row.channel] || row.channel,
  categoryType: row.categoryType,
  categoryId: row.categoryId,
  needsReview: row.needsReview,
  source: 'import',
  channel: row.channel,
  sourceId: row.sourceId,
})

const dataSource = (): 'api' | 'static' => {
  const explicit = (import.meta.env.VITE_DATA_SOURCE as string | undefined)?.toLowerCase()
  if (explicit === 'api' || explicit === 'static') return explicit
  return import.meta.env.DEV ? 'static' : 'static'
}

const staticPrefix = () => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}data/v1`
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadDashboard(): Promise<LoadedDashboard> {
  const source = dataSource()
  if (source === 'api') {
    const [meta, ledger] = await Promise.all([
      readJson<DashboardMeta>('/api/v1/meta'),
      readJson<LedgerFile>('/api/v1/ledger'),
    ])
    return {
      meta: ledger.meta ?? meta,
      transactions: ledger.transactions.map(toTx),
      source: 'api',
    }
  }
  const prefix = staticPrefix()
  const [meta, ledger] = await Promise.all([
    readJson<DashboardMeta>(`${prefix}/meta.json`),
    readJson<LedgerFile>(`${prefix}/ledger.json`),
  ])
  return {
    meta: ledger.meta ?? meta,
    transactions: ledger.transactions.map(toTx),
    source: 'static',
  }
}
