# Frontend Changes — Backend Update Guide

Action items for the frontend team after recent **campaino-stater-service-be** updates.  
Use this alongside [FRONTEND_PLAN.md](./FRONTEND_PLAN.md) (full build spec) and Swagger at `GET /v1/docs`.

**Last synced with BE:** domain-scoped RBAC, target-based stats API, Swagger, schema alignment.

---

## Quick checklist

- [ ] Replace any usage of `POST /campaign/add-stats` with `POST /campaign/update-stats`
- [ ] Send **target totals**, not raw deltas (unless you compute `target = current + delta` client-side)
- [ ] Use `multipart/form-data` for stats update (optional `file` field)
- [ ] Allow **MANAGER** on all main pages (list, stats, audit) — not ADMIN-only
- [ ] Do **not** client-filter campaigns by domain — backend filters for managers
- [ ] Handle **403** on login (USER role) and on out-of-domain campaign access
- [ ] Handle empty lists for managers with no `UserDomain` assignments
- [ ] Read `limits` from `current-stats` to cap form inputs
- [ ] Display `htmlBody` in UI; DB field is still `emailBody` in raw responses (both may be present)
- [ ] Show `domainId` on campaign rows if useful (managers are scoped by it)
- [ ] Block **USER** role in UI if token somehow exists (defence in depth)

---

## 1. Authentication changes

### Login

```http
POST /v1/auth/login
Content-Type: application/json

{ "email": "...", "password": "..." }
```

| Role | Result |
|------|--------|
| ADMIN | 200 + `access_token` |
| MANAGER | 200 + `access_token` |
| USER | **403** `{ "code": 403, "message": "You are not allowed to login." }` |

**Frontend action:**

```typescript
// After login — only these roles may enter the app
const canEnterApp = (role: string) => role === "ADMIN" || role === "MANAGER"

if (!canEnterApp(data.user.role)) {
  // Show error, do not store token
}
```

- Remove any “USER can view read-only” flows — **USER has no access** to this app.
- Token TTL remains **1 hour**; no refresh endpoint.

---

## 2. RBAC — required navigation & route changes

### Old assumption (remove)

| Wrong | Correct |
|-------|---------|
| Campaign list = ADMIN only | **ADMIN + MANAGER** |
| Audit history = ADMIN only | **ADMIN + MANAGER** (manager sees domain-scoped rows) |
| Manager needs manual campaign ID / deep link | Manager uses **same `/campaigns` list** (filtered by API) |
| Client-side domain filtering | **Server-side only** — send normal requests, render what API returns |

### New access matrix

| Screen / API | ADMIN | MANAGER |
|--------------|-------|---------|
| `/campaigns` | All campaigns | Campaigns where `domainId ∈ UserDomain` |
| `/campaigns/:id/stats` | Any | Only if campaign in assigned domain |
| `POST /campaign/update-stats` | Any | Only if campaign in assigned domain |
| `/audit` | All history | History for accessible campaigns only |

**Frontend action — route guard:**

```typescript
// ProtectedRoute.tsx
const ALLOWED_ROLES = ["ADMIN", "MANAGER"] as const

if (!user || !ALLOWED_ROLES.includes(user.role)) {
  return <Navigate to="/login" />
}

// Same routes for ADMIN and MANAGER — no separate manager layout required
```

**Optional UX by role:**

```typescript
// Badge in header — informational only, not for access control
{user.role === "ADMIN" && <Badge>All domains</Badge>}
{user.role === "MANAGER" && <Badge>Your domains</Badge>}
```

---

## 3. API breaking change — stats update endpoint

### Removed

```
POST /v1/campaign/add-stats   ❌ no longer exists
```

Body was increment-only: `{ campaignId, delivered, opens, uniqueOpens, clicks, uniqueClicks }`

### New

```
POST /v1/campaign/update-stats   ✅
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

| Field | Type | Notes |
|-------|------|-------|
| `campaignId` | UUID string | Required |
| `sent` | integer | Target **total** sent count |
| `delivered` | integer | Target total delivered |
| `uniqueOpens` | integer | Target unique openers |
| `totalOpens` | integer | Target total open events |
| `uniqueClicks` | integer | Target unique clickers |
| `totalClicks` | integer | Target total click events |
| `file` | File | Optional `.csv` / `.txt` when increasing `sent` |

At least one stat field required. Omitted fields = unchanged.

**Frontend migration example:**

```typescript
// OLD — delete this
await api.post("/campaign/add-stats", {
  campaignId,
  delivered: 10,
  opens: 5,
  uniqueOpens: 3,
  clicks: 2,
  uniqueClicks: 1,
})

