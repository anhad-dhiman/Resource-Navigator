# Resource Navigator

Community Resource Navigator for Metro Vancouver. Residents describe a need in plain
language and get verified local services (food, housing, legal aid, health, senior support).
PostgreSQL is the single source of truth. Every result is a verified database record.

This is the backend: a JSON API with database-first, AI-assisted search, plus admin sign-in. It does
**not** include the admin review workflow yet ([admin tasks](docs/admin-tasks.md)). The React frontend is in [`../frontend`](../frontend/README.md).

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

### AI search (optional)

Search uses Google Gemini to interpret queries and explain matches, with Groq as the backup. Add
the keys to `.env`:

```
GEMINI_API_KEY=...   # https://aistudio.google.com/apikey (free tier)
GROQ_API_KEY=...     # https://console.groq.com/keys (free tier, optional backup)
```

Restart the server; its first log line lists the providers in use. With no keys, search still
works using PostgreSQL full-text matching, without explanations. On Gemini's free tier, Google
may use what you send to improve its products, so use the paid tier before real users.

### Admin sign-in

Add a `JWT_SECRET` to `.env` (at least 32 characters). Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create an account and sign in at http://localhost:5173/admin/login:

```bash
npm run admin:create -- --username yourname --role administrator
```

You'll be asked for the password (at least 12 characters); it isn't shown as you type.

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
