# Resource Navigator: frontend

React (Vite) and Tailwind CSS interface for the Community Resource Navigator. It talks to
the Express backend only through JSON requests. All calls live in `src/api/client.js`, so
the AI integration can change what the backend returns without touching the pages.

## Run locally

Start the backend first (see [`../backend/README.md`](../backend/README.md)) on port 3000. Then:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

In development, Vite proxies `/api` and `/health` to `http://localhost:3000`, so no CORS setup
is needed. To use a backend on another port: `BACKEND_URL=http://localhost:4000 npm run dev`.

### JSON panel

In `npm run dev`, a **JSON** button in the bottom-right corner shows the last request body and
response body, like Postman. Use it to check exactly what the frontend sends and receives.
It is hidden in production builds unless `VITE_SHOW_JSON=true`.

## Structure

```
src/
  api/client.js        every backend call (search, resources, cities, service types)
  context/             app state: selected city and the latest search (memory only)
  components/          Header, SearchBar, ResourceCard, badges, status messages, JSON panel
  pages/               Home (search), Resources (browse), ResourceDetail, About (incl. privacy)
  admin/               staff sign-in (/admin/login) and dashboard (/admin)
  lib/                 formatting, category colours, sorting, useApi hook
```

Privacy (FR12): the search text is kept in memory only. It is never put in the URL,
localStorage or analytics.

## Admin

Staff sign in at `/admin/login`. Create an account first with `npm run admin:create` in
`backend/server` (see the backend README). The session is an httpOnly cookie set by the
backend; the frontend never sees or stores the token. Passwords are masked in the JSON panel.

## Checks

```bash
npm run lint           # ESLint, including jsx-a11y accessibility rules
npm run format:check
npm test               # Vitest + Testing Library
npm run build
```

## Deploying (Vercel)

Set the project root to `frontend`, and set `VITE_API_URL` to the deployed backend URL. Add the
Vercel domain to the backend's `CORS_ORIGINS`. `vercel.json` sends every route to `index.html`
so page refreshes on `/resources/8` work.
