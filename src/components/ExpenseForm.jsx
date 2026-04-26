import { useState } from 'react';

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const initialForm = {
  amount: '',
  category: '',
  description: '',
  date: todayLocal(),
};

export default function ExpenseForm() {
  const [form, setForm] = useState(initialForm);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: wire to POST /api/expenses with idempotency key in next step
    console.log(form);
  }

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
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
            value={form.date}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
}
