import { useEffect, useState } from 'react'
import ExpenseForm from './components/ExpenseForm'

function App() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setHealth(data))
      .catch((err) => setHealthError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Expense Tracker</h1>

        <div className="mb-6">
          <ExpenseForm />
        </div>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Expenses</h2>
          <div className="text-gray-400 text-sm">Placeholder</div>
        </section>

        <div className="text-xs text-gray-400 mt-8">
          {health && <span>API: {JSON.stringify(health)}</span>}
          {healthError && <span>API error: {healthError}</span>}
          {!health && !healthError && <span>API: loading…</span>}
        </div>
      </div>
    </div>
  )
}

export default App
