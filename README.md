# Resource Navigator
 
Community Resource Navigator for Metro Vancouver. Residents describe a need in plain
language, like *"I can't pay rent and I'm running low on food"*, and get verified local
services for food, housing, legal aid, health and senior support.
 
PostgreSQL is the single source of truth. AI helps interpret the query and explain matches,
but every result shown is a verified database record. The AI never invents a service.
 
## How it works
 
```
React frontend  ──JSON──▶  Express API  ──▶  PostgreSQL (verified records)
 (Vite, Tailwind)              │
                               └──▶  Gemini (Groq as backup): reads the query, explains matches
```
 
1. The user types a need and picks a city.
2. The backend uses AI to turn the text into structured search terms, then looks them up in
   the database. With no AI keys it falls back to PostgreSQL full-text search.
3. The matching verified records come back, with short explanations when AI is enabled.
## Repository layout
 
```
backend/
  server/          Express API: search, resources, cities, service types, admin auth
  docs/            API reference, database schema, admin tasks
  README.md        backend setup in detail
frontend/
  src/             React app: search, browse, resource detail, about/privacy, admin
  README.md        frontend setup in detail
```
 
## Tech stack
 
| Layer    | Tools                                                        |
| -------- | ------------------------------------------------------------ |
| Frontend | React (Vite), Tailwind CSS, Vitest + Testing Library         |
| Backend  | Node.js 20+, Express                                         |
| Database | PostgreSQL 14+ (local, Docker or Supabase)                   |
| AI       | Google Gemini, with Groq as backup (both optional)           |
| Auth     | Admin accounts with JWT in an httpOnly cookie                |
| Deploy   | Frontend on Vercel                                           |
 
## Quick start
 
You need Node.js 20+ and a PostgreSQL 14+ database.
 
**1. Backend** (terminal 1)
 
```bash
cd backend/server
npm install
cp .env.example .env          # set DATABASE_URL (and DATABASE_SSL=true for Supabase)
npm run db:migrate            # tables, enums, indexes and the public_resources view
npm run db:seed               # load the verified records
npm run dev                   # http://localhost:3000
```
 
**2. Frontend** (terminal 2)
 
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```
 
Open http://localhost:5173. Vite proxies `/api` and `/health` to the backend, so no CORS
setup is needed in development.
 
### Optional setup
 
Add these to `backend/server/.env` and restart the backend.
 
| Variable         | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `GEMINI_API_KEY` | AI query parsing and explanations ([get a key](https://aistudio.google.com/apikey)) |
| `GROQ_API_KEY`   | Backup AI provider ([get a key](https://console.groq.com/keys))      |
| `JWT_SECRET`     | Required for admin sign-in, at least 32 characters                   |
 
Generate a `JWT_SECRET`, then create an admin account:
 
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run admin:create -- --username yourname --role administrator
```
 
Staff then sign in at http://localhost:5173/admin/login.
 
> On Gemini's free tier, Google may use what you send to improve its products. Switch to
> the paid tier before real users search.
 
## Privacy
 
Search text is kept in memory only. The frontend never puts it in the URL, localStorage or
analytics. The admin session token lives in an httpOnly cookie that the frontend cannot read.
 
## Checks
 
Run these in both `backend/server` and `frontend`:
 
```bash
npm run lint
npm run format:check
npm test
```
 
The frontend also has `npm run build`. To include the backend's database integration tests,
set `TEST_DATABASE_URL` (this resets that database).
 
## Status
 
Done: public search and browse, AI-assisted search with full-text fallback, admin sign-in.
Not yet built: the admin review workflow ([admin tasks](backend/docs/admin-tasks.md)).
 
## More documentation
 
- [Backend README](backend/README.md): setup details, AI providers, admin accounts
- [Frontend README](frontend/README.md): JSON debug panel, structure, Vercel deployment
- [API reference](backend/docs/api.md)
- [Database schema](backend/docs/schema.md)
