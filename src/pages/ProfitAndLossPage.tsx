import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  comparePeriods,
  runningLedger,
  useCashflowStore,
} from '../store/cashflowStore'
import { lastTwelveMonths } from '../store/periods'
import { legendGap } from '../components/Charts/legendGap'
import { formatCompactCurrency, formatPercentage } from '../utils/currencyFormatter'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
)

const tick = { color: '#6b7c8d', font: { size: 11, family: 'IBM Plex Sans' } }
const legend = {
  position: 'top' as const,
  align: 'start' as const,
  labels: { color: '#5b6b7c', boxWidth: 8, boxHeight: 8, font: { family: 'IBM Plex Sans', size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' as const },
}

const monthCutoff = (key: string, asOf: string) => {
  const [year, month] = key.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const day = key === asOf.slice(0, 7) ? Math.min(Number(asOf.slice(8)), lastDay) : lastDay
  return `${key}-${String(day).padStart(2, '0')}`
}

const balanceOn = (ledger: { date: string; balance: number }[], iso: string, opening: number) => {
  let balance = opening
  for (const row of ledger) {
    if (row.date > iso) break
    balance = row.balance
  }
  return balance
}

const axisX = {
  ticks: { ...tick, autoSkip: true, maxRotation: 0, minRotation: 0, maxTicksLimit: 7 },
  grid: { display: false },
  border: { display: false },
  offset: true,
}

const ProfitAndLossPage: React.FC = () => {
  const { transactions, filters, asOf, openingBalance } = useCashflowStore()
  const { current, prior } = comparePeriods(transactions, filters.grain, asOf)

  const series = lastTwelveMonths(transactions, asOf)
  const ledger = runningLedger(transactions, openingBalance)
  const balanceSeries = series.map((point) => {
    const cutoff = monthCutoff(point.key, asOf)
    return {
      label: point.label,
      balance: balanceOn(ledger, cutoff, openingBalance),
    }
  })

  const combo = {
    labels: series.map((d) => d.label),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Income',
        data: series.map((d) => d.inflow),
        backgroundColor: '#2f6fed',
        borderRadius: 2,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Expenses',
        data: series.map((d) => d.outflow),
        backgroundColor: '#f0c419',
        borderRadius: 2,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Operating Margin',
        data: series.map((d) => (d.inflow === 0 ? null : ((d.inflow - d.outflow) / d.inflow) * 100)),
        borderColor: '#c0392b',
        backgroundColor: '#c0392b',
        yAxisID: 'y1',
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: false,
      },
    ],
  }

  const comboOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    layout: { padding: { top: 4, right: 4, bottom: 0, left: 0 } },
    plugins: { legend, tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
      const y = ctx.parsed.y
      if (y == null || Number.isNaN(y)) return `${ctx.dataset.label}: —`
      if (ctx.dataset.label === 'Operating Margin') return `${ctx.dataset.label}: ${y.toFixed(1)}%`
      return `${ctx.dataset.label}: ${formatCompactCurrency(y)}`
    } } } },
    scales: {
      x: axisX,
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        beginAtZero: true,
        grace: '8%',
        ticks: {
          ...tick,
          callback: (v: string | number) => formatCompactCurrency(Number(v)),
        },
        grid: { color: '#eef2f6' },
        border: { display: false },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: -25,
        max: 100,
        ticks: { ...tick, callback: (v: string | number) => `${v}%` },
        grid: { drawOnChartArea: false },
        border: { display: false },
      },
    },
  }

  const grossLine = {
    labels: series.map((d) => d.label),
    datasets: [
      {
        label: 'Gross Profit',
        data: series.map((d) => d.inflow - d.outflow),
        borderColor: '#2f6fed',
        backgroundColor: '#2f6fed',
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Gross Margin',
        data: series.map((d) => (d.inflow === 0 ? NaN : ((d.inflow - d.outflow) / d.inflow) * 100)),
        borderColor: '#f0c419',
        backgroundColor: '#f0c419',
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y1',
        spanGaps: false,
      },
    ],
  }

  const balanceArea = {
    labels: balanceSeries.map((point) => point.label),
    datasets: [
      {
        label: 'Actual balance',
        data: balanceSeries.map((point) => point.balance),
        borderColor: '#6bc98a',
        backgroundColor: 'rgba(143, 212, 173, 0.45)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const vsPrior = (now: number, then: number) => {
    if (now === then) return 'pct-even'
    return now > then ? 'pct-good' : 'pct-bad'
  }
  const bySign = (now: number) => {
    if (now === 0) return 'pct-even'
    return now > 0 ? 'pct-good' : 'pct-bad'
  }

  const kpis = [
    { label: 'Total Income', value: formatCompactCurrency(current.totalInflow), tone: vsPrior(current.totalInflow, prior.totalInflow) },
    { label: 'Total Gross Profit', value: formatCompactCurrency(current.netCashflow), tone: bySign(current.netCashflow) },
    { label: 'Courts income mix', value: formatPercentage(current.courtHireShare), tone: vsPrior(current.courtHireShare, prior.courtHireShare) },
    { label: 'Total Operating Profit', value: formatCompactCurrency(current.netCashflow), tone: bySign(current.netCashflow) },
    { label: 'F&B mix', value: formatPercentage(current.fbShare), tone: vsPrior(current.fbShare, prior.fbShare) },
    { label: 'Total Net Profit', value: formatCompactCurrency(current.netCashflow), tone: bySign(current.netCashflow) },
  ]

  return (
    <div className="pnl">
      <h2 className="page-title">Profit and Loss overview</h2>

      <div className="pnl-hero">
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="kpi-card">
              <p className="kpi-label">{kpi.label}</p>
              <p className={`kpi-value tabular ${kpi.tone}`}>{kpi.value}</p>
            </article>
          ))}
        </div>
        <article className="chart-card">
          <h3 className="chart-title">Operating Income and Expenses past 12 mos</h3>
          <div className="chart-body">
            <MixedBarLine data={combo} options={comboOptions} />
          </div>
        </article>
      </div>

      <div className="pnl-bottom">
        <article className="chart-card">
          <h3 className="chart-title">Gross Profit past 12 mos</h3>
          <div className="chart-body chart-body-sm">
            <Line
              plugins={[legendGap]}
              data={grossLine}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                clip: false,
                layout: { padding: { right: 8 } },
                plugins: { legend },
                scales: {
                  x: axisX,
                  y: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    grace: '8%',
                    ticks: {
                      ...tick,
                      callback: (v: string | number) => formatCompactCurrency(Number(v)),
                    },
                    grid: { color: '#eef2f6' },
                    border: { display: false },
                  },
                  y1: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: { ...tick, callback: (v: string | number) => `${v}%` },
                    grid: { drawOnChartArea: false },
                    border: { display: false },
                  },
                },
              }}
            />
          </div>
        </article>
        <article className="chart-card">
          <h3 className="chart-title">Actual Balance Breakdown By Month</h3>
          <div className="chart-body chart-body-sm">
            <Line
              plugins={[legendGap]}
              data={balanceArea}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { ...legend, position: 'bottom', align: 'center' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const y = ctx.parsed.y
                        if (y == null) return `${ctx.dataset.label}: —`
                        return `${ctx.dataset.label}: ${formatCompactCurrency(y)}`
                      },
                    },
                  },
                },
                scales: {
                  x: axisX,
                  y: {
                    beginAtZero: false,
                    grace: '8%',
                    ticks: {
                      ...tick,
                      callback: (v) => formatCompactCurrency(Number(v)),
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
    </div>
  )
}

function MixedBarLine({ data, options }: { data: unknown; options: unknown }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    const chart = new ChartJS(node, {
      type: 'bar',
      data: JSON.parse(JSON.stringify(data)) as never,
      options: options as never,
      plugins: [legendGap],
    })
    const frame = requestAnimationFrame(() => chart.resize())
    const parent = node.parentElement
    const observer = parent
      ? new ResizeObserver(() => {
          chart.resize()
        })
      : null
    if (parent && observer) observer.observe(parent)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      chart.destroy()
    }
  }, [JSON.stringify(data)])

  return <canvas ref={canvasRef} />
}

export default ProfitAndLossPage
