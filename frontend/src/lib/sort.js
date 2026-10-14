const byName = (a, b) => a.service_name.localeCompare(b.service_name);
const byReviewed = (a, b) =>
  new Date(b.verification?.last_reviewed_at ?? 0) - new Date(a.verification?.last_reviewed_at ?? 0);

/** Returns a sorted copy. Any other value (e.g. "relevance") keeps the backend's order. */
export function sortResources(resources, sort) {
  if (sort === 'name') return [...resources].sort(byName);
  if (sort === 'reviewed') return [...resources].sort(byReviewed);
  return resources;
}
