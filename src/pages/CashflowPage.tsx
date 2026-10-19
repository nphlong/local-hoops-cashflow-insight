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
import { legendGap } from '../components/Charts/legendGap'
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
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercentage } from '../utils/currencyFormatter'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const tick = { color: '#6b7c8d', font: { size: 11, family: 'IBM Plex Sans' } }
const legend = {
  position: 'right' as const,
  labels: {
    color: '#5b6b7c',
    boxWidth: 8,
    boxHeight: 8,
    font: { family: 'IBM Plex Sans', size: 12 },
    padding: 10,
    usePointStyle: true,
    pointStyle: 'circle' as const,
  },
}

const INCOME_SHADES = ['#0d6b3a', '#1f8a4c', '#4caf78', '#8fd4ad', '#d7f0e3']
const EXPENSE_SHADES = ['#c56a00', '#e67e22', '#f0a04a', '#f6c98a', '#fbe6c8']

const collapseTop = (rows: ReturnType<typeof categoryTrackRows>, limit = 4) => {
  if (rows.length <= limit) return rows
  const rest = rows.slice(limit)
  const tracked = rest.reduce((sum, row) => sum + row.tracked, 0)
  const budget = rest.reduce((sum, row) => sum + row.budget, 0)
  const pct = budget === 0 ? (tracked === 0 ? 0 : 1) : tracked / budget
  return [
    ...rows.slice(0, limit),
    {
      id: 'others',
      name: 'Others',
      tracked,
      budget,
      pct,
      remaining: Math.max(budget - tracked, 0),
      excess: Math.max(tracked - budget, 0),
    },
  ]
}

const shadesFor = (amounts: number[], palette: string[]) => {
  const colors = new Array<string>(amounts.length)
  amounts
    .map((amount, index) => ({ amount, index }))
    .sort((a, b) => b.amount - a.amount)
    .forEach((item, rank) => {
      colors[item.index] = palette[Math.min(rank, palette.length - 1)]
    })
  return colors
}

const vsPriorClass = (pct: number, higherIsBetter: boolean) => {
  if (!Number.isFinite(pct)) return 'tabular pct-even'
  const percent = Math.round(pct * 1000) / 10
  if (percent === 100) return 'tabular pct-even'
  const better = higherIsBetter ? percent > 100 : percent < 100
  return better ? 'tabular pct-good' : 'tabular pct-bad'
}

const TrackTable: React.FC<{
  title: string
  rows: ReturnType<typeof categoryTrackRows>
  colors: string[]
  higherIsBetter: boolean
}> = ({ title, rows, colors, higherIsBetter }) => {
  const tracked = rows.reduce((s, r) => s + r.tracked, 0)
  const budget = rows.reduce((s, r) => s + r.budget, 0)
  const totalPct = budget === 0 ? null : tracked / budget
  return (
    <article className="chart-card chart-card-pad">
      <h3 className="chart-title">{title}</h3>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr className="table-head">
              <th>Category</th>
              <th className="num">Tracked</th>
              <th className="num">Prior</th>
              <th>% vs prior</th>
              <th className="num">Remaining</th>
              <th className="num">Excess</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td className="tabular num text-right">{formatNumber(Math.round(row.tracked))}</td>
                <td className="tabular num text-right">{formatNumber(Math.round(row.budget))}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="track-bar w-16">
                      <span style={{ width: `${Math.min(row.pct * 100, 100)}%`, background: colors[index] }} />
                    </div>
                    <span className={vsPriorClass(row.pct, higherIsBetter)}>{formatPercentage(row.pct)}</span>
                  </div>
                </td>
                <td className="tabular text-right">{formatNumber(Math.round(row.remaining))}</td>
                <td className="tabular text-right">{formatNumber(Math.round(row.excess))}</td>
              </tr>
            ))}
            <tr className="row-total">
              <td>Total</td>
              <td className="tabular text-right">{formatNumber(Math.round(tracked))}</td>
              <td className="tabular text-right">{formatNumber(Math.round(budget))}</td>
              <td>
                {totalPct == null ? '—' : (
                  <span className={vsPriorClass(totalPct, higherIsBetter)}>{formatPercentage(totalPct)}</span>
                )}
              </td>
              <td className="tabular text-right">{formatNumber(Math.round(Math.max(budget - tracked, 0)))}</td>
              <td className="tabular text-right">{formatNumber(Math.round(Math.max(tracked - budget, 0)))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  )
}

