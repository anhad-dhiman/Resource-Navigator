# Resource Navigator

Community Resource Navigator for Metro Vancouver. Residents describe a need in plain
language and get verified local services (food, housing, legal aid, health, senior support).
PostgreSQL is the single source of truth. Every result is a verified database record.

This is the first backend build: a JSON API with database-first search. It does **not**
include the AI integration, admin features or the React frontend yet.

- `server/`: Express API ([API reference](docs/api.md), [schema](docs/schema.md))
- `docs/`: API and schema documentation

## Run locally

Requires Node.js 20+ and PostgreSQL 14+ (local, Docker, or a Supabase project).

```bash
cd server
npm install
cp .env.example .env          # set DATABASE_URL (and DATABASE_SSL=true for Supabase)
npm run db:migrate            # create tables, enums, indexes and the public_resources view
npm run db:seed               # load the verified records
npm run dev                   # http://localhost:3000
```

Try it:

```bash
curl -X POST http://localhost:3000/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "I cant pay rent and Im running low on food", "city": "Vancouver"}'
```

## Checks

```bash
npm run lint
npm run format:check
npm test                                          # API and unit tests
TEST_DATABASE_URL=postgresql://... npm test       # also run DB integration tests (resets that DB)
```
