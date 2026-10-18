import { useSyncExternalStore } from 'react'
import { createStore } from 'zustand/vanilla'
import {
  DEFAULT_INFLOW_CATEGORIES,
  DEFAULT_OUTFLOW_CATEGORIES,
  type TransactionType,
} from '../../types/cashflow.types'
import { MOCK_IMPORT_BATCH, MOCK_TRANSACTIONS, type LedgerTransaction } from '../data/mockCashflow'
import { type CompareGrain, inWindow, resolveWindow } from './periods'

export type TypeFilter = 'all' | TransactionType
export type ImportStatus = 'idle' | 'uploading' | 'success' | 'error'
export type AppPage = 'pnl' | 'cashflow' | 'ledger'

export interface CashflowFilters {
  grain: CompareGrain
  type: TypeFilter
  categoryId: string
  search: string
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

export interface PeriodCompare {
  current: SummaryView
  prior: SummaryView
  inflowDelta: number
  outflowDelta: number
  netDelta: number
  bookingDelta: number
  window: ReturnType<typeof resolveWindow>
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

export const categoryTrackRows = (
  current: Record<string, number>,
  prior: Record<string, number>,
  names: { id: string; name: string }[],
): CategoryTrackRow[] => {
  const ids = [...new Set([...Object.keys(current), ...Object.keys(prior), ...names.map((n) => n.id)])]
  return ids
    .map((id) => {
      const tracked = current[id] ?? 0
      const budget = prior[id] ?? 0
      const pct = budget === 0 ? (tracked === 0 ? 0 : 1) : tracked / budget
      return {
        id,
        name: names.find((n) => n.id === id)?.name ?? categoryName(id),
        tracked,
        budget,
        pct,
        remaining: Math.max(budget - tracked, 0),
        excess: Math.max(tracked - budget, 0),
      }
    })
    .filter((row) => row.tracked !== 0 || row.budget !== 0)
    .sort((a, b) => b.tracked - a.tracked)
}

export interface LedgerRow extends LedgerTransaction {
  signedAmount: number
  balance: number
}

export const runningLedger = (transactions: LedgerTransaction[], opening: number): LedgerRow[] => {
  const ordered = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  let balance = opening
  return ordered.map((tx) => {
    const signedAmount = tx.categoryType === 'inflow' ? tx.amount : -tx.amount
    balance += signedAmount
    return { ...tx, signedAmount, balance }
  })
}

interface CashflowState {
  transactions: LedgerTransaction[]
  page: AppPage
  filters: CashflowFilters
  importStatus: ImportStatus
  toast: string | null
  setPage: (page: AppPage) => void
  setFilters: (patch: Partial<CashflowFilters>) => void
  addTransaction: (input: Omit<LedgerTransaction, 'id' | 'source'>) => void
  updateCategory: (id: string, categoryId: string, categoryType: TransactionType) => void
  simulateImport: () => Promise<void>
  clearToast: () => void
}

export const categoryName = (id: string) => {
  const match = [...DEFAULT_INFLOW_CATEGORIES, ...DEFAULT_OUTFLOW_CATEGORIES].find((c) => c.id === id)
  return match?.name ?? id
}

export const categoriesFor = (type: TransactionType) =>
  type === 'inflow' ? DEFAULT_INFLOW_CATEGORIES : DEFAULT_OUTFLOW_CATEGORIES

export const filterTransactions = (
  transactions: LedgerTransaction[],
  filters: CashflowFilters,
): LedgerTransaction[] => {
  const q = filters.search.trim().toLowerCase()
  const window = resolveWindow(filters.grain)
  return transactions.filter((tx) => {
    if (!inWindow([tx], window.current).length) return false
    if (filters.type !== 'all' && tx.categoryType !== filters.type) return false
    if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false
    if (q) {
      const hay = `${tx.description} ${categoryName(tx.categoryId)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** Ledger list can show the selected period; charts use unfiltered-by-search period rows. */
export const periodTransactions = (transactions: LedgerTransaction[], grain: CompareGrain, which: 'current' | 'prior') => {
  const window = resolveWindow(grain)
  return inWindow(transactions, window[which])
}

export const summarize = (transactions: LedgerTransaction[]): SummaryView => {
  const inflows = transactions.filter((t) => t.categoryType === 'inflow')
  const outflows = transactions.filter((t) => t.categoryType === 'outflow')
  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0)
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0)
  const courtHire = inflows.filter((t) => t.categoryId === 'basketball_courts')
  const courtHireAmount = courtHire.reduce((sum, t) => sum + t.amount, 0)
  const fbAmount = inflows.filter((t) => t.categoryId === 'fb_income').reduce((sum, t) => sum + t.amount, 0)
  const bookingCount = courtHire.length
  return {
    totalInflow,
    totalOutflow,
    netCashflow: totalInflow - totalOutflow,
    bookingCount,
    revenuePerBooking: bookingCount > 0 ? courtHireAmount / bookingCount : 0,
    courtHireShare: totalInflow > 0 ? courtHireAmount / totalInflow : 0,
    fbShare: totalInflow > 0 ? fbAmount / totalInflow : 0,
    reviewCount: transactions.filter((t) => t.needsReview).length,
  }
}

export const comparePeriods = (transactions: LedgerTransaction[], grain: CompareGrain): PeriodCompare => {
  const window = resolveWindow(grain)
  const current = summarize(inWindow(transactions, window.current))
  const prior = summarize(inWindow(transactions, window.prior))
  const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 1) : (a - b) / b)
  return {
    current,
    prior,
    inflowDelta: delta(current.totalInflow, prior.totalInflow),
    outflowDelta: delta(current.totalOutflow, prior.totalOutflow),
    netDelta: delta(current.netCashflow, prior.netCashflow),
    bookingDelta: delta(current.bookingCount, prior.bookingCount),
    window,
  }
}

export const mixByCategory = (transactions: LedgerTransaction[], type: TransactionType) => {
  const mix: Record<string, number> = {}
  for (const tx of transactions.filter((t) => t.categoryType === type)) {
    mix[tx.categoryId] = (mix[tx.categoryId] ?? 0) + tx.amount
  }
  return mix
}

export const cashflowStore = createStore<CashflowState>((set, get) => ({
  transactions: MOCK_TRANSACTIONS,
  page: 'pnl',
  filters: {
    grain: 'month',
    type: 'all',
    categoryId: 'all',
    search: '',
  },
  importStatus: 'idle',
  toast: null,
  setPage: (page) => set({ page }),
  setFilters: (patch) =>
    set((state) => {
      const next = { ...state.filters, ...patch }
      if (patch.type && patch.type !== state.filters.type) {
        next.categoryId = 'all'
      }
      return { filters: next }
    }),
  addTransaction: (input) => {
    const id = `manual-${Date.now()}`
    set((state) => ({
      transactions: [{ ...input, id, source: 'manual' }, ...state.transactions],
      toast: 'Transaction saved to the working ledger.',
    }))
  },
  updateCategory: (id, categoryId, categoryType) => {
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, categoryId, categoryType, needsReview: false } : tx,
      ),
    }))
  },
  simulateImport: async () => {
    set({ importStatus: 'uploading', toast: null })
    await new Promise((resolve) => setTimeout(resolve, 700))
    const stamp = Date.now()
    const batch = MOCK_IMPORT_BATCH.map((row, i) => ({
      ...row,
      id: `${row.id}-${stamp}-${i}`,
    }))
    const existing = new Set(get().transactions.map((t) => t.id))
    const fresh = batch.filter((row) => !existing.has(row.id))
    set((state) => ({
      transactions: [...fresh, ...state.transactions],
      importStatus: 'success',
      toast: `Imported ${fresh.length} sample rows (POC — file is not parsed).`,
    }))
  },
  clearToast: () => set({ toast: null }),
}))

/** Bind vanilla Zustand to this app's React copy to avoid Vite prebundle duplicate-React hook errors. */
export function useCashflowStore(): CashflowState {
  return useSyncExternalStore(cashflowStore.subscribe, cashflowStore.getState, cashflowStore.getState)
}
