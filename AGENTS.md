# AGENTS.md — Campaino Stater Service

Guide for AI coding agents working in **campaino-stater-service-be**.

## Project identity

| | |
|---|---|
| **Name** | campaino-stater-service-be |
| **Purpose** | Inject campaign stats (sent, delivered, opens, clicks) and audit changes |
| **Not in scope** | Email sending, webhooks, template CRUD, user admin, domain management |

This is a **microservice** that shares DB1 with the main Campaino email backend. Users authenticate with the same `JWT_SECRET` and `User` records.

## Architecture

```
HTTP Request
  → Express (helmet, cors, xss, passport)
  → /v1 routes
  → auth(Role.ADMIN | Role.MANAGER)     [route middleware]
  → validate(Joi)                        [GET endpoints]
  → controller (catchAsync)
  → service + accessControl.ts           [domain scoping]
  → prismaDB1 (shared) / prismaDB2 (audit)
```

### Dual databases

| Client | Schema | Use for |
|--------|--------|---------|
| `prismaDB1` / `generated/client1` | `prisma/schema.prisma` | Campaigns, emails, events, users, domains |
| `prismaDB2` / `generated/client2` | `prisma/db2/schema.prisma` | `CampaignUpdateHistory` audit log only |

**Rules:**
- Never write audit history to DB1 or campaign data to DB2 (except `CampaignUpdateHistory`)
- DB1 schema changes must be coordinated with the main Campaino backend
- Import types from `generated/client1` or `generated/client2` — **not** `@prisma/client`
- Use `config` from `src/config/config.ts` for env values — **not** raw `process.env`

### Stats update flow (`campaignStats.service.ts`)

1. `assertCampaignAccess` — RBAC check
2. Validate targets (monotonic, funnel order, pool limits)
3. Create DB2 audit row **first**
4. Run DB1 transaction (provision emails, mark delivered, create open/click events)
5. On DB1 failure → soft-delete audit row, rethrow
6. Return before/after snapshots

## Directory map

```
src/
  index.ts              # Boot: connect DB1, listen
  app.ts                # Express app, middleware, /health
  client.ts             # prismaDB1, prismaDB2 exports
  config/               # config.ts, passport, logger, morgan
  controllers/          # auth, campaign
  services/             # auth, campaign, campaignStats, emailProvisioning
  routes/v1/            # auth, campaign, docs
  middlewares/          # auth, validate, error, rateLimiter, xss
  validations/          # Joi schemas
  utils/                # accessControl, statsValidation, fileUpload, ApiError
  docs/                 # Swagger YAML (paths/, components.yml)
  __tests__/            # Unit + integration tests
prisma/                 # DB1 schema + migrations
prisma/db2/             # DB2 schema + migrations
generated/client1|2     # Prisma client output (gitignored, build-time)
docs/                   # Human docs (frontend guides, API reference)
```

## Auth and RBAC

### Roles

| Role | Login | Campaign access |
|------|-------|-----------------|
| `ADMIN` | Yes | All campaigns |
| `MANAGER` | Yes | Campaigns where `domainId ∈ UserDomain` for user |
| `USER` | No (403) | N/A |

### Key helpers (`src/utils/accessControl.ts`)

| Function | Purpose |
|----------|---------|
| `isAdmin(user)` | Role check |
| `isManager(user)` | Role check |
| `assertAuthenticatedRole(user)` | Rejects USER role |
| `getAssignedDomainIds(userId)` | Manager's domain IDs |
| `buildCampaignScope(user)` | Prisma `where` for list queries |
| `assertCampaignAccess(user, campaignId)` | Throws 404/403 |
| `getAccessibleCampaignIds(user)` | `null` for admin; ID array for manager |

**Managers cannot access campaigns with `domainId = null`** — intentional; admin-only legacy data.

Always enforce access in **services**, not only route-level `auth()`.

## API contract

Base path: `/v1`. Auth header: `Authorization: Bearer <token>`.

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/auth/login` | `{ email, password }` → `{ user: { ..., access_token } }` |
| `GET` | `/campaign/` | Paginated list; query: page, limit, search, sortBy, sortDirection |
| `GET` | `/campaign/updates` | Audit history; optional `campaignId` filter |
| `GET` | `/campaign/:campaignId/current-stats` | Snapshot + limits |
| `POST` | `/campaign/update-stats` | `multipart/form-data`; see README |

### Error format

```json
{ "code": 400, "message": "Human-readable message" }
```

Use `ApiError` from `src/utils/ApiError.ts`. Operational errors preserve status codes via `errorConverter`.

### Validation

- GET endpoints: Joi via `validate()` middleware (coerced values on `req.query` / `req.params`)
- `update-stats`: manual `parseUpdateStatsBody()` in controller (multipart)
- All `campaignId` values: UUID v4

## Environment variables

See [`src/config/config.ts`](src/config/config.ts) and [`.env.example`](.env.example).

Required: `NODE_ENV`, `JWT_SECRET`, `DATABASE_URL`, `DATABASE_URL_DB2`.

## Build and test

```bash
yarn prisma          # generate both clients
yarn build           # generate + tsc
yarn dev             # nodemon
yarn test            # docker test DB + db:push:all + jest
yarn lint
```

Integration tests require Docker. Unit tests mock Prisma where needed.

## Coding conventions

1. **Controllers** — thin; use `catchAsync`; cast `req.user as User`
2. **Services** — business logic + `accessControl` + Prisma
3. **New endpoints** — validation → service → controller → route → Swagger YAML
4. **Imports** — `generated/client1` for DB1 types, `generated/client2` for DB2
5. **Config** — `import config from "../config/config"`
6. **Minimal diffs** — match existing patterns; don't over-abstract

## Known limitations

- Cross-DB: no FK between `CampaignUpdateHistory.campaignId` and DB1 `Campaign`
- Dual-DB stats update is best-effort atomic (audit first, rollback on DB1 failure)
- `limits.maxTotalOpens` / `maxTotalClicks` are always numbers (pool-based), not null
- Health check pings both databases
- Rate limiting on `/v1/auth` and `POST /campaign/update-stats` in production only

## Do not touch without coordination

- `prisma/migrations/` for DB1 when main backend owns the shared schema
- `JWT_SECRET` contract with main backend
- Removing `domainId` scoping without product approval

## Documentation index

| Doc | Use when |
|-----|----------|
| [README.md](README.md) | Human onboarding, quick start |
| [docs/FRONTEND_BE_UPDATES.md](docs/FRONTEND_BE_UPDATES.md) | **Most current** frontend integration after BE changes |
| [docs/FRONTEND_PLAN.md](docs/FRONTEND_PLAN.md) | Full frontend spec (some RBAC headers outdated) |
| [docs/CAMPAINO_SELZY_API_REFERENCE.md](docs/CAMPAINO_SELZY_API_REFERENCE.md) | Main backend cross-reference |
| `GET /v1/docs` | Live Swagger (if `ENABLE_SWAGGER=true`) |

## Doc accuracy note

For RBAC and login behavior, prefer **FRONTEND_BE_UPDATES.md** over FRONTEND_PLAN.md. The latter has ADMIN-only section headers and older login error codes.
