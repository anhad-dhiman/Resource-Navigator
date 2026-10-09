# Database schema

Defined in `server/src/db/migrations/001_init.sql`, following the project ERD.

| Table                | Purpose                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `verified_resources` | One row per service: name, type, address, city, phone, URL, hours, eligibility, languages                   |
| `resource_reviews`   | Verification history; many per resource. `verification_status` enum: Pending, Verified, Rejected, Flagged   |
| `admin_users`        | Reviewer accounts (`admin_role` enum: administrator, moderator). Created now, used once admin features land |

`public_resources` is a view that joins each resource to its **latest** review
(by `reviewed_at`, then `review_id`) and keeps only those whose latest status is
`Verified`. Every public query reads from this view, so pending, flagged and
rejected resources never reach users (FR9).

Indexes: `lower(city)`, `service_type`, the latest-review lookup, and a GIN full-text
index over service type, name, description and eligibility.

## Seed data

`server/src/db/seeds/resources.json` holds the team's verified records as
`{ "resource": {...}, "review": {...} }` pairs. `npm run db:seed` replaces all
resources and reviews with this file in one transaction.

It was generated from the research spreadsheet with
`server/scripts/convert_spreadsheet.py`, which:

- splits each row into a `verified_resources` row and a `resource_reviews` row
  (`last_reviewed_at` → `reviewed_at`; `reviewed_by` is left NULL until admin users exist);
- fills an empty `next_review_due` with `reviewed_at` + 1 month (monthly cycle, FR11);
- trims stray whitespace, non-breaking spaces and line breaks;
- strips the city and postal code out of addresses, since `city` is its own column;
- normalizes phone numbers to `604-555-1234`.
