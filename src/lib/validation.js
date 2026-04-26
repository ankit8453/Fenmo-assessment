// Mirror of /api/_lib/validation.js. Keep these in sync. Server validation is
// the source of truth — this exists only for inline UX feedback. The trade-off
// of duplication is documented in the README. For a larger codebase, this would
// move to a shared package.

const MAX_AMOUNT = 99999999.99;
const MAX_CATEGORY_LEN = 50;
const MAX_DESCRIPTION_LEN = 500;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateExpense(input) {
  const errors = [];
  const fieldErrors = { amount: null, category: null, description: null, date: null };
  const src = input && typeof input === 'object' ? input : {};

  function fail(field, msg) {
    errors.push(msg);
    if (fieldErrors[field] == null) fieldErrors[field] = msg;
  }

  // amount
  let normalizedAmount = null;
  const rawAmount = src.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    fail('amount', 'Amount is required');
  } else {
    const amountStr = typeof rawAmount === 'number' ? String(rawAmount) : rawAmount;
    if (typeof amountStr !== 'string' || !AMOUNT_RE.test(amountStr)) {
      fail('amount', 'Amount must be a positive number with up to 2 decimal places');
    } else {
      const num = Number(amountStr);
      if (!(num > 0)) {
        fail('amount', 'Amount must be a positive number with up to 2 decimal places');
      } else if (num > MAX_AMOUNT) {
        fail('amount', 'Amount is too large');
      } else {
        normalizedAmount = num.toFixed(2);
      }
    }
  }

  // category
  let normalizedCategory = null;
  const rawCategory = src.category;
  if (rawCategory === undefined || rawCategory === null || (typeof rawCategory === 'string' && rawCategory.trim() === '')) {
    fail('category', 'Category is required');
  } else if (typeof rawCategory !== 'string') {
    fail('category', 'Category is required');
  } else {
    const trimmed = rawCategory.trim();
    if (trimmed.length > MAX_CATEGORY_LEN) {
      fail('category', 'Category must be 50 characters or fewer');
    } else {
      normalizedCategory = trimmed;
    }
  }

  // description (optional)
  let normalizedDescription = null;
  const rawDescription = src.description;
  if (rawDescription !== undefined && rawDescription !== null) {
    if (typeof rawDescription !== 'string') {
      fail('description', 'Description must be a string');
    } else {
      const trimmed = rawDescription.trim();
      if (trimmed.length > MAX_DESCRIPTION_LEN) {
        fail('description', 'Description must be 500 characters or fewer');
      } else {
        normalizedDescription = trimmed === '' ? null : trimmed;
      }
    }
  }

  // date
  let normalizedDate = null;
  const rawDate = src.date;
  if (rawDate === undefined || rawDate === null || rawDate === '') {
    fail('date', 'Date is required and must be in YYYY-MM-DD format');
  } else if (typeof rawDate !== 'string' || !DATE_RE.test(rawDate)) {
    fail('date', 'Date is required and must be in YYYY-MM-DD format');
  } else {
    const [y, m, d] = rawDate.split('-').map(Number);
    const asDate = new Date(Date.UTC(y, m - 1, d));
    const realCalendarDate =
      asDate.getUTCFullYear() === y &&
      asDate.getUTCMonth() === m - 1 &&
      asDate.getUTCDate() === d;
    if (!realCalendarDate) {
      fail('date', 'Date is required and must be in YYYY-MM-DD format');
    } else {
      const now = new Date();
      const maxAllowed = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      );
      if (asDate.getTime() > maxAllowed) {
        fail('date', 'Date cannot be in the future');
      } else {
        normalizedDate = rawDate;
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, fieldErrors, normalized: null };
  }

  return {
    valid: true,
    errors: [],
    fieldErrors,
    normalized: {
      amount: normalizedAmount,
      category: normalizedCategory,
      description: normalizedDescription,
      date: normalizedDate,
    },
  };
}
