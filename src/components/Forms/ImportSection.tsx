import React from 'react'
import { useCashflowStore } from '../../store/cashflowStore'

const ImportSection: React.FC = () => {
  const { importStatus, simulateImport } = useCashflowStore()
  const [isDragging, setIsDragging] = React.useState(false)

  const runImport = async () => {
    await simulateImport()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) await runImport()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await runImport()
  }

  const message = {
    idle: 'Drop a bank Excel or CSV. This POC appends sample tagged rows — parsing comes later.',
    uploading: 'Loading sample rows…',
    success: 'Sample rows added. Recategorize anything marked Review.',
    error: 'Could not simulate import.',
  }[importStatus]

  return (
    <div className="card p-5">
      <h2 className="text-lg font-medium text-[var(--navy)]">Import statement</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">Excel · CSV · not parsed yet</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="rounded-lg border border-dashed px-6 py-8 text-center"
        style={{
          borderColor: isDragging || importStatus === 'success' ? 'var(--income)' : 'var(--line)',
          background: isDragging ? 'var(--chip)' : 'transparent',
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <p className="text-sm">{message}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">.xlsx · .xls · .csv</p>
        </label>
        <button
          type="button"
          onClick={runImport}
          className="mt-4 rounded-md bg-[var(--navy)] px-4 py-2 text-xs font-medium text-white"
        >
          Load sample rows
        </button>
      </div>
    </div>
  )
}

export default ImportSection
