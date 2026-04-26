import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { validateExpense } from '../lib/validation';

// Predefined categories. 'Other' triggers a custom text input.
const PREDEFINED_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Groceries',
  'Other',
];

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

const initialFieldErrors = { amount: null, category: null, description: null, date: null };
const initialTouched = { amount: false, category: false, description: false, date: false };

function truncateKey(key) {
  if (typeof key !== 'string' || key.length < 14) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export default function ExpenseForm({ onCreated }) {
  const [form, setForm] = useState(getInitialFormState);
  const [categoryMode, setCategoryMode] = useState('predefined');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Inline validation state. Errors only display once a field has been touched
  // (blurred at least once) or after a submit attempt.
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [touched, setTouched] = useState(initialTouched);

  // Idempotency UI state — purely visibility on top of the existing ref/header
  // logic. Generation/reuse rules are unchanged.
  const [submittingKey, setSubmittingKey] = useState(null);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);
  const [lastSubmittedKey, setLastSubmittedKey] = useState(null);

  const idempotencyKeyRef = useRef(null);

  function revalidateField(name, nextForm) {
    const result = validateExpense(nextForm);
    setFieldErrors((prev) => ({ ...prev, [name]: result.fieldErrors[name] }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    if (successMessage) {
      setSuccessMessage('');
      setLastSubmittedKey(null);
    }
    if (touched[name]) revalidateField(name, nextForm);
  }

  function handleBlur(e) {
    const { name } = e.target;
    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
    revalidateField(name, form);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    // Run client-side validation first. If invalid, mark every field touched
    // so all errors render at once and block the network call.
    const result = validateExpense(form);
    if (!result.valid) {
      setTouched({ amount: true, category: true, description: true, date: true });
      setFieldErrors(result.fieldErrors);
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLastSubmittedKey(null);

    // Determine retry-vs-fresh BEFORE we touch the ref, so the panel can
    // render the correct badge for this attempt.
    const isRetry = idempotencyKeyRef.current !== null;
    setIsRetryAttempt(isRetry);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = uuidv4();
    }
    const key = idempotencyKeyRef.current;
    setSubmittingKey(key);
    setIsSubmitting(true);

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
        setCategoryMode('predefined');
        setFieldErrors(initialFieldErrors);
        setTouched(initialTouched);
        idempotencyKeyRef.current = null;
        setIsRetryAttempt(false);
        setLastSubmittedKey(key);
        setSuccessMessage('Expense added successfully');
        setTimeout(() => {
          setSuccessMessage('');
          setLastSubmittedKey(null);
        }, 3000);

        // Decouple the form from the list — the Expenses list listens for this
        // and refetches without the form needing to know it exists.
        window.dispatchEvent(new CustomEvent('expense:created', { detail: newExpense }));
        if (typeof onCreated === 'function') {
          onCreated(newExpense);
        }
      } else if (res.status >= 400 && res.status < 500) {
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
        setErrorMessage('Server error. Please try again in a moment.');
      }
    } catch {
      setErrorMessage('Network error. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      setSubmittingKey(null);
    }
  }

  const baseInputClass =
    'w-full border rounded-lg px-3.5 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';
  const okFieldClass = 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
  const errFieldClass = 'border-red-300 focus:ring-red-500 focus:border-red-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  const showErr = (name) => touched[name] && fieldErrors[name];
  const fieldClass = (name) => `${baseInputClass} ${showErr(name) ? errFieldClass : okFieldClass}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Add Expense</h2>
      <p className="text-sm text-gray-500 mb-6">
        Fill in the details to log a new expense.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="amount" className={labelClass}>Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
              ₹
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
              value={form.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`${fieldClass('amount')} pl-7`}
            />
          </div>
          {showErr('amount') && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.amount}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>Category</label>
          <select
            id="category"
            name="category"
            disabled={isSubmitting}
            value={
              categoryMode === 'custom'
                ? 'Other'
                : PREDEFINED_CATEGORIES.includes(form.category)
                ? form.category
                : ''
            }
            onChange={(e) => {
              const v = e.target.value;
              const nextForm = { ...form };
              if (v === 'Other') {
                setCategoryMode('custom');
                nextForm.category = '';
              } else {
                setCategoryMode('predefined');
                nextForm.category = v;
              }
              setForm(nextForm);
              if (successMessage) setSuccessMessage('');
              if (touched.category) revalidateField('category', nextForm);
            }}
            onBlur={handleBlur}
            className={`${fieldClass('category')} pr-8`}
          >
            <option value="" disabled>Select a category</option>
            {PREDEFINED_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {categoryMode === 'custom' && (
            <div className="mt-3">
              <label htmlFor="customCategory" className={labelClass}>
                Custom category
              </label>
              <input
                id="customCategory"
                name="category"
                type="text"
                maxLength="50"
                placeholder="Enter a category name"
                disabled={isSubmitting}
                value={form.category}
                onChange={handleChange}
                onBlur={handleBlur}
                className={fieldClass('category')}
              />
              <div className="text-xs text-gray-500 mt-1">Max 50 characters</div>
              <button
                type="button"
                onClick={() => {
                  const nextForm = { ...form, category: '' };
                  setCategoryMode('predefined');
                  setForm(nextForm);
                  if (touched.category) revalidateField('category', nextForm);
                }}
                className="text-sm text-indigo-600 underline mt-1"
              >
                ← Choose from list
              </button>
            </div>
          )}

          {showErr('category') && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.category}</p>
          )}
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
            onBlur={handleBlur}
            className={fieldClass('description')}
          />
          {showErr('description') && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
          )}
        </div>

        <div>
          <label htmlFor="date" className={labelClass}>Date</label>
          <input
            id="date"
            name="date"
            type="date"
            disabled={isSubmitting}
            value={form.date}
            onChange={handleChange}
            onBlur={handleBlur}
            className={fieldClass('date')}
          />
          {showErr('date') && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.date}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>

        {isSubmitting && submittingKey && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 mt-3">
            <div className="text-xs text-indigo-900 font-medium">
              {isRetryAttempt && (
                <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded mr-2 font-medium">
                  Retry
                </span>
              )}
              Submission ID:
            </div>
            <div className="text-xs text-indigo-700 font-mono">
              {truncateKey(submittingKey)}
            </div>
            <div className="text-xs text-indigo-600 italic mt-1">
              If this submission is retried, the same ID is reused — your expense won't be duplicated.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-800 mt-2">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-2">
            <div className="text-sm text-green-800">{successMessage}</div>
            {lastSubmittedKey && (
              <div className="text-xs text-green-700/80 font-mono mt-0.5">
                Saved with ID: {truncateKey(lastSubmittedKey)}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
