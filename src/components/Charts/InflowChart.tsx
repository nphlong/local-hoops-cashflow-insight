import React from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  categoryName,
  mixByCategory,
  periodTransactions,
  useCashflowStore,
} from '../../store/cashflowStore'

ChartJS.register(ArcElement, Tooltip, Legend)

const InflowChart: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const mix = mixByCategory(periodTransactions(transactions, filters.grain, 'current'), 'inflow')
  const ids = Object.keys(mix)
  const empty = ids.length === 0

  const data = {
    labels: ids.map((id) => categoryName(id)),
    datasets: [
      {
        data: ids.map((id) => mix[id]),
        backgroundColor: ['#d4a017', '#c4a574', '#8fbc8f', '#6e8b9e', '#e0c48a', '#9a7b4f', '#f0d09a'],
        borderWidth: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9a8f82', boxWidth: 8, font: { size: 10, family: 'IBM Plex Sans' } },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number }) => {
            const total = ids.reduce((sum, id) => sum + mix[id], 0)
            const pct = total ? ((context.parsed / total) * 100).toFixed(1) : '0.0'
            return `${context.label}: $${context.parsed.toFixed(0)} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="panel reveal p-5" style={{ animationDelay: '0.44s' }}>
      <h2 className="display text-xl">Inflow mix</h2>
      <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        Court hire vs memberships, events, other
      </p>
      <div style={{ height: '220px' }}>
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            No inflow in this period.
          </p>
        ) : (
          <Doughnut data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default InflowChart
