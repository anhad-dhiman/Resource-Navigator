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

| Code                  | Status | When                                                       |
| --------------------- | ------ | ---------------------------------------------------------- |
| `INVALID_QUERY`       | 400    | Query missing, empty, over 500 chars, or has control chars |
| `INVALID_CITY`        | 400    | City is not one of the cities in the database              |
| `INVALID_BODY`        | 400    | Body is not valid JSON or is over 10 KB                    |
| `INVALID_ID`          | 400    | Resource id is not a positive integer                      |
| `NOT_FOUND`           | 404    | Unknown route, or resource missing / not verified          |
| `RATE_LIMITED`        | 429    | More than 30 searches per minute from one client           |
| `SERVICE_UNAVAILABLE` | 503    | Database or other internal failure (no details exposed)    |

## POST /api/search

Plain-language search over verified resources (FR1, FR2, FR6, FR9).

Request:

```json
{ "query": "I can't pay rent and I'm running low on food", "city": "Surrey" }
```

- `query` (string, required): 1–500 characters after trimming, no control characters.
- `city` (string, optional): case-insensitive; must match a value from `GET /api/cities`.

Response `200`, matches found:

```json
{
  "status": "ok",
  "interpreted": {
    "categories": ["Housing", "Food"],
    "keywords": ["rent", "food"]
  },
  "city": "Surrey",
  "count": 1,
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
      },
      "match_explanation": null
    }
  ]
}
```

Response `200`, no matches (the 211 BC referral):

```json
{
  "status": "no_results",
  "interpreted": { "categories": [], "keywords": ["xyzzy"] },
  "city": null,
  "count": 0,
  "results": [],
  "message": "We could not find a verified service that matches your request. Please call or text 2-1-1, ..."
}
```

Notes:

- `interpreted` comes from the rule-based interpreter (`services/queryInterpreter.js`), the
  placeholder for the AI intent step. The AI integration will replace it with the same shape.
- `match_explanation` is always `null` until the AI explanation step is added.
- Ordering: resources whose `service_type` matches an interpreted category first, then full-text rank.
- The query text is never stored or logged.

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

## GET /health

```json
{ "status": "ok", "database": "ok" }
```

Returns `503` with `{ "status": "degraded", "database": "unreachable" }` if the database is down.
