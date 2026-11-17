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
     * Fallback search when no AI is available: PostgreSQL turns the query into
     * stemmed words (dropping its own English stop words), and a resource
     * matching ANY of them is returned, best text rank first.
     * @param {{query: string, city: string|null, limit: number}} params
     * @returns {Promise<object[]>}
     */
    async searchText({ query, city, limit }) {
      const { rows } = await pool.query(
        `WITH tq AS (
           SELECT to_tsquery('simple', string_agg(quote_literal(word), ' | ')) AS q
             FROM unnest(tsvector_to_array(to_tsvector('english', $1))) AS word
         )
         SELECT ${PUBLIC_COLUMNS}, ts_rank(${SEARCH_DOCUMENT}, tq.q) AS rank
           FROM public_resources, tq
          WHERE tq.q IS NOT NULL
            AND ${SEARCH_DOCUMENT} @@ tq.q
            AND ($2::text IS NULL OR lower(city) = lower($2))
          ORDER BY rank DESC, service_name
          LIMIT $3`,
        [query, city, limit],
      );
      return rows;
    },

    /**
     * Lists public resources, optionally filtered by city and service type (case-insensitive).
     * @param {{city: string|null, serviceType: string|null}} params
     * @returns {Promise<object[]>} Rows ordered by service type, then name.
     */
    async list({ city, serviceType }) {
      const { rows } = await pool.query(
        `SELECT ${PUBLIC_COLUMNS}
           FROM public_resources
          WHERE ($1::text IS NULL OR lower(city) = lower($1))
            AND ($2::text IS NULL OR lower(service_type) = lower($2))
          ORDER BY service_type, service_name`,
        [city, serviceType],
      );
      return rows;
    },

    /** @returns {Promise<string[]>} Distinct service types that have public resources. */
    async listServiceTypes() {
      const { rows } = await pool.query(
        'SELECT DISTINCT service_type FROM public_resources ORDER BY service_type',
      );
      return rows.map((r) => r.service_type);
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
