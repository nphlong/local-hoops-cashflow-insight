import React, { useEffect, useState } from 'react'
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
import { inRange, resolveActiveWindow } from '../store/periods'
import { formatCurrency, formatNumber } from '../utils/currencyFormatter'

const PAGE_SIZE = 100

const BalanceSheetPage: React.FC = () => {
  const { transactions, filters, setFilters, updateCategory, asOf, openingBalance } = useCashflowStore()
  const [page, setPage] = useState(1)
  const q = filters.search.trim().toLowerCase()
  const ledger = runningLedger(transactions, openingBalance)
  const window = resolveActiveWindow(filters, asOf)
  const inPeriod = ledger.filter((tx) => inRange(tx.date, window.current))
  const visible = [...inPeriod].reverse().filter((tx) => {
    if (filters.type !== 'all' && tx.categoryType !== filters.type) return false
    if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false
    if (q) {
      const hay = `${tx.description} ${categoryName(tx.categoryId)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.type, filters.categoryId, filters.grain, filters.customRange])
  const last = ledger[ledger.length - 1]
  const periodLast = inPeriod[inPeriod.length - 1]
  const lastDate = periodLast?.date ?? last?.date ?? asOf
  const daysAgo = Math.max(
    0,
    Math.round(
      (new Date(`${asOf}T12:00:00`).getTime() - new Date(`${lastDate}T12:00:00`).getTime()) / 86400000,
    ),
  )
  const closing = last?.balance ?? openingBalance
  const categoryOptions =
    filters.type === 'outflow' ? DEFAULT_OUTFLOW_CATEGORIES : DEFAULT_INFLOW_CATEGORIES

  return (
    <div className="statement">
      <h2 className="page-title">Balance Sheet — transaction register</h2>
      <div className="kpi-row">
        <article className="kpi-card">
          <p className="kpi-label">Date of today</p>
          <p className="kpi-value">{asOf}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Date of last record</p>
          <p className="kpi-value">{lastDate}</p>
          {daysAgo ? <p className="kpi-hint">{daysAgo} days ago</p> : null}
        </article>
        <article className="kpi-card">
          <p className="kpi-label">No. of tracked records</p>
          <p className="kpi-value tabular">{formatNumber(inPeriod.length)}</p>
          <p className="kpi-hint">{window.currentLabel.replace(/^This \w+ \(/, '').replace(/\)$/, '')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Total tracking balance</p>
          <p className="kpi-value tabular">{formatCurrency(closing)}</p>
          <p className="kpi-hint">opening {formatCurrency(openingBalance)} + net movements</p>
        </article>
      </div>

      <article className="chart-card chart-card-pad">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {visible.length === 0
              ? '0 rows'
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visible.length)} of ${visible.length}`}
          </p>
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
          <table className="data-table">
            <thead>
              <tr className="table-head">
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th className="num">Amount</th>
                <th>Details</th>
                <th className="num">Balance</th>
                <th>Effective day</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((tx, i) => (
                <tr key={tx.id} className={i % 2 ? 'bg-[var(--chip)]' : 'bg-white'}>
                  <td className="whitespace-nowrap">{tx.date}</td>
                  <td>{tx.categoryType === 'inflow' ? 'Income' : 'Expenses'}</td>
                  <td>
                    <div className="flex items-center gap-8">
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
                        <span className="pl-6 shrink-0 text-[10px] uppercase tracking-wide text-[var(--expense)]">
                          Review
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`tabular text-right ${tx.signedAmount >= 0 ? 'amount-in' : 'amount-out'}`}>
                    {formatCurrency(tx.signedAmount)}
                  </td>
                  <td>{tx.description}</td>
                  <td className="tabular text-right">{formatCurrency(tx.balance)}</td>
                  <td className="whitespace-nowrap">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="empty py-8">No transactions match this search.</p>
          )}
        </div>
        {visible.length > 0 && (
          <nav className="pager" aria-label="Register pages">
            {Array.from({ length: pageCount }, (_, index) => {
              const number = index + 1
              return (
                <button
                  key={number}
                  type="button"
                  aria-current={number === currentPage ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              )
            })}
          </nav>
        )}
      </article>
    </div>
  )
}

export default BalanceSheetPage
