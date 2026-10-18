import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  categoryName,
  mixByCategory,
  periodTransactions,
  useCashflowStore,
} from '../../store/cashflowStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const OutflowChart: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const mix = mixByCategory(periodTransactions(transactions, filters.grain, 'current'), 'outflow')
  const ids = Object.keys(mix)
  const empty = ids.length === 0

  const data = {
    labels: ids.map((id) => categoryName(id)),
    datasets: [
      {
        label: 'Outflow',
        data: ids.map((id) => mix[id]),
        backgroundColor: '#b5523a',
        borderRadius: 2,
      },
    ],
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: '#9a8f82',
          callback: (value: string | number) => `$${Number(value).toLocaleString()}`,
        },
        grid: { color: 'rgba(196, 165, 116, 0.08)' },
      },
      y: {
        ticks: { color: '#9a8f82', font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="panel reveal p-5" style={{ animationDelay: '0.5s' }}>
      <h2 className="display text-xl">Outflow mix</h2>
      <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        Lease, utilities, staff, court upkeep
      </p>
      <div style={{ height: '220px' }}>
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            No outflow in this period.
          </p>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default OutflowChart
