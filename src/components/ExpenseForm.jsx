import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getInitialFormState() {
  return {
    amount: '',
    category: '',
    description: '',
    date: todayLocal(),
  };
}

export default function ExpenseForm({ onCreated }) {
  const [form, setForm] = useState(getInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Held outside React state so it survives re-renders without triggering them.
  // The key sticks across retries (network/5xx) and resets on success or 4xx.
  const idempotencyKeyRef = useRef(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear stale success once the user starts editing again.
    if (successMessage) setSuccessMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return; // defense in depth — button is also disabled
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = uuidv4();
    }
    const key = idempotencyKeyRef.current;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify(form),
      });

      if (res.status === 201 || res.status === 200) {
        const newExpense = await res.json();
        setForm(getInitialFormState());
        idempotencyKeyRef.current = null;
        setSuccessMessage('Expense added successfully');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Decouple the form from the list — the Expenses list listens for this
        // and refetches without the form needing to know it exists.
        window.dispatchEvent(new CustomEvent('expense:created', { detail: newExpense }));
        if (typeof onCreated === 'function') {
          onCreated(newExpense);
        }
      } else if (res.status >= 400 && res.status < 500) {
        // Bad input — this is a new attempt, not a retry. Drop the key.
        idempotencyKeyRef.current = null;
        let msg = 'Invalid input.';
        try {
          const data = await res.json();
          if (Array.isArray(data?.details) && data.details.length) {
            msg = data.details.join(' | ');
          } else if (data?.error) {
            msg = data.error;
          }
        } catch {
          /* keep default message */
        }
        setErrorMessage(msg);
      } else {
        // 5xx — keep the key so the next attempt is a true idempotent retry.
        setErrorMessage('Server error. Please try again in a moment.');
      }
    } catch {
      // fetch threw — almost always a network failure. Keep the key for retry.
      setErrorMessage('Network error. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Expense</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="amount" className={labelClass}>Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            disabled={isSubmitting}
            value={form.amount}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>Category</label>
          <input
            id="category"
            name="category"
            type="text"
            maxLength="50"
            placeholder="e.g., Food, Transport, Bills"
            required
            disabled={isSubmitting}
            value={form.category}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Description (optional)</label>
          <textarea
            id="description"
            name="description"
            rows="2"
            maxLength="500"
            placeholder="Add a note about this expense"
            disabled={isSubmitting}
            value={form.description}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="date" className={labelClass}>Date</label>
          <input
            id="date"
            name="date"
            type="date"
            required
            disabled={isSubmitting}
            value={form.date}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-blue-600 text-white py-2 rounded-md font-medium transition ${
            isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>

        {errorMessage && (
          <div className="text-sm text-red-600 mt-2">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="text-sm text-green-600 mt-2">{successMessage}</div>
        )}
      </form>
    </div>
  );
}
