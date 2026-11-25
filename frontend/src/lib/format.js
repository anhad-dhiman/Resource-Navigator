const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });

/**
 * Formats a review timestamp as a date, e.g. "Sep 15, 2026".
 * Uses UTC so a date stored as midnight UTC doesn't show as the previous day in Vancouver.
 */
export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

/** "https://www.foodbank.bc.ca/path" → "foodbank.bc.ca" */
export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Only allow http(s) links from the database to be rendered as clickable. */
export function safeUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** "604-876-3601" → "tel:6048763601" */
// A North American number: optional leading 1, then 3-3-4 digits with any separators.
const PHONE_NUMBER = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

/**
 * "604-876-3601" → "tel:6048763601". When a field holds more than one number
 * ("604-660-3511 (toll-free 1-888-664-3344)"), the first one is dialled.
 */
export function telHref(phone) {
  const match = (phone || '').match(PHONE_NUMBER);
  const digits = match ? match[0].replace(/[^\d+]/g, '') : '';
  return digits ? `tel:${digits}` : null;
}

/** Google Maps search link for a resource's address. */
export function directionsUrl({ service_name, physical_address, city }) {
  if (!physical_address) return null;
  const q = [service_name, physical_address, city, 'BC'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
