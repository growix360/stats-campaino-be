# Campaino Selzy API — Reference for This Repo

Reference guide for the **Campaino Selzy** main backend when updating **campaino-stater-service-be** (this repo). Use this document to align schema changes, auth, API patterns, and shared database behavior.

---

## How This Repo Relates to Selzy

| | **campaino-stater-service-be** (this repo) | **Campaino Selzy API** (main backend) |
|---|---|---|
| **Purpose** | Stats injection & campaign read/update audit | Full email campaign platform (create, send, track) |
| **Stack** | Node 20+, TS, Express 4, Prisma 6 | Node 20+, TS, Express 4, Prisma 7 |
| **Databases** | Dual: DB1 (shared) + DB2 (local audit) | Single PostgreSQL |
| **Prisma clients** | `generated/client1`, `generated/client2` | `generated/prisma/` |
| **Email delivery** | None (injects opens/clicks/delivered) | UniOne API + signed webhooks |
| **Auth** | Shared `JWT_SECRET` with main backend | JWT via Passport |
| **Routes** | `/v1/auth`, `/v1/campaign/*`, `/v1/docs` | Full route map (see below) |

### Dual-database setup (this repo only)

```
DB1 (DATABASE_URL)     → Same PostgreSQL as main backend
                         Campaign, Email, Open, Click, User, Template, EmailList, Links

DB2 (DATABASE_URL_DB2) → Local stats audit log
                         CampaignUpdateHistory (opens, clicks, delivered snapshots)
```

- **JWT_SECRET** in `.env` must match the main backend so users can authenticate against shared `User` records in DB1.
- DB1 schema is kept in sync with the main backend via `yarn db:push` (no migration files in this repo).
- Legacy Selzy ID columns (`selzyCampaignId`, `selzyListId`, etc.) were removed from DB1 in favor of the main backend's native IDs.

### This repo's endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/campaign/update-stats` | ADMIN (all), MANAGER (assigned domains) | Set target stats |
| `GET` | `/v1/campaign/:campaignId/current-stats` | ADMIN (all), MANAGER (assigned domains) | Read funnel stats + limits |
| `GET` | `/v1/campaign/` | ADMIN (all), MANAGER (assigned domains) | Paginated campaign list |
| `GET` | `/v1/campaign/updates` | ADMIN (all), MANAGER (assigned domains) | Stats update audit history |
| `GET` | `/v1/docs` | Public | Swagger UI for this service |

#### Swagger

OpenAPI specs live in `src/docs/paths/*.yml` with shared schemas in `src/docs/components.yml`.  
UI: `GET /v1/docs` (all environments).

#### `POST /v1/campaign/update-stats`

`multipart/form-data` with optional `file` (`.csv` / `.txt`).

| Field | Description |
|-------|-------------|
| `campaignId` | Required UUID |
| `sent` | Target total sent count |
| `delivered` | Target total delivered |
| `uniqueOpens` | Target unique openers |
| `totalOpens` | Target total open events |
| `uniqueClicks` | Target unique clickers |
| `totalClicks` | Target total click events |

At least one target field required. Omitted fields keep current values. Targets must be monotonic (never below current) and satisfy: `sent ≥ delivered ≥ uniqueOpens ≥ uniqueClicks`, `totalOpens ≥ uniqueOpens`, `totalClicks ≥ uniqueClicks`.

When `sent` increases, new `Email` rows are created and appended to the campaign's `EmailList`. If no file is uploaded, random addresses are picked from `docs/customers-100000.csv` (override via `CUSTOMERS_CSV_PATH`).

When the main backend schema or auth changes, update DB1 schema and this repo's services accordingly.

**Frontend integration:** see [FRONTEND_BE_UPDATES.md](./FRONTEND_BE_UPDATES.md) for required UI changes after recent BE updates.

---

## Campaino Selzy API — Full Reference

> Source: main backend `AGENTS.md`. Preserved here for agent and developer context.

### Project Summary

**Campaino Selzy** is a REST API backend for an email campaign management platform. It handles:

- Campaign lifecycle (create → preview → run → track stats)
- HTML email templates with merge fields
- Recipient email lists (Excel upload)
- Short link generation and click tracking
- Dashboard analytics (opens, clicks, sends, deliveries)
- User/role/domain administration

Outbound email is sent through **UniOne**. Delivery, open, and click events arrive via **signed webhooks** at `POST /v1/webhook/`.

**Stack:** Node.js 20+, TypeScript, Express 4, Prisma 7, PostgreSQL, Joi, Passport JWT.

