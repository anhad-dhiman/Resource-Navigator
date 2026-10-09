// Rule-based stand-in for the AI "interpret intent" step. It returns the same
// shape the AI step will ({categories, keywords}), so aiService can replace it
// later without changes to routes or searchService.

/** Words that point to a service_type. Keys must match service_type values in the data. */
const CATEGORY_TERMS = {
  Housing: [
    'housing',
    'house',
    'home',
    'homeless',
    'homelessness',
    'shelter',
    'rent',
    'evicted',
    'eviction',
    'apartment',
    'sleep',
    'street',
    'roof',
  ],
  Food: [
    'food',
    'hungry',
    'hunger',
    'meal',
    'meals',
    'groceries',
    'grocery',
    'eat',
    'eating',
    'hamper',
    'kitchen',
    'foodbank',
  ],
  'Legal Aid': [
    'legal',
    'lawyer',
    'law',
    'court',
    'landlord',
    'tenancy',
    'immigration',
    'refugee',
    'rights',
    'divorce',
    'custody',
    'lawsuit',
    'advice',
  ],
  Health: [
    'health',
    'doctor',
    'clinic',
    'medical',
    'sick',
    'dental',
    'dentist',
    'nurse',
    'mental',
    'counselling',
    'counseling',
    'crisis',
    'medicine',
    'pharmacy',
  ],
  'Senior Support': ['senior', 'seniors', 'elderly', 'older', 'retired', 'pension', 'aging', 'grandparent'],
};

const STOPWORDS = new Set(
  `a about am an and any are as at be been but by can cant could do does dont for from get
  got have having help i im ive in is it its just me my need needs no not of on or our out
  please so some that the their them there they this to too up very was we what where which
  who will with would you your running low pay paying find looking near`.split(/\s+/),
);

const TERM_TO_CATEGORY = new Map(
  Object.entries(CATEGORY_TERMS).flatMap(([cat, terms]) => terms.map((t) => [t, cat])),
);

const MAX_KEYWORDS = 10;

/**
 * Extracts service categories and search keywords from a plain-language query.
 * Keywords contain only [a-z0-9], so they are safe to join into a tsquery.
 * @param {string} query Already validated query text.
 * @returns {{categories: string[], keywords: string[]}}
 */
export function interpretQuery(query) {
  const tokens = query
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  const categories = [...new Set(tokens.map((t) => TERM_TO_CATEGORY.get(t)).filter(Boolean))];
  const keywords = [...new Set(tokens)].slice(0, MAX_KEYWORDS);
  return { categories, keywords };
}
