# API reference

Base URL (local): `http://localhost:3000`. All responses are JSON.

Errors always use this shape:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Please describe what you need help with."
  }
}
```

| Code                   | Status | When                                                             |
| ---------------------- | ------ | ---------------------------------------------------------------- |
| `INVALID_QUERY`        | 400    | Query missing, empty, over 500 chars, or has control chars       |
| `INVALID_CITY`         | 400    | City is not one of the cities in the database                    |
| `INVALID_BODY`         | 400    | Body is not valid JSON or is over 10 KB                          |
| `INVALID_RESOURCE_IDS` | 400    | `resource_ids` missing, empty, over 20, or not positive integers |
| `SEARCH_PAUSED`        | 429    | Paused for 30 minutes after repeated unrelated searches          |
| `INVALID_FILTER`       | 400    | `city` or `type` filter repeated or over 100 characters          |
| `INVALID_ID`           | 400    | Resource id is not a positive integer                            |
| `NOT_FOUND`            | 404    | Unknown route, or resource missing / not verified                |
| `RATE_LIMITED`         | 429    | More than 30 searches per minute from one client                 |
| `SERVICE_UNAVAILABLE`  | 503    | Database or other internal failure (no details exposed)          |

## POST /api/search

Plain-language search over verified resources (FR1, FR2, FR6, FR9). Returns the cards as soon as
the database answers; the AI summary is a second request (`POST /api/search/summary`).

Request:

```json
{ "query": "I can't pay rent and I'm running low on food", "city": "Surrey" }
```

- `query` (string, required): 1–500 characters after trimming, no control characters.
- `city` (string, optional): case-insensitive; must match a value from `GET /api/cities`.

Response `200`. `status` is `ok`, `no_results` or `irrelevant`:

```json
{
  "status": "ok",
  "interpreted": {
    "intent": "need",
    "urgency": "none",
    "categories": ["Housing", "Food"],
    "keywords": ["rent", "food", "groceries"],
    "city": null
  },
  "ai": { "interpreted_by": "gemini" },
  "urgency": null,
  "city": "Surrey",
  "count": 1,
  "summary_available": true,
  "results": [
    {
      "resource_id": 8,
      "service_name": "Surrey Food Bank",
      "service_type": "Food",
      "description": "Provides food hampers and nutrition support ...",
      "physical_address": "Unit 1 - 13478 78th Avenue",
      "city": "Surrey",
      "contact_phone": "604-581-5443",
      "official_url": "https://surreyfoodbank.org",
      "operating_hours": "Distribution Mon, Tue, Thu, Fri 9:30am-1pm; ...",
      "eligibility_criteria": "Government-issued photo ID and proof of address required; ...",
      "language_support": "English (interpretation available on request)",
      "verification": {
        "status": "Verified",
        "last_reviewed_at": "2026-09-15T00:00:00.000Z"
      }
    }
  ]
}
```

- `urgency`: `"emergency"` (someone hurt or in danger) or `"self_harm"`, else `null`. The frontend
  shows a 9-1-1 banner (and 9-8-8 for self-harm) above the results.
- `summary_available`: `true` when the AI is working and there are results; the frontend then calls
  `POST /api/search/summary`.
- `no_results` adds `"message"` with the 211 BC referral.
- `irrelevant` (off-topic, gibberish, or no letters at all): no database search, `results` is
  empty, and `"message"` asks the user to describe what they need.

How a search runs (`services/searchService.js`, `ai/`):

1. **Pre-check.** Input with no letters (in any language) is `irrelevant`, without calling the AI.
2. **Interpret.** The AI returns `intent` (`need`, `off_topic`, `gibberish`), `urgency`, and
   `categories`, `keywords` and `city`, chosen only from values in the database. The query is sent
   as a JSON field, never mixed into the instructions. An emergency is always treated as a need.
3. **Search.** When the AI picks categories, they are a strict filter and keywords only rank the
   results. With no categories, any keyword can match. A `city` in the request wins over a city
   named in the query.

When every provider fails (rate limit, timeout, outage) or no API key is set, `interpreted` is
`null`, the database matches the query's own words with PostgreSQL full-text search, and
`summary_available` is `false`.

**Pausing.** Each `irrelevant` search counts against the client's IP address. The second within
15 minutes adds a warning to the message; the third pauses search for that IP for 30 minutes:
both search endpoints then return `429` with code `SEARCH_PAUSED` and a `Retry-After` header.
Only the IP address and timestamps are kept, in memory. In production behind a proxy, set
`TRUST_PROXY` so the real client IP is used.

## POST /api/search/summary

One AI-written summary of why a search's results were shown.

Request (the query and the `resource_id`s from the search response, at most 20):

```json
{
  "query": "I can't pay rent and I'm running low on food",
  "resource_ids": [8, 12, 3]
}
```

Response `200`:

```json
{
  "summary": "These food banks give free groceries to low-income residents. Most ask for photo ID and proof of address.",
  "ai": { "summarized_by": "gemini" }
}
```

The records are loaded again from the database by ID (only public ones), so the AI only sees
verified data. `summary` is `null` when the AI fails, or when the text contains web or email
addresses or numbers of three or more digits (so it can't add contact details).

The query text is never stored or logged by this API. It is sent to the AI provider; see the
privacy policy on the About page.

## GET /api/resources

Lists every public resource, for browsing. Optional query-string filters, both case-insensitive:

- `city`, e.g. `?city=Surrey`
- `type` (service type), e.g. `?type=Legal%20Aid`

Ordered by service type, then name. Same fields as a search result, without `match_explanation`.

```json
{
  "count": 25,
  "resources": [
    {
      "resource_id": 6,
      "service_name": "Guru Nanak’s Free Kitchen",
      "...": "..."
    }
  ]
}
```

## GET /api/resources/:id

Detail for one public resource (FR5). Same fields as a search result, without
`match_explanation`. Returns `404` if the resource does not exist or its latest review is not `Verified`.

```json
{ "resource": { "resource_id": 3, "service_name": "Atira", "...": "..." } }
```

## GET /api/cities

Cities that currently have public resources, for the city filter.

```json
{ "cities": ["Burnaby", "New Westminster", "Richmond", "Surrey", "Vancouver"] }
```

## GET /api/service-types

Service types that currently have public resources, for category filters.

```json
{
  "service_types": ["Food", "Health", "Housing", "Legal Aid", "Senior Support"]
}
```

## GET /health

```json
{ "status": "ok", "database": "ok" }
```

Returns `503` with `{ "status": "degraded", "database": "unreachable" }` if the database is down.

## Admin authentication

Admin routes live under `/api/admin` and are only enabled when `JWT_SECRET` is set (at least 32
characters). The session is a JWT in an **httpOnly, SameSite=Strict cookie** named `admin_session`
(path `/api/admin`, 1 hour). It is never returned in a response body, so page scripts can't read
it. All admin responses send `Cache-Control: no-store`.

Accounts are created from the command line (there is no sign-up endpoint):

```bash
npm run admin:create -- --username alice --role moderator    # or --role administrator
```

| Code                         | Status | When                                                                         |
| ---------------------------- | ------ | ---------------------------------------------------------------------------- |
| `INVALID_CREDENTIALS_FORMAT` | 400    | Username or password missing, not a string, or too long                      |
| `INVALID_CREDENTIALS`        | 401    | Wrong username or password (same message for both)                           |
| `UNAUTHENTICATED`            | 401    | No session cookie, or it is invalid/expired, or the account no longer exists |
| `FORBIDDEN`                  | 403    | Signed in, but the role is not allowed for this route                        |
| `RATE_LIMITED`               | 429    | 10 failed sign-ins from one IP within 15 minutes                             |

### POST /api/admin/login

```json
{ "username": "alice", "password": "a long password" }
```

Response `200` (plus `Set-Cookie: admin_session=...; HttpOnly; SameSite=Strict`):

```json
{ "user": { "user_id": 1, "username": "alice", "role": "moderator" } }
```

Usernames are matched case-insensitively. Both `administrator` and `moderator` can sign in.

### POST /api/admin/logout

Clears the session cookie. Response: `{ "status": "ok" }`.

### GET /api/admin/me

Requires a session. Returns the signed-in account, loaded fresh from the database:

```json
{ "user": { "user_id": 1, "username": "alice", "role": "moderator" } }
```
