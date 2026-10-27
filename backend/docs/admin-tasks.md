# Admin portal: review of the prototype and remaining tasks

This document reviews the admin prototype (`community-resource-navigator_2.zip`: a separate
`server/` and an HTML `frontend/`) against the Technology Stack and Software Development
documents. It also lists what still needs to be built.

## Summary

The prototype is **skeleton code**. It has a working login endpoint and a dashboard page whose
numbers and table are hard-coded placeholders. None of the review workflow (FR8, FR10, FR11)
was implemented.

The parts that worked (login, a protected dashboard, a way to check the session) have been
**rebuilt inside the main app**, following the report and the existing design:

| Prototype                                    | Now in the main app                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Separate Express server on port 5001         | `backend/server`, routes under `/api/admin/*`                             |
| `POST /api/admin/login`                      | `src/routes/admin.js` → `POST /api/admin/login`                           |
| `GET /api/admin/dashboard` (welcome message) | `GET /api/admin/me` (returns the signed-in account)                       |
| No way to create accounts                    | `npm run admin:create -- --username NAME --role moderator\|administrator` |
| Plain HTML/CSS login and dashboard           | React + Tailwind: `frontend/src/admin/` (`/admin/login`, `/admin`)        |

**Do not keep working in the prototype folders.** All new work goes into `backend/server` and
`frontend` in this repository, through pull requests.

## 1. Urgent: leaked credentials

The zip contained `server/.env` with the real Supabase database password and two JWT secrets.
Anyone who received the zip can access that database.

- [ ] Reset the Supabase database password (Project Settings → Database).
- [ ] Throw away both JWT secrets.
- [ ] Never share `.env` files in zips, chats or commits. `.env` is in `.gitignore`. Share a
      `.env.example` with placeholder values instead, as `backend/server/.env.example` does.

## 2. Problems in the prototype

These are already fixed in the rebuilt version. They are listed here so the same mistakes don't
come back in new code.

| #   | Problem in the prototype                                                                                            | Requirement (report)                                                     | How the main app does it                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 1   | Plain HTML/CSS/JS frontend with its own styling                                                                     | React (Vite) frontend, consistent components (Tech Stack §2, §3.1)       | React + Tailwind, same design as the public site                                           |
| 2   | Second, separate Express server (CommonJS, all routes in one file)                                                  | One backend; `routes/`, `services/`, `middleware/`, `db/` (Dev doc §3.1) | Admin code is in the existing server, split into route / service / repository / middleware |
| 3   | JWT returned in the response body and kept in `sessionStorage`, sent as a `Bearer` header                           | JWT in an **httpOnly cookie** (Tech Stack Table 5, Dev doc §4)           | `admin_session` cookie: `HttpOnly`, `SameSite=Strict`, `Path=/api/admin`, 1 hour           |
| 4   | Only `administrator` could get in                                                                                   | Administrator **and** moderator functions (Tech Stack Fig. 1, Table 5)   | Both roles sign in; `requireAdmin({ roles })` can restrict a route to one role             |
| 5   | `express-rate-limit` installed but not used, so login had no brute-force protection                                 | Rate limiting (Dev doc §4)                                               | 10 failed sign-ins per IP per 15 minutes                                                   |
| 6   | Unknown usernames returned faster than wrong passwords, revealing which usernames exist                             | Security checklist                                                       | A dummy hash is always compared, so both cases take the same time                          |
| 7   | No script to create admin accounts                                                                                  | Reviewer accounts in `admin_users` (Dev doc T4)                          | `npm run admin:create`: hidden password prompt, min 12 characters, bcrypt cost 12          |
| 8   | No tests, lint or formatting                                                                                        | Vitest + Supertest; ESLint + Prettier (Dev doc §3.2)                     | Tests cover login, cookie flags, roles, forged/expired tokens, rate limit and logout       |
| 9   | Unused dependencies (`bcrypt` and `bcryptjs` both installed; `cookie-parser` unused); a browser script in `server/` | Clean, reviewable code                                                   | Only the libraries that are used                                                           |
| 10  | Hard-coded URLs (`http://localhost:5001`, CORS `127.0.0.1:5500`)                                                    | Config from environment variables                                        | One API client (`frontend/src/api/client.js`); CORS from `CORS_ORIGINS`                    |
| 11  | Public `/api/db-test` endpoint                                                                                      | Error responses reveal no internals (Dev doc §4)                         | `/health` returns only `ok` or `unreachable`                                               |

What the prototype got right, and was kept: parameterized SQL against `admin_users` as the ERD
defines it, bcrypt hashing, a one-hour token expiry with the algorithm pinned to HS256, and
`helmet`.

