import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const fetchExpenses = useCallback(async (category, sort) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (sort === 'date_desc') params.set('sort', 'date_desc');
      const qs = params.toString();
      const url = qs ? `/api/expenses?${qs}` : '/api/expenses';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch {
      setErrorMessage('Could not load expenses. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch on mount, on filter/sort change, and on 'expense:created'.
  // The listener closes over the current filter/sort; this effect rebinds
  // whenever they change, so the listener never reads stale values.
  // Note: if a filter is active and the new expense doesn't match it, the
  // refetched list correctly excludes it — we trust the server's filter.
  useEffect(() => {
    fetchExpenses(selectedCategory, sortBy);
    const onCreated = () => fetchExpenses(selectedCategory, sortBy);
    window.addEventListener('expense:created', onCreated);
    return () => window.removeEventListener('expense:created', onCreated);
  }, [fetchExpenses, selectedCategory, sortBy]);

  // Categories come from the currently-fetched set. We also force-include
  // the selected category so the <select> always has a matching <option>
  // even when the filter returns zero rows.
  const uniqueCategories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean));
    if (selectedCategory) set.add(selectedCategory);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses, selectedCategory]);

  const selectClass =
    'text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  const showFilteredEmpty =
    !isLoading && !errorMessage && expenses.length === 0 && selectedCategory !== '';
  const showUnfilteredEmpty =
    !isLoading && !errorMessage && expenses.length === 0 && selectedCategory === '';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">Expenses</h2>
          {!isLoading && !errorMessage && expenses.length > 0 && (
            <span className="text-xs text-gray-500">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <select
            aria-label="Filter by category"
            className={selectClass}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            aria-label="Sort"
            className={selectClass}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Newest first (added)</option>
            <option value="date_desc">Newest first (date)</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">Loading expenses...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="text-sm text-red-600">
          {errorMessage}{' '}
          <button
            type="button"
            onClick={() => fetchExpenses(selectedCategory, sortBy)}
            className="text-blue-600 underline ml-1"
          >
            Retry
          </button>
        </div>
      )}

      {showUnfilteredEmpty && (
        <div className="text-sm text-gray-500 text-center py-6">
          No expenses yet. Add your first expense above.
        </div>
      )}

      {showFilteredEmpty && (
        <div className="text-sm text-gray-500 text-center py-6">
          No expenses match this filter.{' '}
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className="text-blue-600 underline ml-1"
          >
            Clear filter
          </button>
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