const CashflowPage: React.FC = () => {
  const { transactions, filters, asOf } = useCashflowStore()
  const compare = comparePeriods(transactions, filters.grain, asOf)
  const currentRows = periodTransactions(transactions, filters.grain, 'current', asOf)
  const priorRows = periodTransactions(transactions, filters.grain, 'prior', asOf)
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
  const incomeShown = collapseTop(incomeRows)
  const expenseShown = collapseTop(expenseRows)
  const incomeColors = shadesFor(incomeShown.map((row) => row.tracked), INCOME_SHADES)
  const expenseColors = shadesFor(expenseShown.map((row) => row.tracked), EXPENSE_SHADES)
  const current = summarize(currentRows)
  const prior = summarize(priorRows)
  const savingsRate = current.totalInflow === 0 ? 0 : current.netCashflow / current.totalInflow
  const monthSeries = bucketSeries(
    transactions.filter((tx) => inRange(tx.date, { start: `${asOf.slice(0, 4)}-01-01`, end: asOf })),
    'month',
  )

  const donut = (rows: typeof incomeShown, colors: string[]) => ({
    labels: rows.map((row) => row.name),
    datasets: [{ data: rows.map((row) => row.tracked), backgroundColor: colors, borderWidth: 0 }],
  })

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '62%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  }

  return (
    <div className="statement">
      <h2 className="page-title">Cash flow overview</h2>

      <div className="kpi-row">
        <article className="kpi-card">
          <p className="kpi-label">Selected period</p>
          <p className="kpi-value">{compare.window.currentLabel.replace(/^This \w+ \(/, '').replace(/\)$/, '')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Period vs prior</p>
          <p className="kpi-value tabular">
            {prior.totalInflow ? formatPercentage(current.totalInflow / prior.totalInflow) : '—'}
          </p>
          <p className="kpi-hint">of prior inflow</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Period tracking balance</p>
          <p className="kpi-value tabular">{formatCurrency(current.netCashflow)}</p>
          <p className="kpi-hint">income left after expenses</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Period savings rate</p>
          <p className="kpi-value tabular">{formatPercentage(savingsRate)}</p>
          <p className="kpi-hint">of income kept</p>
        </article>
      </div>

      <div className="pnl-bottom">
        <TrackTable title={`Income — ${filters.grain}`} rows={incomeShown} colors={incomeColors} higherIsBetter />
        <article className="chart-card">
          <h3 className="chart-title">Income categories (tracked)</h3>
          <CategoryDonut rows={incomeShown} colors={incomeColors} empty="No income in this period." data={donut(incomeShown, incomeColors)} options={donutOptions} />
        </article>
        <TrackTable title={`Expenses — ${filters.grain}`} rows={expenseShown} colors={expenseColors} higherIsBetter={false} />
        <article className="chart-card">
          <h3 className="chart-title">Expense categories (tracked)</h3>
          <CategoryDonut rows={expenseShown} colors={expenseColors} empty="No expenses in this period." data={donut(expenseShown, expenseColors)} options={donutOptions} />
        </article>
      </div>

      <article className="chart-card">
        <h3 className="chart-title">Summary — tracked income vs expenses this year</h3>
        <div className="chart-body chart-body-sm">
          <Bar
            plugins={[legendGap]}
            data={{
              labels: monthSeries.map((d) => d.label),
              datasets: [
                { label: 'Income', data: monthSeries.map((d) => d.inflow), backgroundColor: INCOME_SHADES[1], borderRadius: 2 },
                { label: 'Expenses', data: monthSeries.map((d) => d.outflow), backgroundColor: EXPENSE_SHADES[1], borderRadius: 2 },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  align: 'start',
                  labels: { ...legend.labels, padding: 12 },
                },
              },
              scales: {
                x: {
                  ticks: { ...tick, autoSkip: true, maxRotation: 0, minRotation: 0, maxTicksLimit: 7 },
                  grid: { display: false },
                  border: { display: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    ...tick,
                    callback: (v: string | number) => formatCompactCurrency(Number(v)),
                  },
                  grid: { color: '#eef2f6' },
                  border: { display: false },
                },
              },
            }}
          />
        </div>
      </article>
    </div>
  )
}

function CategoryDonut({
  rows,
  colors,
  empty,
  data,
  options,
}: {
  rows: ReturnType<typeof categoryTrackRows>
  colors: string[]
  empty: string
  data: { labels: string[]; datasets: { data: number[]; backgroundColor: string[]; borderWidth: number }[] }
  options: React.ComponentProps<typeof Doughnut>['options']
}) {
  if (rows.length === 0) {
    return (
      <div className="donut-row">
        <p className="empty">{empty}</p>
      </div>
    )
  }
  return (
    <div className="donut-row">
      <div className="donut-plot">
        <Doughnut data={data} options={options} />
      </div>
      <ul className="donut-legend">
        {rows.map((row, index) => (
          <li key={row.id}>
            <span className="swatch" style={{ background: colors[index] }} />
            <span className="name">{row.name}</span>
            <span className="amt tabular">{formatNumber(Math.round(row.tracked))}</span>
          </li>
        ))}
        <li className="total">
          <span className="swatch" style={{ background: 'transparent' }} />
          <span className="name">Total</span>
          <span className="amt tabular">{formatNumber(Math.round(rows.reduce((sum, row) => sum + row.tracked, 0)))}</span>
        </li>
      </ul>
    </div>
  )
}

export default CashflowPage