### Architecture

```
Request → Route → [auth] → [requireRole] → [validate] → Controller → Service → Prisma → PostgreSQL
                                                                 ↓
                                                            UniOne API (email send)
```

#### Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes | `src/routes/v1/*.route.ts` | HTTP method + path wiring, middleware chain |
| Controllers | `src/controllers/*.controller.ts` | Parse request, call service, send response. Keep thin. |
| Services | `src/services/*.service.ts` | Business logic, DB queries, external API calls |
| Validations | `src/validations/*.validation.ts` | Joi schemas for body/params/query |
| Middlewares | `src/middlewares/` | auth, requireRole, validate, rateLimiter, error handling |
| Providers | `src/providers/` | UniOne API client and webhook event parser |
| Utils | `src/utils/` | Shared helpers (accessControl, encryption, templateMerge) |

#### Entry points

- `src/index.ts` — connects Prisma, starts HTTP server
- `src/app.ts` — Express middleware stack, mounts `/v1` routes and `/v1/docs`
- `src/client.ts` — Prisma client singleton (uses `@prisma/adapter-pg`)
- `src/routes/v1/index.ts` — aggregates all v1 sub-routers

### Database (main backend)

- **Schema:** `prisma/schema.prisma`
- **Client output:** `generated/prisma/` (generated on `postinstall` / `prebuild`)
- **Import:** `import prisma from "../client"` or `import { Role } from "@prisma/client"`

#### Key models

| Model | Purpose |
|-------|---------|
| `User` | Accounts with `Role` enum (ADMIN, MANAGER, USER) |
| `Domain` | Sending domains (`fromEmail`, `fromName`) |
| `UserDomain` | Many-to-many user ↔ domain assignments |
| `Campaign` | Email campaign (links to template, domain, email list) |
| `Template` | Reusable HTML email body |
| `EmailList` | Named list of recipient emails (from Excel upload) |
| `Email` | Per-recipient delivery record with `EmailStatus` |
| `Open` / `Click` | Engagement events tied to email + campaign |
| `Links` | Short URLs with click counts |

All major entities use soft delete via `deletedAt` where applicable.

#### Schema divergence vs this repo (DB1)

| Feature | Main backend | This repo DB1 |
|---------|--------------|---------------|
| `Domain` / `UserDomain` | Yes | Yes (synced via `20250626140000_add_domain_models`) |
| `Campaign.domainId` | Required on create | Optional in schema (nullable for legacy rows; set by main backend) |
| `Campaign.ctaText` | Present | Present |
| `Template.providerTemplateId` | Present | Present (was `selzyTemplateId`) |
| `Template.htmlBody` API alias | Maps to `emailBody` | Campaign list responses include `htmlBody` alias |
| `Links.title` | Present | Present |
| Prisma version | 7 | 6 |
| Client path | `generated/prisma/` | `generated/client1/` |

When syncing, prefer the main backend schema as source of truth for DB1.

### Authentication & Authorization

#### JWT flow

1. `POST /v1/auth/login` → returns `{ user: { ..., access_token } }`
2. Protected routes: `Authorization: Bearer <access_token>`
3. Passport JWT strategy in `src/config/passport.ts` decodes token → `req.user`

#### Role middleware

```typescript
router.post("/", auth(), requireRole(Role.ADMIN, Role.MANAGER), handler)
```

- `auth()` — requires valid JWT; sets `req.user`
- `requireRole(...roles)` — checks `req.user.role` against allowed roles

#### Access control (service layer)

`src/utils/accessControl.ts` provides scoping helpers used in services:

| Helper | Behavior |
|--------|----------|
| `isAdmin(user)` | Admin bypass |
| `isManager(user)` | Manager check |
| `assertAuthenticatedRole(user)` | Rejects USER role |
| `buildCampaignScope(user)` | ADMIN: all; MANAGER: assigned domains; empty if no assignments |
| `assertCampaignAccess(user, campaignId)` | Throws 403/404 if user can't access campaign |
| `getAssignedDomainIds(userId)` | Returns domain IDs for a user |
| `getAccessibleCampaignIds(user)` | `null` for admin; campaign ID list for manager |

**Always apply access control in services**, not just route-level role checks.

> **Note for this repo:** Route auth uses `auth(Role.ADMIN, Role.MANAGER)`. **ADMIN** has full access. **MANAGER** is scoped to campaigns whose `domainId` is in their `UserDomain` assignments (see `src/utils/accessControl.ts`). **USER** cannot log in (403). Tokens must be compatible with the main backend's JWT secret.

