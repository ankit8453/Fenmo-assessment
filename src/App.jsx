import { useEffect, useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => {
        // Health check is a debug aid, not user-facing — swallow failures.
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-gray-600 mt-1">
            Record your expenses and track where your money goes.
          </p>
        </header>

        <div className="space-y-6">
          <ExpenseForm />
          <ExpenseList />
        </div>

        {health?.status === 'ok' && (
          <div className="text-[10px] text-gray-400 mt-12 text-center">
            API: {JSON.stringify(health)}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
