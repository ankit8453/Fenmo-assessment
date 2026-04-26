const MAX_AMOUNT = 99999999.99;
const MAX_CATEGORY_LEN = 50;
const MAX_DESCRIPTION_LEN = 500;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and normalizes an expense input object.
 *
 * @param {object} input - May contain { amount, category, description, date }.
 * @returns {{ valid: boolean, errors: string[], normalized: { amount: string, category: string, description: string|null, date: string } | null }}
 *   When valid, `normalized` contains cleaned values ready for DB insert
 *   (amount is a string with exactly 2 decimal places, description is null when empty/missing).
 *   When invalid, `normalized` is null and `errors` lists every failure.
 *   This function never throws.
 */
export function validateExpense(input) {
  const errors = [];
  const src = input && typeof input === 'object' ? input : {};

  // amount
  let normalizedAmount = null;
  const rawAmount = src.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    errors.push('Amount is required');
  } else {
    const amountStr = typeof rawAmount === 'number' ? String(rawAmount) : rawAmount;
    if (typeof amountStr !== 'string' || !AMOUNT_RE.test(amountStr)) {
      errors.push('Amount must be a positive number with up to 2 decimal places');
    } else {
      const num = Number(amountStr);
      if (!(num > 0)) {
        errors.push('Amount must be a positive number with up to 2 decimal places');
      } else if (num > MAX_AMOUNT) {
        errors.push('Amount is too large');
      } else {
        normalizedAmount = num.toFixed(2);
      }
    }
  }

  // category
  let normalizedCategory = null;
  const rawCategory = src.category;
  if (rawCategory === undefined || rawCategory === null || (typeof rawCategory === 'string' && rawCategory.trim() === '')) {
    errors.push('Category is required');
  } else if (typeof rawCategory !== 'string') {
    errors.push('Category is required');
  } else {
    const trimmed = rawCategory.trim();
    if (trimmed.length > MAX_CATEGORY_LEN) {
      errors.push('Category must be 50 characters or fewer');
    } else {
      normalizedCategory = trimmed;
    }
  }

  // description (optional)
  let normalizedDescription = null;
  const rawDescription = src.description;
  if (rawDescription !== undefined && rawDescription !== null) {
    if (typeof rawDescription !== 'string') {
      errors.push('Description must be a string');
    } else {
      const trimmed = rawDescription.trim();
      if (trimmed.length > MAX_DESCRIPTION_LEN) {
        errors.push('Description must be 500 characters or fewer');
      } else {
        normalizedDescription = trimmed === '' ? null : trimmed;
      }
    }
  }

  // date
  let normalizedDate = null;
  const rawDate = src.date;
  if (rawDate === undefined || rawDate === null || rawDate === '') {
    errors.push('Date is required and must be in YYYY-MM-DD format');
  } else if (typeof rawDate !== 'string' || !DATE_RE.test(rawDate)) {
    errors.push('Date is required and must be in YYYY-MM-DD format');
  } else {
    // Confirm it's a real calendar date (e.g. reject 2024-02-30).
    const [y, m, d] = rawDate.split('-').map(Number);
    const asDate = new Date(Date.UTC(y, m - 1, d));
    const realCalendarDate =
      asDate.getUTCFullYear() === y &&
      asDate.getUTCMonth() === m - 1 &&
      asDate.getUTCDate() === d;
    if (!realCalendarDate) {
      errors.push('Date is required and must be in YYYY-MM-DD format');
    } else {
      // Allow up to today + 1 day (UTC) to absorb timezone skew.
      const now = new Date();
      const maxAllowed = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      );
      if (asDate.getTime() > maxAllowed) {
        errors.push('Date cannot be in the future');
      } else {
        normalizedDate = rawDate;
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      amount: normalizedAmount,
      category: normalizedCategory,
      description: normalizedDescription,
      date: normalizedDate,
    },
  };
}
