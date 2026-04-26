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

  // Per-category breakdown for the mini visualization. Uses parseFloat sums
  // (acceptable for visualization only — the authoritative total still comes
  // from the API).
  const categoryBreakdown = useMemo(() => {
    if (expenses.length === 0) return [];
    const totals = new Map();
    let overall = 0;
    for (const e of expenses) {
      const amt = parseFloat(e.amount);
      if (!Number.isFinite(amt)) continue;
      totals.set(e.category, (totals.get(e.category) || 0) + amt);
      overall += amt;
    }
    if (overall <= 0) return [];
    return Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.min(100, (amount / overall) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const showCategoryBreakdown = expenses.length >= 2 && categoryBreakdown.length >= 2;

  const selectClass =
    'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex items-baseline">
          <h2 className="text-xl font-semibold text-gray-900">Expenses</h2>
          {!isFetching && !errorMessage && expenses.length > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
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
        <div className="py-8 text-center text-sm text-gray-500">Loading expenses...</div>
      )}

      {!isFetching && errorMessage && (
        <div className="text-sm text-red-600 py-4">
          {errorMessage}{' '}
          <button
            type="button"
            onClick={() => fetchExpenses(selectedCategory, sortBy)}
            className="text-emerald-600 underline ml-1"
          >
            Retry
          </button>
        </div>
      )}

      {!showFullLoader && !errorMessage && (
        <div className={`transition-opacity duration-200 ${dimDuringRefetch ? 'opacity-60' : ''}`}>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg px-4 py-4 mb-5 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">
              {selectedCategory ? (
                <>
                  Total (<span className="font-semibold text-emerald-700">{selectedCategory}</span>)
                </>
              ) : (
                'Total'
              )}
            </span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              <span className="text-gray-500 mr-1">₹</span>{formatINR(total)}
            </span>
          </div>

          {showUnfilteredEmpty && (
            <div className="py-12 text-center text-gray-500 text-sm">
              No expenses yet. Add your first expense above.
            </div>
          )}

          {showFilteredEmpty && (
            <div className="py-12 text-center text-gray-500 text-sm">
              No expenses match this filter.{' '}
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className="text-emerald-600 underline ml-1"
              >
                Clear filter
              </button>
            </div>
          )}

          {showContent && showCategoryBreakdown && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Spending by category
              </h3>
              <div className="space-y-2">
                {categoryBreakdown.map((row) => (
                  <div key={row.category} className="flex items-center gap-3">
                    <div className="text-sm text-gray-700 w-24 truncate">{row.category}</div>
                    <div className="h-2 bg-gray-100 rounded-full flex-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900 w-24 text-right tabular-nums">
                      <span className="text-gray-500 mr-1">₹</span>{formatINR(row.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showContent && (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-emerald-300 hover:shadow-sm transition-all duration-1000 ${
                    highlightedId === e.id ? 'ring-2 ring-emerald-200' : ''
                  }`}
                >
                  <div className="flex flex-col shrink-0">
                    <div className="text-xs text-gray-500">{formatDate(e.date)}</div>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full mt-1 w-fit">
                      {e.category}
                    </span>
                  </div>
                  <div className="flex-1 text-sm text-gray-700 min-w-0 truncate">
                    {e.description ? e.description : <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 tabular-nums whitespace-nowrap shrink-0">
                    <span className="text-gray-500 mr-1">₹</span>{formatINR(e.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
