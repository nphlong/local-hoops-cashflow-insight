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
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Pie, Line } from 'react-chartjs-2'
import { AS_OF_DATE } from '../data/mockCashflow'
import {
  categoryName,
  comparePeriods,
  mixByCategory,
  periodTransactions,
  useCashflowStore,
} from '../store/cashflowStore'
import { lastTwelveMonths } from '../store/periods'
import { formatCompactCurrency, formatPercentage } from '../utils/currencyFormatter'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  ArcElement,
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

const axisX = {
  ticks: { ...tick, autoSkip: true, maxRotation: 0, minRotation: 0, maxTicksLimit: 7 },
  grid: { display: false },
  border: { display: false },
  offset: true,
}

const ProfitAndLossPage: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const { current } = comparePeriods(transactions, filters.grain)

  const series = lastTwelveMonths(transactions, AS_OF_DATE)
  const mix = mixByCategory(periodTransactions(transactions, filters.grain, 'current'), 'outflow')
  const mixIds = Object.keys(mix)

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
          callback: (v: string | number) => `$${(Number(v) / 1000).toFixed(0)}.0K`,
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

  const doughnut = {
    labels: mixIds.map((id) => categoryName(id)),
    datasets: [
      {
        data: mixIds.map((id) => mix[id]),
        backgroundColor: ['#2f6fed', '#c0392b', '#f0c419', '#7b5ea7', '#1f8a4c', '#e67e22', '#16a085', '#5b6b7c'],
        borderWidth: 0,
      },
    ],
  }

  const kpis = [
    { label: 'Total Income', value: formatCompactCurrency(current.totalInflow) },
    { label: 'Total Gross Profit', value: formatCompactCurrency(current.netCashflow) },
    { label: 'Court hire mix', value: formatPercentage(current.courtHireShare) },
    { label: 'Total Operating Profit', value: formatCompactCurrency(current.netCashflow) },
    { label: 'Membership mix', value: formatPercentage(current.membershipShare) },
    { label: 'Total Net Profit', value: formatCompactCurrency(current.netCashflow) },
  ]

  return (
    <div className="pnl">
      <h2 className="pnl-title">Profit and Loss overview</h2>

      <div className="pnl-hero">
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="kpi-card">
              <p className="kpi-label">{kpi.label}</p>
              <p className="kpi-value tabular">{kpi.value}</p>
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
                      callback: (v: string | number) => `$${(Number(v) / 1000).toFixed(0)}.0K`,
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
          <h3 className="chart-title">Expense by Account name as of today</h3>
          <div className="chart-body chart-body-sm pie-body">
            {mixIds.length === 0 ? (
              <p className="empty">No expenses in this period.</p>
            ) : (
              <Pie
                data={doughnut}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { ...legend.labels, padding: 10 },
                    },
                  },
                }}
              />
            )}
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
