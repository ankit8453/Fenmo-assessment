import { useCallback, useEffect, useState } from 'react';

function formatDate(yyyymmdd) {
  if (!yyyymmdd) return '';
  // Parse as local-midnight to avoid the UTC->local one-day shift.
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch {
      setErrorMessage('Could not load expenses. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    const onCreated = () => fetchExpenses();
    window.addEventListener('expense:created', onCreated);
    return () => window.removeEventListener('expense:created', onCreated);
  }, [fetchExpenses]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {!isLoading && !errorMessage && expenses.length > 0 && (
          <span className="text-xs text-gray-500">
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">Loading expenses...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="text-sm text-red-600">
          {errorMessage}{' '}
          <button
            type="button"
            onClick={fetchExpenses}
            className="text-blue-600 underline ml-1"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && expenses.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-6">
          No expenses yet. Add your first expense above.
        </div>
      )}

      {!isLoading && !errorMessage && expenses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pl-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-700">
                    {formatDate(e.date)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4 max-w-xs truncate text-gray-600">
                    {e.description ? e.description : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pl-4 text-right font-medium text-gray-900 whitespace-nowrap">
                    ₹{e.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