// NEW
const form = new FormData()
form.append("campaignId", campaignId)
form.append("sent", String(targetSent))           // e.g. current.sent + 50
form.append("delivered", String(targetDelivered))
form.append("uniqueOpens", String(targetUniqueOpens))
form.append("totalOpens", String(targetTotalOpens))
form.append("uniqueClicks", String(targetUniqueClicks))
form.append("totalClicks", String(targetTotalClicks))
if (emailFile) form.append("file", emailFile)

await fetch(`${API_BASE}/campaign/update-stats`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form, // do NOT set Content-Type manually
})
```

### Response shape (201)

```typescript
interface StatsUpdateResponse {
  before: CampaignStatsSnapshot
  after: CampaignStatsSnapshot
  applied: CampaignStatsSnapshot   // deltas actually applied
  emailSource: "default_csv" | "upload" | "none"
  warnings: string[]               // e.g. skipped duplicate emails
}
```

**UI:** After success, prefer `response.after` to refresh dashboard (no extra GET required).

---

## 4. Current stats — use `limits` for the form

```http
GET /v1/campaign/:campaignId/current-stats
```

**Response (additions / changes):**

```typescript
interface CampaignCurrentStats {
  campaignId: string
  name: string
  hasCompleted: boolean
  sent: number
  delivered: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
  limits: {
    maxDelivered: number
    maxUniqueOpens: number
    maxTotalOpens: number | null   // repeat opens — no hard max
    maxUniqueClicks: number
    maxTotalClicks: number | null
  }
}
```

**Frontend action:**

1. Pre-fill form inputs with **current** values (not zero).
2. Set `min={current.<field>}` — targets cannot decrease.
3. Set `max={limits.maxDelivered}` etc. where applicable.
4. Validate funnel client-side before submit (see [FRONTEND_PLAN.md §7](./FRONTEND_PLAN.md)).

---

## 5. Campaign list — manager access & `domainId`

```http
GET /v1/campaign?page=1&limit=10&search=&sortBy=createdAt&sortDirection=desc
```

- **MANAGER** may call this endpoint (was previously documented as ADMIN-only).
- Response is automatically filtered server-side.

**Campaign object — field notes:**

```typescript
interface Campaign {
  id: string
  name: string
  subject: string
  domainId: string | null   // NEW — manager access tied to this
  emailBody: string
  htmlBody: string          // NEW — API alias for emailBody (both may appear)
  // ...other fields unchanged
}
```

**Frontend action:**

- Prefer displaying **`htmlBody`** for email preview (matches main Selzy API convention).
- Show empty state when `campaigns.length === 0`:
  - Manager: *"No campaigns in your assigned domains."*
  - Admin: *"No campaigns found."*

---

## 6. Audit history — manager access

```http
GET /v1/campaign/updates?page=1&limit=10&campaignId=<optional uuid>
```

- **MANAGER** may call this endpoint.
- Results limited to updates for campaigns in assigned domains.
- Optional `campaignId` filter returns **403** if manager lacks access to that campaign.

**Audit row fields (updated names):**

```typescript
interface CampaignUpdateHistory {
  id: string
  campaignId: string
  name: string
  sent: number              // NEW delta field
  delivered: number
  totalOpens: number        // was `opens` in older audit rows concept
  uniqueOpens: number
  totalClicks: number       // was `clicks`
  uniqueClicks: number
  userId: string | null
  createdAt: string
}
```

Update table columns if you referenced old `opens` / `clicks` audit keys.

---

## 7. Error handling — new cases

| HTTP | When | Frontend behaviour |
|------|------|-------------------|
| **403** | USER login | Show: "You don't have access to the stats manager." |
| **403** | Manager opens campaign outside domain | Redirect to `/campaigns` + toast "Forbidden" |
| **403** | Wrong role on route | Toast + redirect |
| **400** | Funnel violation, monotonic violation, insufficient emails | Show `message` on form |
| **404** | Campaign not found | Empty / not found page |

Example 400 messages to surface in UI:

- `"delivered target (5) cannot be less than current (8)"`
- `"sent (100) must be >= delivered (150)"`
- `"Cannot add 50 delivered: only 12 eligible record(s) available"`
- `"Insufficient emails available: need 100, resolved 40"`

---

## 8. Stats update form — email file section

Show file upload when **`targetSent > currentSent`**:

| User choice | Backend behaviour |
|-------------|-------------------|
| No file | Random emails from bundled `customers-100000.csv` |
| CSV with `Email` column | Use uploaded addresses |
| TXT one email per line | Use uploaded addresses |

- Accept: `.csv`, `.txt` only (max 10 MB).
- Display `warnings` from response (duplicates skipped, invalid lines).
- Display `emailSource` badge: `default_csv` | `upload` | `none`.

If campaign has **zero** sent emails, **`sent` target is required** on first update.

---

## 9. TypeScript types — copy updates

Replace or merge into your `types/api.ts`:

```typescript
export type Role = "ADMIN" | "MANAGER" | "USER"

