import React, { useState } from 'react'
import { categoriesFor, categoryName, useCashflowStore } from '../../store/cashflowStore'
import type { TransactionType } from '../../../types/cashflow.types'

const ManualEntryForm: React.FC = () => {
  const { addTransaction } = useCashflowStore()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryType, setCategoryType] = useState<TransactionType>('inflow')
  const [categoryId, setCategoryId] = useState(categoriesFor('inflow')[0].id)
  const [date, setDate] = useState('2026-10-18')

  const setType = (type: TransactionType) => {
    setCategoryType(type)
    setCategoryId(categoriesFor(type)[0].id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTransaction({
      amount: Number(amount),
      description,
      categoryType,
      categoryId,
      date,
    })
    setAmount('')
    setDescription('')
  }

  return (
    <div className="chart-card chart-card-pad">
      <h3 className="chart-title">Manual entry</h3>
      <p className="kpi-hint mb-4">Post one cash movement</p>
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('inflow')}
            className="rounded-md px-3 py-2 text-xs font-medium"
            style={{
              background: categoryType === 'inflow' ? 'var(--income)' : 'var(--chip)',
              color: categoryType === 'inflow' ? '#fff' : 'var(--muted)',
            }}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('outflow')}
            className="rounded-md px-3 py-2 text-xs font-medium"
            style={{
              background: categoryType === 'outflow' ? 'var(--expense)' : 'var(--chip)',
              color: categoryType === 'outflow' ? '#1b2a3d' : 'var(--muted)',
            }}
          >
            Expense
          </button>
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 text-sm">
          {categoriesFor(categoryType).map((c) => (
            <option key={c.id} value={c.id}>
              {categoryName(c.id)}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          step="0.01"
          min="0"
          required
          className="w-full px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          required
          className="w-full px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-md py-3 text-sm font-medium text-white"
          style={{ background: 'var(--navy)' }}
        >
          Save {categoryType === 'inflow' ? 'income' : 'expense'}
        </button>
      </form>
    </div>
  )
}

export default ManualEntryForm
