-- Schema from the project ERD: verified_resources, resource_reviews, admin_users.

CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Rejected', 'Flagged');
CREATE TYPE admin_role AS ENUM ('administrator', 'moderator');

CREATE TABLE verified_resources (
  resource_id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_type         varchar NOT NULL,
  service_name         varchar NOT NULL,
  description          text,
  physical_address     varchar,
  city                 varchar NOT NULL,
  contact_phone        varchar,
  official_url         varchar,
  operating_hours      text,
  eligibility_criteria text,
  language_support     text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  user_id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      varchar NOT NULL UNIQUE,
  password_hash varchar NOT NULL,
  role          admin_role NOT NULL
);

CREATE TABLE resource_reviews (
  review_id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resource_id           integer NOT NULL REFERENCES verified_resources (resource_id) ON DELETE CASCADE,
  reviewed_by           integer REFERENCES admin_users (user_id),
  reviewed_at           timestamptz,
  verification_status   verification_status NOT NULL,
  verification_evidence text,
  next_review_due       date,
  rejection_reason      text
);

CREATE INDEX verified_resources_city_idx ON verified_resources (lower(city));
CREATE INDEX verified_resources_service_type_idx ON verified_resources (service_type);
CREATE INDEX resource_reviews_latest_idx ON resource_reviews (resource_id, reviewed_at DESC, review_id DESC);

-- Full-text index; the expression must match the one used in search queries.
CREATE INDEX verified_resources_search_idx ON verified_resources USING gin (
  to_tsvector('english',
    service_type || ' ' || service_name || ' ' ||
    coalesce(description, '') || ' ' || coalesce(eligibility_criteria, ''))
);

-- FR9: the public sees a resource only when its latest review is Verified.
CREATE VIEW public_resources AS
SELECT r.*, lr.reviewed_at AS last_reviewed_at, lr.verification_status
FROM verified_resources r
JOIN (
  SELECT DISTINCT ON (resource_id) resource_id, reviewed_at, verification_status
  FROM resource_reviews
  ORDER BY resource_id, reviewed_at DESC NULLS LAST, review_id DESC
) lr ON lr.resource_id = r.resource_id
WHERE lr.verification_status = 'Verified';
