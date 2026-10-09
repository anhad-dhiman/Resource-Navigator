// All SQL is parameterized; user input is never concatenated into a query.

const PUBLIC_COLUMNS = `
  resource_id, service_type, service_name, description, physical_address, city,
  contact_phone, official_url, operating_hours, eligibility_criteria,
  language_support, verification_status, last_reviewed_at`;

const SEARCH_DOCUMENT = `to_tsvector('english',
  service_type || ' ' || service_name || ' ' ||
  coalesce(description, '') || ' ' || coalesce(eligibility_criteria, ''))`;

/**
 * Data access for public (latest review = Verified) resources.
 * @param {import('pg').Pool} pool
 */
export function createResourceRepository(pool) {
  return {
    /**
     * Finds public resources matching any category or any keyword.
     * @param {{categories: string[], keywords: string[], city: string|null, limit: number}} params
     * @returns {Promise<object[]>} Rows ordered by category match, then text rank.
     */
    async search({ categories, keywords, city, limit }) {
      const tsquery = keywords.join(' | ');
      const { rows } = await pool.query(
        `SELECT ${PUBLIC_COLUMNS},
                (service_type = ANY($1::text[])) AS category_match,
                ts_rank(${SEARCH_DOCUMENT}, to_tsquery('english', $2)) AS rank
           FROM public_resources
          WHERE (service_type = ANY($1::text[])
                 OR ($2 <> '' AND ${SEARCH_DOCUMENT} @@ to_tsquery('english', $2)))
            AND ($3::text IS NULL OR lower(city) = lower($3))
          ORDER BY category_match DESC, rank DESC, service_name
          LIMIT $4`,
        [categories, tsquery, city, limit],
      );
      return rows;
    },

    /**
     * @param {number} id
     * @returns {Promise<object|null>} The resource, or null if missing or not public.
     */
    async findById(id) {
      const { rows } = await pool.query(
        `SELECT ${PUBLIC_COLUMNS} FROM public_resources WHERE resource_id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    /** @returns {Promise<string[]>} Distinct cities that have public resources. */
    async listCities() {
      const { rows } = await pool.query('SELECT DISTINCT city FROM public_resources ORDER BY city');
      return rows.map((r) => r.city);
    },

    /** @returns {Promise<void>} Resolves if the database answers. */
    async ping() {
      await pool.query('SELECT 1');
    },
  };
}