### Adding a New Endpoint (main backend pattern)

Follow this sequence:

1. **Validation** — add Joi schema in `src/validations/<module>.validation.ts`
2. **Service** — add business logic in `src/services/<module>.service.ts` with access control
3. **Controller** — add handler wrapped in `catchAsync` in `src/controllers/<module>.controller.ts`
4. **Route** — wire in `src/routes/v1/<module>.route.ts` with middleware chain
5. **Export** — add to barrel files (`src/controllers/index.ts`, `src/services/index.ts`, `src/validations/index.ts`) if new module
6. **Swagger** — document in `src/docs/paths/<module>.yml`; add schemas to `src/docs/components.yml` if needed
7. **Test** — add test in `src/**/__tests__/` if behavior is non-trivial

#### Route pattern

```typescript
router.post(
  "/",
  auth(),
  requireRole(Role.ADMIN, Role.MANAGER),
  validate(myValidation.create),
  myController.create,
)
```

#### Controller pattern

```typescript
const create = catchAsync(async (req, res) => {
  const user = req.user as User
  const result = await myService.create({ user, ...req.body })
  return res.status(httpStatus.CREATED).send(result)
})
```

### Swagger / OpenAPI

- **UI:** `GET /v1/docs` (when `ENABLE_SWAGGER=true`)
- **Assembly:** `src/routes/v1/docs.route.ts` uses swagger-jsdoc
- **Base spec:** `src/docs/swaggerDef.ts`
- **Schemas:** `src/docs/components.yml`
- **Paths:** `src/docs/paths/*.yml` (one file per resource module)

Paths in YAML are relative to the `/v1` server base (e.g. `/auth/login` → `POST /v1/auth/login`). Health endpoints (`/`, `/health`) use the root server.

When adding or changing endpoints, update the corresponding YAML path file. Do not add JSDoc blocks to route files.

### External Integrations

#### UniOne (email delivery)

- **Provider:** `src/providers/unione.ts`
- **Config:** `UNIONE_API_KEY`, `UNIONE_API_BASE`, `UNIONE_FROM_EMAIL`, `UNIONE_FROM_NAME`
- Campaign run flow: service renders template → calls UniOne API → creates `Email` records

#### Webhooks

- **Route:** `POST /v1/webhook/` with `verifyUniOneWebhook` middleware
- **Raw body:** captured in `app.ts` for signature verification (`req.rawBody`)
- **Parser:** `src/providers/webhook.parser.ts` → `src/services/webhook.service.ts`
- **Auth util:** `src/utils/unioneWebhookAuth.ts`
- GET/HEAD on `/v1/webhook/` are for UniOne URL verification (no auth)

> This repo does not handle webhooks; real engagement events come from UniOne into the main backend. This repo simulates stats via `POST /v1/campaign/update-stats`.

### File Upload

Email list creation uses Multer:

- **Config:** `src/utils/fileUpload.ts`
- **Route:** `upload.single("file")` on `POST /v1/email-list/`
- **Parsing:** `src/utils/ExcelFileParsing.ts` extracts emails from `.xlsx`
- Uploaded files are deleted after processing

### Error Handling

- Throw `ApiError` from `src/utils/ApiError.ts` with HTTP status + message
- Wrap async controllers in `catchAsync` from `src/utils/catchAsync.ts`
- Centralized handler in `src/middlewares/error.ts`
- Response format: `{ code: number, message: string }`

Both repos share this pattern.

### Configuration (main backend)

- **Env validation:** `src/config/config.ts` (Joi schema, loaded from `.env`)
- **Required secrets:** `JWT_SECRET`, `Security_Key` (min 16 chars enforced by `assertSecretStrength`)
- **Never commit** `.env` — use `.env.example` as reference

#### Main backend env vars (not all used in this repo)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Shared with this repo |
| `DATABASE_URL` | DB1 in this repo |
| `UNIONE_API_KEY` | Email send |
| `UNIONE_API_BASE` | UniOne API base URL |
| `UNIONE_FROM_EMAIL` / `UNIONE_FROM_NAME` | Default sender |
| `Security_Key` | Register endpoint protection |
| `ALLOWED_ORIGINS` | CORS (empty = allow all) |
| `BASE_URL` | Short link base URL |

### Scripts & Commands (main backend)

```bash
npm run dev          # Development server (nodemon + ts-node)
npm run build        # Compile to build/
npm start            # Migrate + run compiled server
npm test             # Jest tests
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed admin/manager/user accounts
npm run db:studio    # Prisma Studio GUI
npm run lint         # ESLint
```

