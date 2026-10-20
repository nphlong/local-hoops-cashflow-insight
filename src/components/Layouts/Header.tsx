import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useCashflowStore, type AppPage } from '../../store/cashflowStore'
import type { CompareGrain, DateRange } from '../../store/periods'
import { BRAND_MARK_SRC } from '../../brand'
import DateRangePicker from './DateRangePicker'

const pages: { id: AppPage; label: string }[] = [
  { id: 'pnl', label: 'Profit and Loss' },
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'ledger', label: 'Balance Sheet' },
]

const Header: React.FC = () => {
  const { page, setPage, filters, setFilters, asOf } = useCashflowStore()
  const { user, signOut } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const avatar = user?.picture || BRAND_MARK_SRC

  useEffect(() => {
    setMenuOpen(false)
  }, [page])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const go = (id: AppPage) => {
    setPage(id)
    setMenuOpen(false)
  }

  const onGrain = (grain: CompareGrain) => setFilters({ grain, customRange: null })
  const onCustomRange = (customRange: DateRange) => setFilters({ customRange })

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-nav">
        <a className="brand-lockup" href="#/" aria-label="Local Hoops financial dashboard">
          <img src={BRAND_MARK_SRC} alt="" className="brand-mark" />
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
          <div className="nav-date-desktop">
            <DateRangePicker
              asOf={asOf}
              grain={filters.grain}
              customRange={filters.customRange}
              onGrain={onGrain}
              onCustomRange={onCustomRange}
            />
          </div>
          <button type="button" className="auth-chip" onClick={signOut} title={user?.email}>
            <img src={avatar} alt="" className="auth-avatar" referrerPolicy="no-referrer" />
            <span>Log out</span>
          </button>
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
            <img src={BRAND_MARK_SRC} alt="" className="brand-mark" />
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
          <DateRangePicker
            asOf={asOf}
            grain={filters.grain}
            customRange={filters.customRange}
            onGrain={onGrain}
            onCustomRange={onCustomRange}
            compact
          />
          <button type="button" className="auth-chip drawer-auth" onClick={signOut} title={user?.email}>
            <img src={avatar} alt="" className="auth-avatar" referrerPolicy="no-referrer" />
            Log out
          </button>
        </div>
      )}
    </header>
  )
}

export default Header
