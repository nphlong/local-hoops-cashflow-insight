import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { AS_OF_DATE } from '../data/mockCashflow'
import {
  DEFAULT_INFLOW_CATEGORIES,
  DEFAULT_OUTFLOW_CATEGORIES,
} from '../../types/cashflow.types'
import {
  categoryTrackRows,
  comparePeriods,
  mixByCategory,
  periodTransactions,
  summarize,
  useCashflowStore,
} from '../store/cashflowStore'
import { bucketSeries, inRange } from '../store/periods'
import { formatCurrency, formatNumber, formatPercentage } from '../utils/currencyFormatter'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const TrackTable: React.FC<{
  title: string
  rows: ReturnType<typeof categoryTrackRows>
  accent: string
}> = ({ title, rows, accent }) => {
  const tracked = rows.reduce((s, r) => s + r.tracked, 0)
  const budget = rows.reduce((s, r) => s + r.budget, 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--navy)] text-left text-white">
            <th className="px-3 py-2 font-medium">{title}</th>
            <th className="px-3 py-2 text-right font-medium">Tracked</th>
            <th className="px-3 py-2 text-right font-medium">Prior</th>
            <th className="px-3 py-2 font-medium">% vs prior</th>
            <th className="px-3 py-2 text-right font-medium">Remaining</th>
            <th className="px-3 py-2 text-right font-medium">Excess</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--line)]">
              <td className="px-3 py-2">{row.name}</td>
              <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(row.tracked))}</td>
              <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(row.budget))}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="track-bar w-16">
                    <span style={{ width: `${Math.min(row.pct * 100, 100)}%`, background: accent }} />
                  </div>
                  <span className={row.pct > 1 ? 'text-[var(--bad)]' : 'text-[var(--good)]'}>
                    {formatPercentage(row.pct)}
                  </span>
                </div>
              </td>
              <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(row.remaining))}</td>
              <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(row.excess))}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-3 py-2">Total</td>
            <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(tracked))}</td>
            <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(budget))}</td>
            <td className="px-3 py-2">{budget ? formatPercentage(tracked / budget) : '—'}</td>
            <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(Math.max(budget - tracked, 0)))}</td>
            <td className="tabular px-3 py-2 text-right">{formatNumber(Math.round(Math.max(tracked - budget, 0)))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const CashflowPage: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const compare = comparePeriods(transactions, filters.grain)
  const currentRows = periodTransactions(transactions, filters.grain, 'current')
  const priorRows = periodTransactions(transactions, filters.grain, 'prior')
  const incomeRows = categoryTrackRows(
    mixByCategory(currentRows, 'inflow'),
    mixByCategory(priorRows, 'inflow'),
    DEFAULT_INFLOW_CATEGORIES,
  )
  const expenseRows = categoryTrackRows(
    mixByCategory(currentRows, 'outflow'),
    mixByCategory(priorRows, 'outflow'),
    DEFAULT_OUTFLOW_CATEGORIES,
  )
  const current = summarize(currentRows)
  const prior = summarize(priorRows)
  const savingsRate = current.totalInflow === 0 ? 0 : current.netCashflow / current.totalInflow
  const monthSeries = bucketSeries(
    transactions.filter((tx) => inRange(tx.date, { start: `${AS_OF_DATE.slice(0, 4)}-01-01`, end: AS_OF_DATE })),
    'month',
  )

  const donut = (rows: typeof incomeRows, colors: string[]) => ({
    labels: rows.map((r) => r.name),
    datasets: [{ data: rows.map((r) => r.tracked), backgroundColor: colors, borderWidth: 1, borderColor: '#fff' }],
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Selected period</p>
          <p className="mt-1 font-medium text-[var(--navy)]">{compare.window.currentLabel}</p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Period vs prior</p>
          <p className="mt-1 font-medium text-[var(--navy)]">
            {prior.totalInflow ? formatPercentage(current.totalInflow / prior.totalInflow) : '—'} of prior inflow
          </p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Period tracking balance</p>
          <p className="tabular mt-1 font-medium text-[var(--navy)]">{formatCurrency(current.netCashflow)}</p>
          <p className="text-xs text-[var(--muted)]">income left after expenses</p>
        </article>
        <article className="card px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Period savings rate</p>
          <p className="mt-1 font-medium text-[var(--navy)]">{formatPercentage(savingsRate)} of income kept</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="card overflow-hidden">
          <TrackTable title={`Income — ${filters.grain}`} rows={incomeRows} accent="#2f6fed" />
        </article>
        <article className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--navy)]">Income categories (tracked)</h3>
          <div style={{ height: 220 }}>
            <Doughnut data={donut(incomeRows, ['#2f6fed', '#1f8a4c', '#16a085', '#7b5ea7', '#e67e22', '#5dade2', '#e8b923'])} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </article>
        <article className="card overflow-hidden">
          <TrackTable title={`Expenses — ${filters.grain}`} rows={expenseRows} accent="#e8b923" />
        </article>
        <article className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--navy)]">Expense categories (tracked)</h3>
          <div style={{ height: 220 }}>
            <Doughnut data={donut(expenseRows, ['#c0392b', '#e67e22', '#e8b923', '#7b5ea7', '#5b6b7c', '#16a085', '#2f6fed', '#1f8a4c', '#95a5a6'])} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </article>
      </div>

      <article className="card p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--navy)]">Summary — tracked income vs expenses this year</h3>
        <div style={{ height: 260 }}>
          <Bar
            data={{
              labels: monthSeries.map((d) => d.label),
              datasets: [
                { label: 'Income', data: monthSeries.map((d) => d.inflow), backgroundColor: '#2f6fed' },
                { label: 'Expenses', data: monthSeries.map((d) => d.outflow), backgroundColor: '#e8b923' },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { ticks: { color: '#5b6b7c' }, grid: { display: false } },
                y: { ticks: { color: '#5b6b7c' }, grid: { color: '#eef2f6' } },
              },
            }}
          />
        </div>
      </article>
    </div>
  )
}

export default CashflowPage
