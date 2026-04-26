import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

// Format the API's total string for display only — keep the raw string in state
// as the source of truth (preserves NUMERIC precision).
function formatINR(amountStr) {
  const num = Number(amountStr);
  if (!Number.isFinite(num)) return amountStr;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState('0.00');
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [highlightedId, setHighlightedId] = useState(null);

  // Stash the id of a freshly-created expense (from the 'expense:created'
  // event) so we can highlight it once the refetch lands. Avoids spuriously
  // highlighting on filter/sort changes.
  const newlyCreatedIdRef = useRef(null);

  const fetchExpenses = useCallback(async (category, sort) => {
    setIsFetching(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (sort === 'date_desc') params.set('sort', 'date_desc');
      const qs = params.toString();
      const url = qs ? `/api/expenses?${qs}` : '/api/expenses';
      const res = await fetch(url);
      if (!res.ok) {
        // Server responded but not OK — distinct from a network failure.
        setErrorMessage('Could not load expenses. Please try again.');
        return;
      }
      const data = await res.json();
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
      setTotal(typeof data?.total === 'string' ? data.total : '0.00');
    } catch (err) {
      // fetch() throws TypeError on network failures.
      if (err && err.name === 'TypeError') {
        setErrorMessage('Network error. Check your connection.');
      } else {
        setErrorMessage('Could not load expenses. Please try again.');
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Re-fetch on mount, on filter/sort change, and on 'expense:created'.
  // The listener closes over the current filter/sort; this effect rebinds
  // whenever they change, so the listener never reads stale values.
  // Note: if a filter is active and the new expense doesn't match it, the
  // refetched list correctly excludes it — we trust the server's filter.
  useEffect(() => {
    fetchExpenses(selectedCategory, sortBy);
    const onCreated = (event) => {
      newlyCreatedIdRef.current = event?.detail?.id || null;
      fetchExpenses(selectedCategory, sortBy);
    };
    window.addEventListener('expense:created', onCreated);
    return () => window.removeEventListener('expense:created', onCreated);
  }, [fetchExpenses, selectedCategory, sortBy]);

  // After expenses update, briefly highlight the freshly-created row if it
  // appears in the new list. Filter/sort changes won't trigger this because
  // newlyCreatedIdRef is only set by the create event.
  useEffect(() => {
    const id = newlyCreatedIdRef.current;
    if (!id) return;
    if (expenses.some((e) => e.id === id)) {
      setHighlightedId(id);
      const t = setTimeout(() => setHighlightedId(null), 1000);
      newlyCreatedIdRef.current = null;
      return () => clearTimeout(t);
    }
    // New row was filtered out — nothing to highlight.
    newlyCreatedIdRef.current = null;
  }, [expenses]);

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

  // Show the full loader only when we have nothing to dim (initial load
  // or hard error retry). Mid-flight filter/sort refetches dim the existing
  // content instead.
  const showFullLoader = isFetching && expenses.length === 0 && !errorMessage;
  const showFilteredEmpty =
    !isFetching && !errorMessage && expenses.length === 0 && selectedCategory !== '';
  const showUnfilteredEmpty =
    !isFetching && !errorMessage && expenses.length === 0 && selectedCategory === '';
  const showContent = !errorMessage && expenses.length > 0;
  const dimDuringRefetch = isFetching && expenses.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">Expenses</h2>
          {!isFetching && !errorMessage && expenses.length > 0 && (
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

      {showFullLoader && (
        <div className="text-sm text-gray-500">Loading expenses...</div>
      )}

      {!isFetching && errorMessage && (
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

      {!showFullLoader && !errorMessage && (
        <div className={`transition-opacity duration-200 ${dimDuringRefetch ? 'opacity-60' : ''}`}>
          <div className="bg-gray-50 rounded-md px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">
              {selectedCategory ? `Total (${selectedCategory})` : 'Total'}
            </span>
            <span className="text-xl font-bold text-gray-900">
              ₹{formatINR(total)}
            </span>
          </div>

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

          {showContent && (
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
                    <tr
                      key={e.id}
                      className={`border-b border-gray-100 transition-colors duration-1000 ${
                        highlightedId === e.id ? 'bg-yellow-50' : ''
                      }`}
                    >
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
      )}
    </div>
  );
}
