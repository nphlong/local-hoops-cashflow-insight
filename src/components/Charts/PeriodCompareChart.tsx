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
import { comparePeriods, useCashflowStore } from '../../store/cashflowStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const PeriodCompareChart: React.FC = () => {
  const { transactions, filters } = useCashflowStore()
  const compare = comparePeriods(transactions, filters.grain)
  const { current, prior, window } = compare

  const data = {
    labels: ['Inflow', 'Outflow', 'Net'],
    datasets: [
      {
        label: window.currentLabel.split(' (')[0],
        data: [current.totalInflow, current.totalOutflow, current.netCashflow],
        backgroundColor: ['#d4a017', '#b5523a', '#c4a574'],
      },
      {
        label: window.priorLabel.split(' (')[0],
        data: [prior.totalInflow, prior.totalOutflow, prior.netCashflow],
        backgroundColor: ['#8a7018', '#7a3c2e', '#6e8b9e'],
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
        ticks: { color: '#9a8f82' },
        grid: { display: false },
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

  const empty = current.totalInflow === 0 && current.totalOutflow === 0 && prior.totalInflow === 0 && prior.totalOutflow === 0

  return (
    <div className="panel reveal p-5" style={{ animationDelay: '0.32s' }}>
      <h2 className="display text-xl">Inflow vs outflow</h2>
      <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        {window.currentLabel} · vs {window.priorLabel}
      </p>
      <div style={{ height: '280px' }}>
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            No cash movement in these windows.
          </p>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default PeriodCompareChart