export interface CampaignStatsSnapshot {
  sent: number
  delivered: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
}

export interface CampaignStatsLimits {
  maxDelivered: number
  maxUniqueOpens: number
  maxTotalOpens: number | null
  maxUniqueClicks: number
  maxTotalClicks: number | null
}

export interface CampaignCurrentStats extends CampaignStatsSnapshot {
  campaignId: string
  name: string
  hasCompleted: boolean
  limits: CampaignStatsLimits
}

// Partial targets for update-stats FormData
export type StatsUpdateTargets = Partial<CampaignStatsSnapshot>
```

Remove old `add-stats` payload type if present:

```typescript
// DELETE — obsolete
interface AddStatsPayload {
  opens: number        // ambiguous old naming
  clicks: number
  // ...
}
```

---

## 10. Client validation rules (must match BE)

Before calling `update-stats`:

```
sent ≥ delivered ≥ uniqueOpens ≥ uniqueClicks
totalOpens ≥ uniqueOpens
totalClicks ≥ uniqueClicks
each target ≥ current value for that field
at least one target field changed
```

---

## 11. Suggested UI diff summary

| Component | Change |
|-----------|--------|
| `LoginPage` | Handle 403 for USER; redirect ADMIN + MANAGER to `/campaigns` |
| `ProtectedRoute` | Allow `ADMIN \| MANAGER` only |
| `Nav` | Show Campaigns + Audit for both roles (remove ADMIN-only gates) |
| `CampaignListPage` | Same page for both roles; empty state copy differs |
| `StatsPage` | Replace increment form with target-total form + limits |
| `StatsPage` | Add optional file upload when increasing sent |
| `StatsPage` | Success modal: show `before` / `after` / `applied` / `warnings` |
| `AuditPage` | Enable for MANAGER; update column names (`totalOpens`, `totalClicks`, `sent`) |
| `api/campaigns.ts` | Remove `addStats()`; add `updateStats(formData)` |
| `types/api.ts` | Add `limits`, `htmlBody`, `domainId`, new audit fields |

---

## 12. Swagger & reference links

| Resource | URL / path |
|----------|------------|
| Swagger UI | `{API_BASE}/docs` → e.g. `http://localhost:3001/v1/docs` |
| OpenAPI paths | `src/docs/paths/auth.yml`, `src/docs/paths/campaign.yml` |
| Full frontend build plan | [FRONTEND_PLAN.md](./FRONTEND_PLAN.md) |
| Backend + main Selzy context | [CAMPAINO_SELZY_API_REFERENCE.md](./CAMPAINO_SELZY_API_REFERENCE.md) |

---

## 13. Test scenarios after frontend update

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Login as `admin@campaino.com` | Full campaign list |
| 2 | Login as `manager@campaino.com` | Subset by assigned domains |
| 3 | Login as USER (if exists) | 403, stay on login |
| 4 | Manager opens `/campaigns/:id/stats` for own domain | 200 |
| 5 | Manager opens another domain's campaign ID | 403 |
| 6 | Manager with no domains | Empty list, no crash |
| 7 | Update stats with target totals | 201, dashboard shows `after` |
| 8 | Increase sent without file | `emailSource: "default_csv"` |
| 9 | Increase sent with CSV | `emailSource: "upload"` |
| 10 | Set delivered > sent | 400 client-side or server-side |

---

## 14. No frontend change needed

- JWT header format (`Authorization: Bearer …`) — unchanged
- Pagination query params (`page`, `limit`, `search`, `sortBy`, `sortDirection`) — unchanged
- Health check `GET /health` — unchanged
- Main Selzy app campaign creation — still separate backend
