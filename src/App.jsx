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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm12 8a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Tracker</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Record your expenses and track where your money goes.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6">
              <ExpenseForm />
            </div>
          </div>
          <div className="lg:col-span-3">
            <ExpenseList />
          </div>
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
