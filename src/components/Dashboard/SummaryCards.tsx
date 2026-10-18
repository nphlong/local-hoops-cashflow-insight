import React from 'react'
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/currencyFormatter'
import { formatDelta } from '../../utils/delta'
import { comparePeriods, useCashflowStore } from '../../store/cashflowStore'

const Delta: React.FC<{ value: number }> = ({ value }) => (
  <span className={`text-xs ${value >= 0 ? 'delta-up' : 'delta-down'}`}>
    {formatDelta(value)} vs prior
  </span>
)

const SummaryCards: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const { current, inflowDelta, outflowDelta, netDelta, bookingDelta, window } = comparePeriods(
    transactions,
    filters.grain,
  )

  const cells = [
    {
      label: 'Inflow',
      hint: 'Cash in',
      value: formatCurrency(current.totalInflow),
      delta: inflowDelta,
      color: 'var(--inflow)',
    },
    {
      label: 'Outflow',
      hint: 'Cash out',
      value: formatCurrency(current.totalOutflow),
      delta: outflowDelta,
      color: 'var(--outflow)',
    },
    {
      label: 'Net cashflow',
      hint: 'In minus out',
      value: `${current.netCashflow >= 0 ? '+' : '−'}${formatCurrency(Math.abs(current.netCashflow))}`,
      delta: netDelta,
      color: current.netCashflow >= 0 ? 'var(--inflow)' : 'var(--outflow)',
    },
    {
      label: 'Court hires',
      hint: 'Rental bookings',
      value: formatNumber(current.bookingCount),
      delta: bookingDelta,
      color: 'var(--ink)',
    },
    {
      label: 'Hire / booking',
      hint: 'Court-rental average',
      value: formatCurrency(current.revenuePerBooking),
      extra: `${formatPercentage(current.courtHireShare)} of inflow`,
      color: 'var(--maple)',
    },
  ]

  return (
    <section>
      <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{window.currentLabel}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cells.map((cell, i) => (
          <article
            key={cell.label}
            className="panel reveal px-4 py-4"
            style={{ animationDelay: `${0.04 + i * 0.06}s` }}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{cell.label}</p>
            <p className="display tabular mt-2 text-3xl leading-none md:text-4xl" style={{ color: cell.color }}>
              {cell.value}
            </p>
            <p className="mt-2">
              {'delta' in cell && cell.delta !== undefined ? (
                <Delta value={cell.delta} />
              ) : (
                <span className="text-xs text-[var(--muted)]">{cell.extra}</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">{cell.hint}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Recurring membership share of inflow: {formatPercentage(current.membershipShare)}. Court hire
        share: {formatPercentage(current.courtHireShare)}. Occupancy hours are not in bank data — hire
        count and mix stand in until booking logs are connected.
      </p>
    </section>
  )
}

export default SummaryCards
