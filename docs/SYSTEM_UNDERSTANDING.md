# Campaino Platform — System Understanding & Engineering Manual

## 1. Introduction & System Purpose

The **Campaino** platform is a production-grade email campaign orchestration and analytics system. It addresses two critical operational requirements:
1. **Core Outbound Email Operations**: Creating, scheduling, executing, and tracking marketing and transactional email campaigns via the [UniOne](https://unione.io/) delivery network, complemented by link shorteners, recipient list management, and real-time webhook telemetry.
2. **Funnel Simulation & Metrics Audit**: Providing an isolated microservice for campaign performance calibration, controlled funnel metrics adjustment (simulating sent, delivered, opens, clicks), and maintaining an immutable audit log of all manual changes without risking core transactional integrity.

The ecosystem is implemented across four coordinated repositories:

```
campaino/
├── campaino-selzy/               # [BE] Core Email & Campaign REST API
├── campaino-email-service-fe/    # [FE] Core Marketing & Campaign Management SPA
├── campaino-stater-service-be/   # [BE] Funnel Metrics & Audit Microservice
└── campaino-stater-service-fe/   # [FE] Campaign Funnel Management & Audit Viewer
```

---

## 2. Deep-Dive Component Analysis

### 2.1. Subsystem 1: `campaino-selzy` (Core Backend API)

#### Directory & Code Organization
```
campaino-selzy/
├── prisma/
│   ├── schema.prisma              # DB1 schema definition (Prisma 7)
│   ├── seed.ts                    # Seeds default admin account (admin@campaino.com)
│   └── migrations/                # Version-controlled database migrations
├── scripts/
│   ├── clear-campaigns-and-stats.ts # Utility to clear campaigns, emails, opens, clicks
│   └── clear-database.ts          # Utility to purge all data for dev resets
├── src/
│   ├── client.ts                  # Prisma client singleton (@prisma/adapter-pg)
│   ├── app.ts                     # Express app setup, middlewares, rate limiters
│   ├── index.ts                   # Bootstraps database connection & starts HTTP server
│   ├── config/                    # Environment validation (Joi), Passport JWT strategy, Winston logger
│   ├── controllers/               # Thin request controllers (admin, auth, campaign, dashboard, etc.)
│   ├── middlewares/               # auth, requireRole, validate, rateLimiter, error, xss
│   ├── providers/                 # UniOne API client (unione.ts) & Webhook parser
│   ├── routes/v1/                 # Express sub-routers (admin, auth, campaign, dashboard, emailList, links, me, template, webhook)
│   ├── services/                  # Business logic, Prisma queries, scoping enforcement
│   ├── utils/                     # accessControl, templateMerge, ExcelFileParsing, ApiError
│   └── docs/                      # Swagger UI specs (paths/*.yml, components.yml)
```

#### Key Architecture Patterns
- **Thin Controllers & Rich Services**: Controllers only unwrap HTTP requests, execute service functions, and format responses via `catchAsync` wrappers. All database transactions, UniOne calls, and role-scoping logic live in `src/services/`.
- **Domain-Scoped Multi-Tenancy**: The helper `buildCampaignScope(user)` dynamically calculates Prisma query filters:
  - `ADMIN`: Unrestricted query (`{ deletedAt: null }`).
  - `MANAGER`: Scoped to campaigns owned or associated with domains assigned to the manager.
  - `USER`: Scoped strictly to campaigns belonging to assigned `domainId`s with read-only privileges.
- **Provider Abstraction**: All UniOne-specific HTTP calls are isolated in `src/providers/unione.ts`. Campaign payloads are chunked into 500-recipient slices (`BATCH_SIZE = 500`) to guarantee delivery reliability and stay within API payload thresholds.
- **Template Merging**: Local merge engine replaces placeholders:
  - `{{emailBody}}` -> Campaign copy
  - `{{link}}` -> Campaign CTA link or shortened link
  - `{{ctaText}}` -> CTA button text (default: "Click Here")

---

### 2.2. Subsystem 2: `campaino-email-service-fe` (Core Management SPA)

#### Directory & Code Organization
```
campaino-email-service-fe/
├── public/                        # Static assets, logos, favicon
├── src/
│   ├── api/                       # API modules (admin.ts, campaigns.ts, etc.)
│   ├── components/
│   │   ├── customComponents/      # Dashboard charts, metrics cards, stat widgets
│   │   ├── ui/                    # shadcn/ui primitives (Button, Dialog, Dropdown, Table, Input, etc.)
│   │   ├── Layout.tsx             # Shell containing sidebar, header, and main outlet
│   │   ├── AppHeader.tsx          # Top navigation bar with profile and logout
│   │   └── AppSidebar.tsx         # Sidebar navigation links filtered by user role
│   ├── lib/
│   │   ├── axios.ts               # Axios instance with Bearer token injection & 401 redirect
│   │   ├── permissions.ts         # Role verification helpers (isAdmin, isManager, canAccess)
│   │   └── utils.ts               # cn() class utility
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Domains.tsx        # Domain CRUD and sending configuration
│   │   │   └── Users.tsx          # User management, role assignment, domain mapping
│   │   ├── Campaigns.tsx          # Campaign list, creation wizard, run trigger, details dialog
│   │   ├── Dashboard.tsx          # Aggregated delivery, open, and click metrics with date-range filters
│   │   ├── EmailLists.tsx         # Recipient list management & Excel (.xlsx) file upload
│   │   ├── LinkShortner.tsx       # Short link generator, click counters, copy-to-clipboard
│   │   ├── Login.tsx              # Authentication form with Zod schema validation
│   │   ├── Signup.tsx             # Self-registration form
│   │   └── Templates.tsx          # WYSIWYG HTML email template designer & preview
│   ├── stores/
│   │   └── auth.ts                # Zustand store persisted to localStorage ('auth-storage')
│   ├── types/
│   │   └── api.ts                 # Shared TypeScript interfaces for API responses
│   ├── App.tsx                    # React Router configuration with ProtectedRoute & RoleRoute
│   └── main.tsx                   # App entrypoint
```

#### Key Architecture Patterns
- **Role-Gated Routing**: Routes in `App.tsx` are wrapped with `ProtectedRoute` (requires active JWT) and `RoleRoute` (enforces allowed role sets). Unauthenticated users are redirected to `/login`; unauthorized roles land on `/dashboard` or error pages.
- **Form Architecture**: Forms utilize `react-hook-form` paired with `zod` schemas for strict client-side validation.
- **Design System**: Built on `shadcn/ui` (new-york style) with Tailwind CSS v4, Radix UI accessibility primitives, and Lucide React icons.
- **Chunk Splitting**: Rollup chunk splitting in `vite.config.ts` separates `vendor-react` and `vendor-charts` to minimize initial bundle size.

---

### 2.3. Subsystem 3: `campaino-stater-service-be` (Stats Injection Microservice)

#### Directory & Code Organization
```
campaino-stater-service-be/
├── prisma/
│   ├── schema.prisma              # Shared DB1 schema (Prisma 6, client generated to generated/client1)
│   └── db2/
│       └── schema.prisma          # Dedicated DB2 audit schema (client generated to generated/client2)
├── src/
│   ├── client.ts                  # Exports prismaDB1 and prismaDB2 clients
│   ├── app.ts                     # Express app setup, rate limiters, health checks
│   ├── index.ts                   # Bootstraps DB1 & DB2 connections and starts server
│   ├── config/                    # Environment variables, Passport JWT, Winston logger
│   ├── controllers/               # auth.controller.ts, campaign.controller.ts
│   ├── middlewares/               # auth.ts, rateLimiter.ts, validate.ts, error.ts
│   ├── services/
│   │   ├── auth.service.ts        # Authenticates ADMIN and MANAGER (blocks USER with 403)
│   │   ├── campaign.service.ts    # Reads campaigns & audit histories with domain scoping
│   │   ├── campaignStats.service.ts # Core funnel calculations & DB1/DB2 two-phase writes
│   │   └── emailProvisioning.service.ts # Provisions synthetic recipients from CSV/upload
│   ├── utils/
│   │   ├── accessControl.ts       # Domain scoping checks for managers
│   │   ├── statsValidation.ts     # Funnel invariants, monotonic rules, limits calculation
│   │   ├── customersCsv.ts        # In-memory streaming from docs/customers-100000.csv
│   │   ├── emailFileParsing.ts    # Parses and deduplicates uploaded .csv/.txt recipient files
│   │   ├── fileUpload.ts          # Multer memory storage configuration (max 10MB)
│   │   └── UserAgents.ts          # Realistic browser User-Agent strings and synthetic IP generator
│   └── docs/                      # Swagger UI OpenAPI definitions
```

#### Mathematical & Operational Funnel Invariants
1. **Monotonic Progression**: Once a metric reaches value $N$, a stats update cannot set a target $N' < N$.
2. **Funnel Bounds**:
   $$\text{targetSent} \ge \text{targetDelivered} \ge \text{targetUniqueOpens} \ge \text{targetUniqueClicks}$$
   $$\text{targetTotalOpens} \ge \text{targetUniqueOpens}$$
   $$\text{targetTotalClicks} \ge \text{targetUniqueClicks}$$
3. **Safety Caps**:
   - `MAX_STATS_INCREASE_PER_REQUEST`: Defaults to `10000` (prevents server exhaustion from large deltas).
   - `MAX_UPLOAD_EMAILS`: Defaults to `50000` (limits uploaded CSV memory footprint).

#### Two-Phase Best-Effort Dual-DB Write Algorithm
To maintain consistency across separate databases without distributed 2PC:
1. Validate access control (`assertCampaignAccess`).
2. Validate targets against current snapshots and eligibility pools.
3. Compute deltas for all fields.
4. **Step A (DB2)**: Insert a new `CampaignUpdateHistory` row recording current snapshots, requested targets, and `userId`.
5. **Step B (DB1)**: Open an interactive Prisma transaction:
   - If $\Delta\text{sent} > 0$: Provision new `Email` rows in batches of 1000, and update the campaign's `EmailList`.
   - If $\Delta\text{delivered} > 0$: Randomly pick `deliverableSent` emails and set status to `DELIVERED`.
   - If $\Delta\text{uniqueOpens} > 0$: Randomly pick un-opened delivered emails, insert `Open` rows, set status to `OPENED`.
   - If $\Delta\text{totalOpens} > 0$: Randomly pick already-opened emails and insert repeat `Open` rows.
   - If $\Delta\text{uniqueClicks} > 0$: Randomly pick opened emails with zero clicks, insert `Click` rows, set status to `CLICKED`.
   - If $\Delta\text{totalClicks} > 0$: Randomly pick already-clicked emails and insert repeat `Click` rows.
6. **Step C (DB2 Finalization)**: If DB1 transaction succeeds, update the audit record with final snapshots. If DB1 fails, catch the error, soft-delete the DB2 audit row (`deletedAt = now()`), and rethrow the operational error to the client.

---

### 2.4. Subsystem 4: `campaino-stater-service-fe` (Stats Manager SPA)

#### Directory & Code Organization
```
campaino-stater-service-fe/
├── public/                        # Static brand assets
├── src/
│   ├── components/
│   │   ├── audit/                 # AuditTable.tsx, AuditHistoryCards.tsx
│   │   ├── auth/                  # ProtectedRoute.tsx (blocks USER, allows ADMIN & MANAGER)
│   │   ├── campaigns/             # CampaignsTable.tsx (search, sort, pagination, domain badges)
│   │   ├── stats/                 # FunnelCards.tsx, FunnelChart.tsx, StatsUpdateForm.tsx, UpdateConfirmDialog.tsx
│   │   ├── ui/                    # shadcn/ui components (Radix primitives)
│   │   ├── Layout.tsx             # Navigation header, responsive mobile sheet, main container
│   │   └── Navigation.tsx         # Tabbed navigation (Campaigns, Audit History)
│   ├── hooks/
│   │   ├── useCampaigns.ts        # Fetches paginated campaigns with debounce & error states
│   │   ├── useCampaignStats.ts    # Loads snapshots + limits, handles multipart form submission
│   │   ├── useAuditHistory.ts     # Fetches paginated audit logs with campaignId filter
│   │   └── useTokenExpiry.ts      # Validates JWT expiry on mount and dispatches logout on stale tokens
│   ├── lib/
│   │   ├── api/                   # auth.ts, campaigns.ts, audit.ts, client.ts
│   │   ├── axios.ts               # Axios interceptor with Sonner toast on 429 rate limit
│   │   ├── errors.ts              # Contextual user-friendly error formatting
│   │   ├── rbac.ts                # canEnterApp helper (ADMIN | MANAGER)
│   │   └── validations/stats.ts   # Dynamic Zod form schema builder with max limits
│   ├── pages/
│   │   ├── AuditPage.tsx          # Audit history viewer with campaign selector & diff inspection
│   │   ├── CampaignsPage.tsx      # Campaign overview table with direct links to stats manager
│   │   ├── CampaignStatsPage.tsx  # Interactive funnel dashboard, target update form, CSV uploader
│   │   ├── Login.tsx              # Split-card login form
│   │   └── NotFound.tsx           # 404 handler
│   ├── stores/
│   │   └── auth.ts                # Zustand auth store with localStorage persistence
│   ├── types/
│   │   └── api.ts                 # Type definitions matching backend response payloads
│   ├── App.tsx                    # Route definitions (/login, /campaigns, /campaigns/:id/stats, /audit)
│   └── main.tsx                   # React root mount
```

#### Key Architecture Patterns
- **Target-Total Form UX**: Instead of asking operators to calculate deltas, the UI presents current values as minimums and allows inputting desired target totals. The UI dynamically enforces:
  - Minimum constraint: `value >= current[field]`
  - Maximum constraint: `value <= limits[maxField]`
  - File upload trigger: Upload field becomes active when target `sent` is incremented.
- **Defensive Error Handling**: Special Axios interceptors detect HTTP 429 rate limits and display customized warning toasts. HTTP 403 responses trigger contextual explanations (e.g. informing a manager that a campaign belongs to another domain).

---

## 3. Complete API Endpoint Catalog

### 3.1. `campaino-selzy` API Endpoints (Base URL: `/v1`)

| Method | Path | Required Role | Description | Key Request Params / Body | Success Response |
|:---|:---|:---:|:---|:---|:---|
| `POST` | `/auth/login` | Public | Authenticates user and returns JWT | `{ email, password }` | `200` + `{ user: { id, email, role, access_token } }` |
| `POST` | `/auth/register` | Public (Secret) | Registers a new account | `{ email, password, name, securityKey, role }` | `201` + `{ user, access_token }` |
| `GET` | `/me` | Authenticated | Gets current user profile | Header: `Bearer <token>` | `200` + `{ user, domains }` |
| `GET` | `/me/domains` | Authenticated | Gets domains assigned to caller | Query: `page`, `limit` (optional) | `200` + `{ domains: [...] }` |
| `GET` | `/campaign` | Any Role | Lists campaigns (domain-scoped) | Query: `page`, `limit`, `search`, `range`, `status` | `200` + `{ campaigns, totalRecords, totalPages }` |
| `GET` | `/campaign/:id` | Any Role | Gets detailed campaign record | Param: `id` (UUID) | `200` + `Campaign` object |
| `POST` | `/campaign` | ADMIN, MANAGER | Creates new campaign | `{ name, subject, link, ctaText, messageBody, domainId, templateId, emailListId }` | `201` + `Campaign` object |
| `POST` | `/campaign/preview`| ADMIN, MANAGER | Generates HTML preview with merged fields | `{ templateId, messageBody, link, ctaText }` | `200` + `{ html }` |
| `POST` | `/campaign/run` | ADMIN, MANAGER | Dispatches campaign via UniOne | `{ campaignId }` | `200` + `{ message: "Campaign started", totalSent }` |
| `GET` | `/campaign/:id/stats` | Any Role | Gets live stats snapshot | Param: `id` (UUID) | `200` + `{ sent, delivered, opens, clicks }` |
| `GET` | `/template` | ADMIN, MANAGER | Lists email templates | Query: `page`, `limit`, `search` | `200` + `{ templates, totalRecords }` |
| `POST` | `/template` | ADMIN, MANAGER | Creates new HTML template | `{ name, subject, htmlBody }` | `201` + `Template` object |
| `PUT` | `/template/:id` | ADMIN, MANAGER | Updates existing template | `{ name, subject, htmlBody }` | `200` + `Template` object |
| `DELETE`| `/template/:id` | ADMIN, MANAGER | Soft-deletes template | Param: `id` (UUID) | `200` + `{ success: true }` |
| `POST` | `/template/preview`| ADMIN, MANAGER | Previews raw template HTML | `{ htmlBody }` | `200` + `{ html }` |
| `GET` | `/email-list` | ADMIN, MANAGER | Lists recipient email lists | Query: `page`, `limit`, `search`, `status` | `200` + `{ emailLists, totalRecords }` |
| `POST` | `/email-list` | ADMIN, MANAGER | Uploads recipient Excel list | Multipart form: `file` (.xlsx), `name` | `201` + `EmailList` object |
| `DELETE`| `/email-list/:id` | ADMIN, MANAGER | Soft-deletes email list | Param: `id` (UUID) | `200` + `{ success: true }` |
| `GET` | `/link` | ADMIN, MANAGER | Lists shortened URLs | Query: `page`, `limit`, `search`, `range` | `200` + `{ links, total }` |
| `POST` | `/link` | ADMIN, MANAGER | Creates new short link | `{ originalUrl, title }` | `201` + `Links` object |
| `DELETE`| `/link/details/:id`| ADMIN, MANAGER| Soft-deletes short link | Param: `id` (UUID) | `200` + `{ success: true }` |
| `GET` | `/link/:shortCode` | Public | Redirects to original URL & counts click | Param: `shortCode` | `302 Redirect` to `originalUrl?uuid=...` |
| `GET` | `/dashboard/stats` | Any Role | Dashboard top-level stat counters | Query: `startDate`, `endDate`, `date` | `200` + `{ totalSent, totalDelivered, opens, clicks }` |
| `GET` | `/dashboard/chart` | Any Role | Time-series engagement metrics | Query: `range` (e.g. `month`, `week`) | `200` + `{ data: [...] }` |
| `GET` | `/admin/domains` | ADMIN | Lists all system sending domains | Query: `page`, `limit`, `search` | `200` + `{ domains, totalRecords }` |
| `POST` | `/admin/domains` | ADMIN | Creates sending domain | `{ name, fromEmail, fromName }` | `201` + `Domain` object |
| `PUT` | `/admin/domains/:id`| ADMIN | Updates domain configuration | `{ name, fromEmail, fromName }` | `200` + `Domain` object |
| `DELETE`| `/admin/domains/:id`| ADMIN | Deletes sending domain | Param: `id` (UUID) | `200` + `{ success: true }` |
| `GET` | `/admin/users` | ADMIN | Lists registered users | Query: `page`, `limit`, `search`, `status` | `200` + `{ users, totalRecords }` |
| `POST` | `/admin/users` | ADMIN | Creates new user with role & domains | `{ name, email, password, role, domainIds }` | `201` + `User` object |
| `PUT` | `/admin/users/:id` | ADMIN | Updates user details & domains | `{ name, role, domainIds }` | `200` + `User` object |
| `DELETE`| `/admin/users/:id` | ADMIN | Soft-deletes user | Param: `id` (UUID) | `200` + `{ success: true }` |
| `POST` | `/webhook` | Public (Signed) | Receives delivery/open/click webhooks | Body: UniOne webhook payload, Header: Signature | `200` + `{ success: true }` |

---

### 3.2. `campaino-stater-service-be` Endpoints (Base URL: `/v1`)

| Method | Path | Required Role | Description | Key Request Params / Body | Success Response |
|:---|:---|:---:|:---|:---|:---|
| `POST` | `/auth/login` | ADMIN, MANAGER | Authenticates user (USER receives 403) | `{ email, password }` | `200` + `{ user: { id, email, role, access_token } }` |
| `GET` | `/campaign` | ADMIN, MANAGER | Lists campaigns with domain scoping | Query: `page`, `limit`, `search`, `sortBy`, `sortDirection` | `200` + `{ campaigns, totalRecords, totalPages }` |
| `GET` | `/campaign/:campaignId/current-stats` | ADMIN, MANAGER | Retrieves live funnel snapshot & input limits | Param: `campaignId` (UUID) | `200` + `{ snapshot: {...}, limits: {...} }` |
| `POST` | `/campaign/update-stats` | ADMIN, MANAGER | Injects target funnel metrics | Multipart: `campaignId`, `sent`, `delivered`, `uniqueOpens`, `totalOpens`, `uniqueClicks`, `totalClicks`, optional `file` (.csv/.txt) | `201` + `{ message, before, after, limits, warnings }` |
| `GET` | `/campaign/updates` | ADMIN, MANAGER | Fetches audit trail of stats updates | Query: `campaignId` (optional), `page`, `limit` | `200` + `{ campaigns: [...auditRows], totalRecords, totalPages }` |
| `GET` | `/docs` | Public | Swagger OpenAPI interactive interface | None | `200` (HTML) |

---

## 4. End-to-End Workflow & Data Flow Walkthroughs

### 4.1. Scenario 1: Campaign Creation & Execution

```mermaid
sequenceDiagram
    autonumber
    actor Marketer as Marketing User (Manager)
    participant UI as campaino-email-service-fe
    participant API as campaino-selzy
    participant DB as DB1 (PostgreSQL)
    participant UniOne as UniOne API

    Marketer->>UI: Uploads Excel recipient list (Spring_Promo.xlsx)
    UI->>API: POST /v1/email-list (Multipart)
    API->>API: Parse emails, dedupe, calculate record counts
    API->>DB: Insert EmailList row
    API-->>UI: 201 Created { id: "list-123", totalRecords: 5000 }

    Marketer->>UI: Designs template with WYSIWYG editor
    UI->>API: POST /v1/template
    API->>UniOne: POST /template/set.json (Sync template HTML)
    UniOne-->>API: { template: { id: "unione-tpl-456" } }
    API->>DB: Insert Template row with providerTemplateId
    API-->>UI: 201 Created { id: "tpl-789" }

    Marketer->>UI: Fills campaign form & selects assigned Domain
    UI->>API: POST /v1/campaign
    API->>DB: Insert Campaign row (hasCompleted: false)
    API-->>UI: 201 Created { id: "camp-001" }

    Marketer->>UI: Clicks "Run Campaign"
    UI->>API: POST /v1/campaign/run { campaignId: "camp-001" }
    API->>DB: Load Template, EmailList & Domain
    API->>API: Interpolate {{emailBody}}, {{link}}, {{ctaText}}
    API->>API: Split 5000 emails into 10 chunks of 500
    loop For each 500-recipient chunk
        API->>UniOne: POST /email/subscribe.json (metadata: camp-001)
        UniOne-->>API: 200 OK
        API->>DB: Insert 500 Email records with deliveryStatus = SENT
    end
    API->>DB: Update Campaign hasCompleted = true
    API-->>UI: 200 OK { message: "Campaign started", totalSent: 5000 }
```

---

### 4.2. Scenario 2: Controlled Funnel Metrics Injection

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Platform Admin / Manager
    participant UI as campaino-stater-service-fe
    participant BE as campaino-stater-service-be
    participant DB1 as DB1 (Shared DB)
    participant DB2 as DB2 (Audit DB)

    Admin->>UI: Opens Campaign "camp-001" stats page
    UI->>BE: GET /v1/campaign/camp-001/current-stats
    BE->>DB1: Count sent, delivered, unique opens, total opens, unique clicks, total clicks
    BE->>BE: Calculate eligibility limits
    BE-->>UI: 200 OK { snapshot: { sent: 5000, delivered: 4500, ... }, limits: { maxDelivered: 5000, ... } }

    Admin->>UI: Sets Target Delivered = 4800, Target Unique Opens = 2200
    UI->>UI: Validates targets against limits & monotonic rules
    Admin->>UI: Clicks "Update Stats" -> Confirms dialog
    UI->>BE: POST /v1/campaign/update-stats (FormData: delivered=4800, uniqueOpens=2200)

    BE->>BE: Validate RBAC & domain access
    BE->>BE: Validate funnel order: sent(5000) >= delivered(4800) >= uniqueOpens(2200)
    BE->>DB2: Insert CampaignUpdateHistory (initial snapshot record)
    
    rect rgb(240, 248, 255)
        Note over BE,DB1: DB1 Interactive Transaction
        BE->>DB1: Pick 300 random emails with status SENT -> update to DELIVERED
        BE->>DB1: Pick 400 random delivered emails -> insert Open rows & set status OPENED
    end

    alt Transaction Success
        BE->>DB2: Update CampaignUpdateHistory with new snapshot & userId
        BE-->>UI: 201 Created { message: "Campaign stats updated successfully", before, after }
        UI->>UI: Refresh funnel chart & show success toast
    else Transaction Failure
        BE->>DB2: Soft delete audit row (deletedAt = now())
        BE-->>UI: 500 Internal Error { message: "Transaction failed" }
    end
```

---

## 5. Development, Operations & Deployment Runbook

### 5.1. System Prerequisites
- **Node.js**: $\ge 20.18.2$ (Recommended: Node 22+ for frontend builds)
- **Package Managers**: `npm` ($\ge 11.1.0$) and `yarn` ($\ge 1.22.0$)
- **Database**: PostgreSQL 15, 16, or 17
- **Docker & Docker Compose**: Optional for containerized deployments

### 5.2. Master Environment Variables Reference

#### `campaino-selzy` (`.env`)
```bash
PORT=3000
DATABASE_URL="postgresql://postgres:secret@localhost:5432/emailcampaign?schema=public"
JWT_SECRET="CHANGE_ME_JWT_SECRET_MIN_16_CHARS"
JWT_Expiry="7d"
Security_Key="CHANGE_ME_SECURITY_KEY_MIN_16_CHARS"
BASE_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:8080,http://localhost:8081,http://localhost:5173"
UNIONE_API_KEY="CHANGE_ME_UNIONE_API_KEY"
UNIONE_API_BASE="https://api.unione.io/en/transactional/api/v1"
UNIONE_FROM_EMAIL="verified@yourdomain.com"
UNIONE_FROM_NAME="Campaino"
```

#### `campaino-email-service-fe` (`.env`)
```bash
VITE_API_URL="http://localhost:3000/v1"
```

#### `campaino-stater-service-be` (`.env`)
```bash
PORT=4001
JWT_SECRET="CHANGE_ME_JWT_SECRET_MIN_16_CHARS" # Must match campaino-selzy
DATABASE_URL="postgresql://postgres:secret@localhost:5432/emailcampaign?schema=public"
DATABASE_URL_DB2="postgresql://postgres:secret@localhost:5432/statstracker?schema=public"
CUSTOMERS_CSV_PATH="docs/customers-100000.csv"
MAX_STATS_INCREASE_PER_REQUEST=10000
MAX_UPLOAD_EMAILS=50000
ENABLE_SWAGGER=true
```

#### `campaino-stater-service-fe` (`.env`)
```bash
# In dev: leave unset to use Vite proxy -> http://localhost:3001/v1 or http://localhost:4001/v1
# In prod: set full URL
VITE_API_URL="http://localhost:4001/v1"
```

---

### 5.3. Step-by-Step Local Development Setup

#### Step 1: Start PostgreSQL Databases
Ensure two PostgreSQL databases exist: `emailcampaign` (DB1) and `statstracker` (DB2).
```bash
# Example via Docker:
docker run -d --name campaino-postgres -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:17
docker exec -it campaino-postgres psql -U postgres -c "CREATE DATABASE emailcampaign;"
docker exec -it campaino-postgres psql -U postgres -c "CREATE DATABASE statstracker;"
```

#### Step 2: Initialize Core Backend (`campaino-selzy`)
```bash
cd campaino-selzy
npm install
npm run db:push        # Push schema to DB1
npm run db:seed        # Seeds admin@campaino.com / Password123!
npm run dev            # Starts server on http://localhost:3000
```

#### Step 3: Initialize Stats Backend (`campaino-stater-service-be`)
```bash
cd ../campaino-stater-service-be
yarn install
yarn prisma            # Generate client1 and client2
yarn db:push:all       # Push schemas to DB1 and DB2
yarn dev               # Starts server on http://localhost:4001
```

#### Step 4: Start Frontend Applications
```bash
# Terminal A: Core Marketing UI
cd ../campaino-email-service-fe
npm install
npm run dev            # Starts on http://localhost:8080

# Terminal B: Stats Management UI
cd ../campaino-stater-service-fe
npm install
npm run dev            # Starts on http://localhost:8081
```

---

## 6. Architecture Decision Records (ADRs) & Engineering Gotchas

### ADR-01: Why Dual Databases for the Stats Microservice?
- **Decision**: DB2 is physically separated from DB1 for storing `CampaignUpdateHistory`.
- **Rationale**: Frequent simulation updates and audit logging create high write velocity. Isolating audit records guarantees that audit table growth or schema modifications do not impact production transactional performance in DB1. In addition, resetting or purging audit histories during development never endangers customer campaigns.

### ADR-02: Why Monotonic Target Totals instead of Additive Deltas?
- **Decision**: The API accepts target totals (`delivered = 4500`) instead of raw increments (`+200`).
- **Rationale**: Prevents race conditions from duplicated network retries. If two concurrent requests attempt to add 200, an additive endpoint risks applying the increment twice. A target-total endpoint is idempotent with respect to the desired state.

### ADR-03: Template Merge Variable Naming Conventions
- **Gotcha**: There are two distinct body concepts:
  - `htmlBody`: The master template HTML structure stored in `Template.emailBody`.
  - `messageBody`: The per-campaign custom message stored in `Campaign.emailBody`.
  - In templates, the merge tag to be interpolated is strictly `{{emailBody}}`.
