import React from 'react'
import { AS_OF_DATE, OPENING_BALANCE } from '../data/mockCashflow'
import {
  DEFAULT_INFLOW_CATEGORIES,
  DEFAULT_OUTFLOW_CATEGORIES,
} from '../../types/cashflow.types'
import {
  categoriesFor,
  categoryName,
  runningLedger,
  useCashflowStore,
} from '../store/cashflowStore'
import { formatCurrency, formatNumber } from '../utils/currencyFormatter'
import ImportSection from '../components/Forms/ImportSection'
import ManualEntryForm from '../components/Forms/ManualEntryForm'

const BalanceSheetPage: React.FC = () => {
  const { transactions, filters, setFilters, updateCategory } = useCashflowStore()
  const q = filters.search.trim().toLowerCase()
  const ledger = runningLedger(transactions, OPENING_BALANCE)
  const visible = [...ledger].reverse().filter((tx) => {
    if (filters.type !== 'all' && tx.categoryType !== filters.type) return false
    if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false
    if (q) {
      const hay = `${tx.description} ${categoryName(tx.categoryId)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const last = ledger[ledger.length - 1]
  const lastDate = last?.date ?? AS_OF_DATE
  const daysAgo = Math.max(
    0,
    Math.round(
      (new Date(`${AS_OF_DATE}T12:00:00`).getTime() - new Date(`${lastDate}T12:00:00`).getTime()) / 86400000,
    ),
  )
  const yearCount = transactions.filter((t) => t.date.startsWith(AS_OF_DATE.slice(0, 4))).length
  const closing = last?.balance ?? OPENING_BALANCE
  const categoryOptions =
    filters.type === 'outflow' ? DEFAULT_OUTFLOW_CATEGORIES : DEFAULT_INFLOW_CATEGORIES

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium text-[var(--navy)]">Balance Sheet — transaction register</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Date of today</p>
          <p className="mt-1 font-medium">{AS_OF_DATE}</p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Date of last record</p>
          <p className="mt-1 font-medium">
            {lastDate} {daysAgo ? `(${daysAgo} days ago)` : ''}
          </p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">No. of tracked records</p>
          <p className="mt-1 font-medium">
            {formatNumber(transactions.length)} <span className="text-xs text-[var(--muted)]">({yearCount} this year)</span>
          </p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Total tracking balance</p>
          <p className="tabular mt-1 font-medium">{formatCurrency(closing)}</p>
          <p className="text-xs text-[var(--muted)]">opening {formatCurrency(OPENING_BALANCE)} + net movements</p>
        </article>
      </div>

      <article className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <p className="text-sm text-[var(--muted)]">{visible.length} rows</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search details or category"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-52 px-3 py-2 text-sm"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}
              className="px-3 py-2 text-sm"
            >
              <option value="all">All types</option>
              <option value="inflow">Income</option>
              <option value="outflow">Expenses</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ categoryId: e.target.value })}
              className="px-3 py-2 text-sm"
            >
              <option value="all">All categories</option>
              {(filters.type === 'all'
                ? [...DEFAULT_INFLOW_CATEGORIES, ...DEFAULT_OUTFLOW_CATEGORIES]
                : categoryOptions
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--navy)] text-left text-xs uppercase tracking-wide text-white">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Details</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">Effective day</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((tx, i) => (
                <tr key={tx.id} className={i % 2 ? 'bg-[var(--chip)]' : 'bg-white'}>
                  <td className="whitespace-nowrap px-3 py-2">{tx.date}</td>
                  <td className="px-3 py-2">{tx.categoryType === 'inflow' ? 'Income' : 'Expenses'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={tx.categoryId}
                      aria-label={`Recategorize ${tx.description}`}
                      onChange={(e) => {
                        const nextId = e.target.value
                        const inflow = DEFAULT_INFLOW_CATEGORIES.some((c) => c.id === nextId)
                        updateCategory(tx.id, nextId, inflow ? 'inflow' : 'outflow')
                      }}
                      className="max-w-[220px] px-2 py-1 text-xs"
                    >
                      {categoriesFor(tx.categoryType).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {tx.needsReview && (
                      <span className="ml-2 text-[10px] uppercase text-[var(--expense)]">Review</span>
                    )}
                  </td>
                  <td className={`tabular px-3 py-2 text-right ${tx.signedAmount >= 0 ? 'amount-in' : 'amount-out'}`}>
                    {formatCurrency(tx.signedAmount)}
                  </td>
                  <td className="px-3 py-2">{tx.description}</td>
                  <td className="tabular px-3 py-2 text-right">{formatCurrency(tx.balance)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">No transactions match this search.</p>
          )}
        </div>
      </article>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ImportSection />
        <ManualEntryForm />
      </div>
    </div>
  )
}

export default BalanceSheetPage
