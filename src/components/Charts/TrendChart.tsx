import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { AS_OF_DATE } from '../../data/mockCashflow'
import { useCashflowStore } from '../../store/cashflowStore'
import { bucketSeries, inRange } from '../../store/periods'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend)

const lookbackStart = (grain: 'week' | 'month' | 'year') => {
  if (grain === 'week') return '2026-08-01'
  if (grain === 'month') return '2025-05-01'
  return '2025-01-01'
}

const TrendChart: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const scoped = transactions.filter((tx) => inRange(tx.date, { start: lookbackStart(filters.grain), end: AS_OF_DATE }))
  const series = bucketSeries(scoped, filters.grain === 'year' ? 'month' : filters.grain)

  const empty = series.length === 0
  const grainNote =
    filters.grain === 'week'
      ? 'Weekly inflow vs outflow'
      : filters.grain === 'month'
        ? 'Monthly inflow vs outflow'
        : 'Monthly inflow vs outflow (this year and last)'

  const data = {
    labels: series.map((d) => d.label),
    datasets: [
      {
        label: 'Inflow',
        data: series.map((d) => d.inflow),
        borderColor: '#d4a017',
        backgroundColor: 'rgba(212, 160, 23, 0.12)',
        tension: 0.25,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Outflow',
        data: series.map((d) => d.outflow),
        borderColor: '#b5523a',
        backgroundColor: 'rgba(181, 82, 58, 0.1)',
        tension: 0.25,
        fill: true,
        pointRadius: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9a8f82', boxWidth: 10, font: { family: 'IBM Plex Sans' } },
      },
      title: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#9a8f82', maxRotation: 0 },
        grid: { color: 'rgba(196, 165, 116, 0.08)' },
      },
      y: {
        ticks: {
          color: '#9a8f82',
          callback: (value: string | number) => `$${Number(value).toLocaleString()}`,
        },
        grid: { color: 'rgba(196, 165, 116, 0.08)' },
      },
    },
  }

  return (
    <div className="panel reveal h-full p-5" style={{ animationDelay: '0.38s' }}>
      <h2 className="display text-xl">Trend</h2>
      <p className="mb-4 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{grainNote}</p>
      <div style={{ height: '280px' }}>
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            No movement in this window.
          </p>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default TrendChart
