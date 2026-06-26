# Campaino Stater Service

Stats injection and campaign audit microservice for the Campaino email platform. This service reads and updates campaign funnel metrics (sent, delivered, opens, clicks) in the **shared main-backend database** and records every stats change in a **local audit database**.

It does **not** send email, manage templates end-to-end, or replace the main Campaino backend.

## Stack

- Node.js 20+, TypeScript, Express 4
- Prisma 6 with **dual PostgreSQL** databases
- Passport JWT (shared `JWT_SECRET` with main backend)
- Joi validation, Swagger UI, Jest

## Quick start

```bash
yarn install
cp .env.example .env
# Edit .env — set DATABASE_URL, DATABASE_URL_DB2, JWT_SECRET

yarn prisma          # generate both Prisma clients
yarn db:push:all     # push DB1 + DB2 schemas (dev)
yarn dev             # http://localhost:4001
```

Swagger UI: `GET /v1/docs` (disable in production with `ENABLE_SWAGGER=false`)

## Dual-database setup

| Database | Env var | Purpose |
|----------|---------|---------|
| DB1 | `DATABASE_URL` | Shared with main Campaino backend — `Campaign`, `Email`, `Open`, `Click`, `User`, `Domain`, etc. |
| DB2 | `DATABASE_URL_DB2` | Local audit log — `CampaignUpdateHistory` |

- Schemas: [`prisma/schema.prisma`](prisma/schema.prisma), [`prisma/db2/schema.prisma`](prisma/db2/schema.prisma)
- Generated clients: `generated/client1`, `generated/client2`
- **No migrations** — schemas are applied with `prisma db push`
- **DB1** is shared with the main backend — coordinate schema changes; never `db:reset` on production DB1

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | `development`, `production`, or `test` |
| `JWT_SECRET` | Yes | — | Must match main Campaino backend |
| `DATABASE_URL` | Yes | — | DB1 connection string |
| `DATABASE_URL_DB2` | Yes | — | DB2 connection string |
| `PORT` | No | `4001` | HTTP port |
| `CUSTOMERS_CSV_PATH` | No | — | Email pool for `sent` increases |
| `MAX_STATS_INCREASE_PER_REQUEST` | No | `10000` | Per-request stats cap |
| `MAX_UPLOAD_EMAILS` | No | `50000` | Max emails per upload |
| `CORS_ORIGINS` | No | — | Comma-separated origins (production) |
| `ENABLE_SWAGGER` | No | `true` | Set `false` to hide `/v1/docs` |

## API endpoints

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| `POST` | `/v1/auth/login` | Public | Returns token for ADMIN/MANAGER only |
| `GET` | `/v1/campaign/` | Bearer JWT | ADMIN, MANAGER |
| `GET` | `/v1/campaign/updates` | Bearer JWT | ADMIN, MANAGER |
| `GET` | `/v1/campaign/:campaignId/current-stats` | Bearer JWT | ADMIN, MANAGER |
| `POST` | `/v1/campaign/update-stats` | Bearer JWT | ADMIN, MANAGER |
| `GET` | `/v1/docs` | Public | Swagger (if enabled) |
| `GET` | `/health` | Public | DB connectivity check |

### Auth

- Login: `POST /v1/auth/login` with `{ email, password }`
- Token TTL: **1 hour**
- Only `ADMIN` and `MANAGER` roles can log in; `USER` receives `403`
- Wrong credentials return generic `401` (no email enumeration)

### RBAC

- **ADMIN** — all campaigns
- **MANAGER** — campaigns in assigned domains (`UserDomain`); campaigns with `domainId = null` are admin-only

### Stats update

`POST /v1/campaign/update-stats` — `multipart/form-data`:

- `campaignId` (UUID, required)
- Target totals: `sent`, `delivered`, `uniqueOpens`, `totalOpens`, `uniqueClicks`, `totalClicks` (at least one required)
- Optional `file` — `.csv` or `.txt` email list when increasing `sent`

Targets must be monotonic (never below current) and respect funnel ordering.

## Commands

```bash
yarn dev              # development server
yarn build            # compile + prisma generate
yarn start            # production
yarn test             # Docker test DB + Jest
yarn lint             # ESLint
yarn db:push          # push DB1 schema
yarn db:push:db2      # push DB2 schema
yarn db:push:all      # push both
yarn db:reset:db2     # wipe + recreate DB2 (audit log only)
yarn db:reset:all     # wipe + recreate both (dev only — destroys all data)
yarn docker:dev-db:start   # local Postgres for dev
```

## Testing

```bash
yarn test
```

Requires Docker for the test database. Unit tests cover validation, access control, and error handling. Integration tests in `src/__tests__/integration/` seed minimal data and exercise auth + RBAC.

## Deployment

- **Docker** — `docker-compose.yml` with dev/prod/test overrides
- **PM2** — `ecosystem.config.json`
- **Nixpacks** — `nixpacks.toml`

## Related documentation

- [`AGENTS.md`](AGENTS.md) — AI agent onboarding and conventions
- [`docs/CAMPAINO_SELZY_API_REFERENCE.md`](docs/CAMPAINO_SELZY_API_REFERENCE.md) — cross-repo API reference
- [`docs/FRONTEND_BE_UPDATES.md`](docs/FRONTEND_BE_UPDATES.md) — frontend integration checklist
- [`docs/FRONTEND_PLAN.md`](docs/FRONTEND_PLAN.md) — full frontend build spec (some RBAC sections may be stale; prefer FRONTEND_BE_UPDATES)

## License

ISC