**Checkpoint for the Supabase stage:** the prototype verified Supabase's TLS certificate
(`prod-ca-2021.crt` with `rejectUnauthorized: true`). That is the correct approach. Adopt it in
`src/db/pool.js` when we move to Supabase; the main app currently runs on local Postgres only.

## 3. Rules for new admin work

- **Frontend: React + Tailwind only**, in `frontend/src/admin/`. Match the existing design, not a
  new one: `slate` backgrounds and text, `blue-700` primary buttons, `rounded-2xl` white cards
  with `border-slate-200`, `lucide-react` icons, 44px minimum touch targets, and visible focus
  outlines. Reuse the existing components: `Badges.jsx`, `Status.jsx`, `CitySelect.jsx` and
  `SortSelect.jsx`.
- **All backend calls go through `frontend/src/api/client.js`** (add to `api.admin`). No `fetch`
  in components. No tokens in `localStorage` or `sessionStorage`: the cookie is sent
  automatically.
- **Backend: ES modules**. Put HTTP handling in `routes/`, rules in `services/`, SQL in `db/`.
  Protect every admin route with `requireAdmin(...)`. Use only parameterized queries, and throw
  `HttpError` for user-facing errors.
- **Never edit or delete old `resource_reviews` rows.** Each decision inserts a new row; the
  history is the audit trail, and the public view always uses the latest row.
- **Schema changes go in a new migration** (`src/db/migrations/002_*.sql`), never by editing
  `001_init.sql`. Update the ERD at the same time.
- Every pull request: `npm run lint`, `npm run format:check` and `npm test` pass in both
  packages; new endpoints are added to `docs/api.md`; and tests are included.

## 4. Remaining tasks

These were **not implemented** in the prototype and still need to be built.

### Decisions needed from the team first

1. **The seven checklist items.** The report refers to a "7-point checklist" but never lists the
   items. A suggested starting point: organization exists and is active; address; phone; hours;
   eligibility; official URL; evidence source recorded.
2. **Where checklist results are stored.** The ERD has no checklist column. Options: a new
   `checklist jsonb` column on `resource_reviews` (a migration and an ERD change), or structured
   text inside `verification_evidence`.
3. **Moderator vs administrator.** Suggested: moderators review (approve, reject, flag);
   administrators can also edit resource details and create accounts.

### A. Dashboard counts: `GET /api/admin/stats`

Counts of resources by **latest** review status (Pending, Verified, Rejected, Flagged), plus how
many Verified resources are overdue for review. These replace the `—` placeholders in
`AdminDashboard.jsx`.

### B. Review queue: `GET /api/admin/reviews?status=Pending`

Resources whose latest review has the given status (default: Pending and Flagged), with the
resource fields and the latest review: who reviewed it, when, evidence and rejection reason.
Show this as a table on the dashboard, with a "Review" action for each row.

### C. Record a decision (FR10): `POST /api/admin/resources/:id/reviews`

```json
{
  "verification_status": "Verified",
  "checklist": { "...": true },
  "verification_evidence": "211 BC listing and official contact page, Nov 2026",
  "rejection_reason": null
}
```

- Inserts a new `resource_reviews` row with `reviewed_by = req.admin.user_id` and
  `reviewed_at = now()`.
- `Verified` requires every checklist item to be true and non-empty evidence, and sets
  `next_review_due = reviewed_at + 1 month` (FR11).
- `Rejected` requires a `rejection_reason`.
- Frontend: a review page at `/admin/resources/:id` showing the full record, the checklist as
  labelled checkboxes, an evidence field and the decision buttons.

### D. Monthly review list (FR11): `GET /api/admin/reviews/due`

Verified resources whose latest `next_review_due` is today or earlier, oldest first. Show it as a
"Due for review" section on the dashboard.

### E. Edit resource details (administrator only, pending decision 3)

`PATCH /api/admin/resources/:id`, protected with
`requireAdmin({ authService, roles: ['administrator'] })`. Validate every field, and consider
whether an edit should put the resource back to Pending.

### Out of scope for now

FR8 (public "suggest a resource" and "report a problem" forms) is deferred in the Software
Development document. Don't build it until the team agrees.

## 5. Running it locally

```bash
cd backend/server
# add JWT_SECRET to .env (see .env.example)
npm run admin:create -- --username yourname --role administrator
npm run dev
```

```bash
cd frontend
npm run dev     # sign in at http://localhost:5173/admin/login
```

Relevant files:

- Backend: `src/routes/admin.js`, `src/services/authService.js`, `src/middleware/requireAdmin.js`,
  `src/db/adminRepository.js`, `scripts/createAdmin.js`, `tests/admin.test.js`
- Frontend: `src/admin/` (`AdminLogin.jsx`, `AdminDashboard.jsx`, `AdminLayout.jsx`,
  `RequireAdmin.jsx`) and `src/api/client.js` (`api.admin`)
