import React, { useEffect, useState } from 'react'
import { useCashflowStore, type AppPage } from '../../store/cashflowStore'
import type { CompareGrain } from '../../store/periods'

const MARK = '/brand/local-hoops-mark.jpg'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [page])

  const go = (id: AppPage) => {
    setPage(id)
    setMenuOpen(false)
  }

  return (
    <header className="site-header">
      <div className="site-nav">
        <a className="brand-lockup" href="#/" aria-label="Local Hoops financial dashboard">
          <img src={MARK} alt="" className="brand-mark" />
        </a>

        <nav className="nav-links" aria-label="Statements">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-link"
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="grain-pills" role="group" aria-label="Time filter">
            {grains.map((g) => (
              <button
                key={g.id}
                type="button"
                className="grain-pill"
                aria-pressed={filters.grain === g.id}
                onClick={() => setFilters({ grain: g.id })}
              >
                {g.label}
              </button>
            ))}
          </div>
          {signedIn ? (
            <button type="button" className="auth-chip" onClick={() => setSignedIn(false)}>
              <img src={MARK} alt="" className="auth-avatar" />
              <span>Log out</span>
            </button>
          ) : (
            <button type="button" className="auth-chip auth-chip-primary" onClick={() => setSignedIn(true)}>
              Log in
            </button>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="site-drawer" id="mobile-nav">
          <div className="drawer-top">
            <img src={MARK} alt="" className="brand-mark" />
            <button type="button" className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              ×
            </button>
          </div>
          <nav className="drawer-links" aria-label="Statements">
            {pages.map((item) => (
              <button
                key={item.id}
                type="button"
                className="drawer-link"
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => go(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="grain-pills grain-pills-block" role="group" aria-label="Time filter">
            {grains.map((g) => (
              <button
                key={g.id}
                type="button"
                className="grain-pill"
                aria-pressed={filters.grain === g.id}
                onClick={() => setFilters({ grain: g.id })}
              >
                {g.label}
              </button>
            ))}
          </div>
          {signedIn ? (
            <button type="button" className="auth-chip drawer-auth" onClick={() => setSignedIn(false)}>
              <img src={MARK} alt="" className="auth-avatar" />
              Log out
            </button>
          ) : (
            <button type="button" className="auth-chip auth-chip-primary drawer-auth" onClick={() => setSignedIn(true)}>
              Log in
            </button>
          )}
        </div>
      )}
    </header>
  )
}

export default Header