### Testing (main backend)

- **Framework:** Jest + ts-jest (`jest.config.ts`)
- **Location:** `src/**/__tests__/*.test.ts`
- **Env:** tests use `NODE_ENV=test` (webhook signature verification is skipped)
- Existing tests: `accessControl`, `requireRole`, `security`, `me.service`

### Conventions

#### Do

- Keep controllers thin — delegate to services
- Apply access control in services using `accessControl.ts` helpers
- Use Joi validation on all user input via the `validate` middleware
- Use `catchAsync` for all async controller handlers
- Use soft deletes (`deletedAt`) where the schema supports it
- Match existing import style and file naming (`*.controller.ts`, `*.service.ts`, `*.route.ts`)
- Update Swagger YAML when changing API surface
- Run `npm run build` to verify TypeScript compiles

#### Don't

- Don't put business logic in controllers or routes
- Don't bypass `requireRole` or access control helpers
- Don't hardcode secrets or commit `.env`
- Don't add JSDoc swagger blocks to route files (use YAML in `src/docs/paths/`)
- Don't import Prisma client from `@prisma/client` directly for the singleton — use `src/client.ts`
- Don't modify `generated/prisma/` manually
- Don't create commits unless explicitly asked

### Common Pitfalls

1. **Prisma client path** — main backend generates to `generated/prisma/`, not default `node_modules/@prisma/client`. This repo uses `generated/client1/` and `generated/client2/`.
2. **Campaign requires `domainId`** on the main backend when creating campaigns. This repo's Prisma schema includes optional `domainId` for read/sync; stats updates do not modify it.
3. **Template field naming** — API uses `htmlBody` in requests/responses; DB column is `emailBody`. Campaign list responses include both.
4. **Rate limiting** — applied to `/v1`, `/v1/auth`, and `/v1/webhook` paths on main backend.
5. **CORS** — controlled by `ALLOWED_ORIGINS` env var (empty = allow all).
6. **Short link base URL** — `BASE_URL` env var is used in `links.service.ts` (not from config export).

### Route Map (main backend)

| Mount | File | Roles |
|-------|------|-------|
| `/v1/auth` | `auth.route.ts` | Public (register needs security key) |
| `/v1/admin` | `admin.route.ts` | ADMIN |
| `/v1/me` | `me.route.ts` | Any authenticated |
| `/v1/campaign` | `campaign.route.ts` | ADMIN/MANAGER (write), +USER (read) |
| `/v1/email-list` | `emailList.route.ts` | ADMIN, MANAGER |
| `/v1/template` | `template.route.ts` | ADMIN, MANAGER |
| `/v1/link` | `links.route.ts` | ADMIN/MANAGER (CRUD), public redirect |
| `/v1/dashboard` | `dashboard.route.ts` | ADMIN, MANAGER, USER |
| `/v1/webhook` | `webhook.route.ts` | UniOne signature (POST), public (GET/HEAD) |

### Related Files (main backend)

| File | Purpose |
|------|---------|
| `README.md` | User-facing project documentation |
| `docs/FRONTEND_INTEGRATION.md` | Frontend RBAC and API integration guide |
| `.env.example` | Environment variable template |
| `prisma/schema.prisma` | Database schema (source of truth for models) |
| `src/config/roles.ts` | Role → permissions map (legacy; routes use `requireRole` directly) |

### Seed Data (main backend)

`npm run db:seed` creates:

| Email | Role | Password |
|-------|------|----------|
| admin@campaino.com | ADMIN | Password123! |
| manager@campaino.com | MANAGER | Password123! |
| user@campaino.com | USER | Password123! |

---

## Checklist: Syncing This Repo After Main Backend Changes

1. Compare `prisma/schema.prisma` on main backend vs `prisma/schema.prisma` (DB1) here.
2. Update `prisma/schema.prisma` if DB1 columns/models changed, then run `yarn db:push`.
3. Run `yarn prisma:generate` to regenerate `generated/client1`.
4. Confirm `JWT_SECRET` still matches main backend.
5. Update services that read/write shared models (`campaign.service.ts`, `campaignStats.service.ts`).
6. If new RBAC/domain scoping affects campaign access, evaluate whether this repo needs similar checks.
7. Run `yarn build` and smoke-test campaign endpoints against a DB1 populated by the main backend.

---

*Last updated from main backend AGENTS.md — Campaino Selzy API.*
