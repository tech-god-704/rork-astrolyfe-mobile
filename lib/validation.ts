/**
 * Input validation helpers for forms and API calls.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Validate and parse a birth date string (YYYY-MM-DD).
 * Returns null if invalid.
 */
export function parseAndValidateBirthDate(
  dateStr: string,
): { day: number; month: number; year: number } | null {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Verify the date is actually valid (e.g., Feb 30 is not)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

/**
 * Normalize a birth date to canonical YYYY-MM-DD.
 *
 * The web quiz funnel stores MM/DD/YYYY (e.g. "07/28/1997") while the app and the
 * natal chart parser both assume YYYY-MM-DD, so funnel dates must be converted on
 * the way in. Returns null if the value isn't a real calendar date.
 */
export function normalizeBirthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  const slashed = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const canonical = slashed
    ? `${slashed[3]}-${slashed[1].padStart(2, '0')}-${slashed[2].padStart(2, '0')}`
    : trimmed;

  return parseAndValidateBirthDate(canonical) ? canonical : null;
}

/**
 * Validate geographic coordinates.
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    isFinite(lat) && isFinite(lon)
  );
}

/**
 * Validate timezone offset (-12 to +14).
 */
export function isValidTimezone(tzone: number): boolean {
  return typeof tzone === 'number' && tzone >= -12 && tzone <= 14 && isFinite(tzone);
}

/**
 * Returns a human-readable validation error for a birth date string, or null if valid.
 */
export function getBirthDateError(dateStr: string): string | null {
  if (!dateStr.trim()) return null; // empty is ok (optional)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return 'Please use YYYY-MM-DD format';
  }
  if (!parseAndValidateBirthDate(dateStr)) {
    return 'Invalid date';
  }
  return null;
}

/**
 * Returns a human-readable validation error for a password, or null if valid.
 */
export function getPasswordError(password: string): string | null {
  if (password.length < 6) return 'Must be at least 6 characters';
  return null;
}
