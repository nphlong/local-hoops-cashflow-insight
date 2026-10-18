import React from 'react'
import { formatCurrency } from '../../utils/currencyFormatter'
import {
  DEFAULT_INFLOW_CATEGORIES,
  DEFAULT_OUTFLOW_CATEGORIES,
} from '../../../types/cashflow.types'
import {
  categoriesFor,
  filterTransactions,
  useCashflowStore,
} from '../../store/cashflowStore'

const TransactionTable: React.FC = () => {
  const { transactions, filters, setFilters, updateCategory } = useCashflowStore()
  const rows = filterTransactions(transactions, filters)
  const categoryOptions =
    filters.type === 'outflow' ? DEFAULT_OUTFLOW_CATEGORIES : DEFAULT_INFLOW_CATEGORIES

  return (
    <section className="panel reveal overflow-hidden" style={{ animationDelay: '0.56s' }}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="display text-xl">Transactions</h2>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            {rows.length} in the selected period
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search memo or category"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-48 px-3 py-2 text-sm"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}
            className="px-3 py-2 text-sm"
          >
            <option value="all">In + out</option>
            <option value="inflow">Inflow</option>
            <option value="outflow">Outflow</option>
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
            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Memo</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id} className="border-t border-[var(--line)] hover:bg-[rgba(196,165,116,0.05)]">
                <td className="whitespace-nowrap px-5 py-3 text-[var(--muted)]">
                  {new Date(`${tx.date}T12:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-3">
                  <span>{tx.description}</span>
                  {tx.needsReview && (
                    <span className="ml-2 inline-block border border-[var(--maple)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--maple)]">
                      Review
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-[10px] uppercase tracking-wider"
                      style={{
                        background: tx.categoryType === 'inflow' ? 'var(--maple-dim)' : 'var(--outflow-dim)',
                        color: tx.categoryType === 'inflow' ? 'var(--inflow)' : 'var(--outflow)',
                      }}
                    >
                      {tx.categoryType}
                    </span>
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
                  </div>
                </td>
                <td
                  className="tabular whitespace-nowrap px-5 py-3 text-right font-medium"
                  style={{ color: tx.categoryType === 'inflow' ? 'var(--inflow)' : 'var(--outflow)' }}
                >
                  {tx.categoryType === 'inflow' ? '+' : '−'}
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
            No transactions match this period or search.
          </p>
        )}
      </div>
    </section>
  )
}

export default TransactionTable
