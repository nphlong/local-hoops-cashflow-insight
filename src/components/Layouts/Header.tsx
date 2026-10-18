import React from 'react'
import { useCashflowStore, type AppPage } from '../../store/cashflowStore'
import type { CompareGrain } from '../../store/periods'

const pages: { id: AppPage; label: string }[] = [
  { id: 'pnl', label: 'Profit and Loss' },
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'ledger', label: 'Balance Sheet' },
]

const grains: { id: CompareGrain; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

const Header: React.FC = () => {
  const { page, setPage, filters, setFilters } = useCashflowStore()

  return (
    <header className="sticky top-0 z-20 bg-white/95 shadow-[0_1px_0_var(--line)] backdrop-blur">
      <div className="page-shell pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="display text-2xl text-[var(--navy)] md:text-[28px]">
            Local Hoops financial dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Filter</span>
            <div className="flex overflow-hidden rounded-full border border-[var(--line)] bg-[var(--chip)]">
              {grains.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setFilters({ grain: g.id })}
                  className="px-3 py-1.5 text-sm"
                  style={{
                    background: filters.grain === g.id ? 'var(--navy)' : 'transparent',
                    color: filters.grain === g.id ? '#fff' : 'var(--muted)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="mt-3 flex gap-6 border-t border-[var(--line)]" aria-label="Statements">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-tab"
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
