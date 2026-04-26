import { useEffect, useState } from 'react'

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
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-center mb-8">Expense Tracker</h1>

        <div className="mb-8 p-4 rounded border border-gray-200 bg-white text-sm">
          <div className="font-semibold mb-2">API Health</div>
          {health && (
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
          {healthError && (
            <div className="text-red-600">Error: {healthError}</div>
          )}
          {!health && !healthError && (
            <div className="text-gray-500">Loading…</div>
          )}
        </div>

        <section className="mb-6 p-4 rounded border border-gray-300 bg-white">
          <h2 className="text-xl font-semibold mb-2">Add Expense</h2>
          <div className="text-gray-400 text-sm">Placeholder</div>
        </section>

        <section className="p-4 rounded border border-gray-300 bg-white">
          <h2 className="text-xl font-semibold mb-2">Expenses</h2>
          <div className="text-gray-400 text-sm">Placeholder</div>
        </section>
      </div>
    </div>
  )
}

export default App
