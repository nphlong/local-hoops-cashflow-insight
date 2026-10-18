import { useEffect } from 'react'
import Header from './components/Layouts/Header'
import ProfitAndLossPage from './pages/ProfitAndLossPage'
import CashflowPage from './pages/CashflowPage'
import BalanceSheetPage from './pages/BalanceSheetPage'
import { useCashflowStore } from './store/cashflowStore'

function App() {
  const { page, toast, clearToast } = useCashflowStore()

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(clearToast, 3200)
    return () => window.clearTimeout(id)
  }, [toast, clearToast])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <main className="page-shell py-6">
        {page === 'pnl' && <ProfitAndLossPage />}
        {page === 'cashflow' && <CashflowPage />}
        {page === 'ledger' && <BalanceSheetPage />}
      </main>
      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-30 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
