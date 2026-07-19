# MASTER MIGRATION PLAN: Santri-Pay → Cloudflare (D1 + BetterAuth)

**Project:** Santri-Pay (Sistem Rekap Keuangan Pesantren)
**Tanggal:** 18 Juli 2026
**Target:** 3 Minggu (21 hari kerja)
**Strategy:** Full Cloudflare Native (Zero Supabase Dependency)

---

## Executive Summary

Rencana migrasi ini mengkombinasikan:
1. **Analisis codebase terdahulu** (Supabase usage audit)
2. **Plan sebelumnya** (Fase 1-4 dari implementation_plan_ke_Cloudflare.md)
3. **Optimasi untuk Antigravity IDE** (100% executable)
4. **AI Model & Prompt Templates** (untuk setiap fase)

### Teknologi Stack Target

| Komponen | Sebelum | Sesudah |
|----------|---------|---------|
| Database | Supabase PostgreSQL | Cloudflare D1 (SQLite) |
| ORM | Supabase SDK | Drizzle ORM |
| Auth | Supabase Auth | BetterAuth |
| Runtime | Cloudflare Workers | Cloudflare Workers |
| CI/CD | Lovable | GitHub Actions |
| Framework | TanStack Start | TanStack Start |

### Estimasi Biaya

| Service | Supabase | Cloudflare |
|---------|----------|-----------|
| Database | ~$25/mo | $0 (5GB free) |
| Auth | included | $0 (BetterAuth) |
| Workers | included | 100k req/day free |
| Bandwidth | limited | 10GB/mo free |
| **Total** | **~$50/mo** | **~$0/mo** |

---

## AI Model Recommendations

Untuk setiap fase migrasi, gunakan model AI yang tepat:

| Fase | Model AI | Alasan |
|------|----------|--------|
| Setup & Config | **Claude Sonnet** | Teknis, cepat, cost-effective |
| Schema Conversion | **Claude Sonnet** | Analitis, akurat |
| Auth Implementation | **Claude Opus** | Kompleks, security-critical |
| CRUD Refactoring | **Claude Sonnet** | Repetitif, pattern-based |
| Testing & Debug | **Claude Sonnet** | Analitis |
| Final Review | **Claude Opus** | Quality assurance |

---

## Phase 1: Infrastructure & Database Setup

### AI Prompt Template (Setup Phase)

```
PROMPT FOR: Cloudflare D1 Setup
MODEL: Claude Sonnet 5

CONTEXT:
- Project: Santri-Pay (Sistem Rekap Keuangan Pesantren)
- Current: Supabase PostgreSQL
- Target: Cloudflare D1 + Drizzle ORM
- Tech Stack: TanStack Start, React 19, TypeScript, Bun

TASK:
1. Install dependencies: drizzle-orm, drizzle-kit, better-sqlite3
2. Create wrangler.toml with D1 database binding
3. Create initial D1 database named "santri-pay-dev"
4. Generate drizzle config file

STEPS:
{aq}
1. Run: bun add drizzle-orm better-sqlite3
2. Run: bun add -D drizzle-kit
3. Create drizzle.config.ts with:
   - schema path: "./src/lib/db/schema.ts"
   - out dir: "./drizzle"
   - dialect: sqlite
   - dbCredentials: fromEnv()
4. Create wrangler.toml:
   - name: "santri-pay"
   - main: "./dist/server.js"
   - compatibility_date: "2024-01-01"
   - [[d1_databases]]
     - binding: "DB"
     - database_name: "santri-pay-dev"
     - database_id: "YOUR_DATABASE_ID"
5. Run: wrangler d1 create santi-pay-dev
6. Update wrangler.toml with returned database_id
{/aq}

After setup, verify:
- drizzle.config.ts exists and is valid
- wrangler.toml has correct D1 binding
- No TypeScript errors in config files
```

### Tasks: Phase 1

| No | Task | Command | Estimated |
|----|------|---------|-----------|
| 1.1 | Install Drizzle ORM | `bun add drizzle-orm better-sqlite3` | 5 min |
| 1.2 | Install Drizzle Kit (dev) | `bun add -D drizzle-kit` | 5 min |
| 1.3 | Create Drizzle config | `touch drizzle.config.ts` | 10 min |
| 1.4 | Create wrangler.toml | `touch wrangler.toml` | 15 min |
| 1.5 | Create D1 database | `wrangler d1 create santi-pay-dev` | 5 min |
| 1.6 | Create schema directory | `mkdir -p src/lib/db` | 5 min |

### Expected Output: Phase 1

```
src/lib/db/
├── schema.ts          # Database schema
├── index.ts           # DB exports
└── queries.ts         # Query helpers

wrangler.toml          # Updated with D1 binding
drizzle.config.ts     # Drizzle configuration
```

---

## Phase 2: Schema Conversion (PostgreSQL → D1 SQLite)

### AI Prompt Template (Schema Conversion)

```
PROMPT FOR: PostgreSQL to SQLite Schema Conversion
MODEL: Claude Sonnet 5

CONTEXT:
- Source: supabase/migrations/*.sql files
- Target: Drizzle schema in src/lib/db/schema.ts
- Database: Cloudflare D1 (SQLite)

TABLES TO CONVERT (from supabase/migrations/):
1. profiles - User profiles
2. user_roles - Role assignments (admin, bendahara)
3. tahun_ajaran - Academic years
4. kelas - Classes
5. jenis_tagihan - Fee types
6. tagihan - Billing/invoices
7. pembayaran - Payments
8. audit_logs - Audit trail
9. whatsapp_logs - WhatsApp message logs
10. app_settings - System settings
11. riwayat_kelas - Class history
12. kwitansi_counter - Receipt numbering

MAPPING RULES:
- UUID → TEXT (SQLite doesn't have UUID)
- SERIAL → INTEGER PRIMARY KEY
- TIMESTAMP → TEXT (ISO 8601)
- JSONB → TEXT (store as JSON string)
- NOW() → CURRENT_TIMESTAMP
- Remove: RLS policies, triggers, functions

EXAMPLE CONVERSION:
PostgreSQL:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active'

SQLite (Drizzle):
  id: text('id').primaryKey(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  name: text('name').notNull(),
  status: text('status').default('active')
```

### Current Schema from Supabase Migrations

**File locations:** `supabase/migrations/*.sql`

### Schema Mapping (PostgreSQL → SQLite)

| PostgreSQL | SQLite/Drizzle | Notes |
|------------|---------------|-------|
| UUID | TEXT | Primary keys |
| SERIAL | INTEGER | Auto-increment |
| TIMESTAMPTZ | TEXT | ISO 8601 strings |
| JSONB | TEXT | JSON.stringify |
| NOW() | CURRENT_TIMESTAMP | SQLite function |
| gen_random_uuid() | crypto.randomUUID() | JS function |
| ENUM | TEXT | Check application code |
| RLS | N/A | Handle in app code |
| Triggers | Application logic | Move to API layer |

### Tasks: Phase 2

| No | Task | Input | Output |
|----|------|-------|--------|
| 2.1 | Read all migrations | `supabase/migrations/*.sql` | SQL content |
| 2.2 | Create base tables | SQL DDL | `src/lib/db/schema.ts` |
| 2.3 | Add indexes | SQL indexes | Schema additions |
| 2.4 | Create seed data | Migration seeds | Seed file |
| 2.5 | Run local migration | wrangler | D1 local DB |
| 2.6 | Verify schema | wrangler d1 execute | Tables created |

### Expected Schema Structure

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tables in order (respecting foreign keys)
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email'),
  fullName: text('full_name'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at'),
});

export const userRoles = sqliteTable('user_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => profiles.id),
  role: text('role').notNull(), // 'admin' | 'bendahara'
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const tahunAjaran = sqliteTable('tahun_ajaran', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  tahunMulai: integer('tahun_mulai').notNull(),
  tahunSelesai: integer('tahun_selesai').notNull(),
  isAktif: integer('is_aktif', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// ... continue for all tables
```

---

## Phase 3: Authentication with BetterAuth

### AI Prompt Template (BetterAuth Setup)

```
PROMPT FOR: BetterAuth Implementation
MODEL: Claude Opus 5 (Security-critical, use strongest model)

CONTEXT:
- Framework: TanStack Start with Nitro (Cloudflare Workers)
- Database: Cloudflare D1 via Drizzle ORM
- Auth Library: BetterAuth (better-auth.vercel.app)
- Current: Supabase Auth with email/password

TASK:
1. Install BetterAuth dependencies
2. Create auth schema extensions
3. Setup BetterAuth instance
4. Configure auth handlers
5. Update middleware
6. Update login/logout UI

BETTERAUTH SCHEMA REQUIREMENTS:
BetterAuth requires these tables:
- users (id, name, email, emailVerified, image, createdAt, updatedAt)
- sessions (id, expiresAt, token, userId, createdAt, updatedAt)
- accounts (id, accountId, providerId, userId, accessToken, refreshToken, idToken, scope, password, createdAt, updatedAt)
- verifications (id, identifier, value, expiresAt, createdAt, updatedAt)

IMPORTANT NOTES:
- BetterAuth has built-in Cloudflare Workers adapter
- Use drizzle adapter for database
- Handle sessions with KV for edge storage
- Keep existing username/password flow

SECURITY REQUIREMENTS:
- Password hashing with bcrypt/scrypt
- Session tokens stored in KV
- CSRF protection
- Rate limiting on login attempts
```

### BetterAuth Setup Steps

| No | Task | Command | Notes |
|----|------|---------|-------|
| 3.1 | Install BetterAuth | `bun add better-auth` | Core library |
| 3.2 | Install Drizzle Adapter | `bun add @auth/drizzle-adapter` | Database adapter |
| 3.3 | Install KV Adapter | Check if needed | Session storage |
| 3.4 | Create auth config | `src/lib/auth/index.ts` | BetterAuth instance |
| 3.5 | Add auth schema | Extend existing schema | Users, sessions, etc. |
| 3.6 | Create API routes | `src/routes/api/auth/*` | Login, logout, etc. |
| 3.7 | Update middleware | `src/lib/auth.ts` | Check session |
| 3.8 | Update UI | `src/routes/auth.tsx` | New login form |

### Expected Auth Structure

```
src/lib/auth/
├── index.ts           # BetterAuth instance
├── drizzle.ts         # Drizzle adapter
├── kv.ts              # KV adapter (optional)
├── middleware.ts      # Auth middleware
└── types.ts           # Auth types

src/routes/api/auth/
├── [...all].ts        # BetterAuth catch-all
├── login.ts           # Custom login
└── logout.ts         # Custom logout

src/routes/auth.tsx    # Updated login page
```

---

## Phase 4: CRUD Refactoring

### AI Prompt Templates (CRUD Refactoring)

#### Template A: Query Conversion

```
PROMPT FOR: Supabase to Drizzle Query Conversion
MODEL: Claude Sonnet 5

CONTEXT:
File to refactor: {FILE_PATH}
Replace all Supabase queries with Drizzle ORM queries

BEFORE (Supabase):
{supabase_code}

AFTER (Drizzle):
- Use drizzle-orm queries
- Keep same return type
- Handle null cases properly
- Use async/await correctly for Workers
```

#### Template B: Server Function Creation

```
PROMPT FOR: Server Function Creation
MODEL: Claude Sonnet 5

CONTEXT:
TanStack Start with createServerFn
Database: Drizzle ORM with D1
Auth: BetterAuth session in context

TASK:
Create server function for {OPERATION} operation

PATTERN:
import { createServerFn } from '@tanstack/start/server';
import { db } from '~/lib/db';
import { tableName } from '~/lib/db/schema';
import { auth } from '~/lib/auth';

export const get{Entity}Fn = createServerFn({ method: 'GET' })
  .validator(/* zod schema */)
  .handler(async (event) => {
    // Auth check
    const session = await auth.getSession(event.request);
    if (!session) throw new Error('Unauthorized');

    // Query with drizzle
    return await db.select().from(tableName);
  });

export const create{Entity}Fn = createServerFn({ method: 'POST' })
  .validator(/* zod schema */)
  .handler(async (event) => {
    const session = await auth.getSession(event.request);
    if (!session) throw new Error('Unauthorized');

    const data = event.data;
    return await db.insert(tableName).values(data).returning();
  });
```

### Files to Refactor

#### Dashboard & Overview
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/index.tsx` | SELECT dashboard stats | High |
| `src/routes/_authenticated/index.tsx` | SELECT recent payments | High |

#### Master Data
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/master.santri.tsx` | CRUD + list | High |
| `src/routes/_authenticated/master.kelas.tsx` | CRUD + list | High |
| `src/routes/_authenticated/master.jenis-tagihan.tsx` | CRUD + list | Medium |
| `src/routes/_authenticated/master.tahun-ajaran.tsx` | CRUD + list | Medium |

#### Transactions
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/tagihan.index.tsx` | CRUD + generate | High |
| `src/routes/_authenticated/tagihan.$id.tsx` | Detail + payment | High |
| `src/routes/_authenticated/pembayaran.tsx` | List + filter | Medium |

#### Reports
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/laporan.tsx` | SELECT reports | Medium |
| `src/routes/_authenticated/rekap.santri.tsx` | SELECT recap | Medium |
| `src/routes/_authenticated/rekap.tunggakan.tsx` | SELECT tunggakan | Medium |

#### WhatsApp
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/whatsapp.broadcast.tsx` | SELECT + send | Low |
| `src/routes/_authenticated/whatsapp.riwayat.tsx` | SELECT logs | Low |
| `src/lib/whatsapp-server.ts` | HTTP call | Low |

#### Settings
| File | Operations | Priority |
|------|-----------|----------|
| `src/routes/_authenticated/pengaturan.index.tsx` | SELECT + UPDATE | Medium |
| `src/routes/_authenticated/pengaturan.pengguna.tsx` | CRUD users | High |
| `src/routes/_authenticated/pengaturan.audit.tsx` | SELECT logs | Low |

### Query Pattern Mapping

| Supabase | Drizzle |
|----------|---------|
| `supabase.from('table').select()` | `db.select().from(table)` |
| `supabase.from('table').insert()` | `db.insert(table).values()` |
| `supabase.from('table').update().eq()` | `db.update(table).set().where()` |
| `supabase.from('table').delete().eq()` | `db.delete(table).where()` |
| `.eq('field', value)` | `eq(table.field, value)` |
| `.neq('field', value)` | `ne(table.field, value)` |
| `.in('field', [...])` | `inArray(table.field, [...])` |
| `.order('field')` | `orderBy(table.field)` |
| `.limit(n)` | `limit(n)` |
| `.select('*, relation:*')` | `db.select().from(t).leftJoin(r, ...)` |

### Tasks: Phase 4

| No | Component | Files | Estimated |
|----|-----------|-------|-----------|
| 4.1 | Database layer | `src/lib/db/*` | 1 day |
| 4.2 | Dashboard | `index.tsx` | 0.5 day |
| 4.3 | Master Santri | `master.santri.tsx` | 1 day |
| 4.4 | Master Kelas | `master.kelas.tsx` | 0.5 day |
| 4.5 | Master Tagihan | `master.jenis-tagihan.tsx` | 0.5 day |
| 4.6 | Tagihan | `tagihan.*.tsx` | 1.5 day |
| 4.7 | Pembayaran | `pembayaran.tsx` | 0.5 day |
| 4.8 | Reports | `laporan.tsx`, `rekap.*.tsx` | 1 day |
| 4.9 | WhatsApp | `whatsapp.*.tsx` | 0.5 day |
| 4.10 | Settings | `pengaturan.*.tsx` | 1 day |

---

## Phase 5: CI/CD Pipeline

### AI Prompt Template (CI/CD Setup)

```
PROMPT FOR: GitHub Actions + Wrangler CI/CD
MODEL: Claude Sonnet 5

CONTEXT:
- Framework: TanStack Start
- Runtime: Cloudflare Workers
- Package Manager: Bun
- Database: Cloudflare D1

TASK:
Create GitHub Actions workflow for:
1. Lint and type-check
2. Run tests
3. Build application
4. Deploy to Cloudflare Workers
5. Run D1 migrations on deploy

REQUIREMENTS:
- Use Bun for package management
- Use cloudflare/wrangler-action for deploy
- Store secrets in GitHub Secrets
- Support branch-based deployments
- Run migrations as part of deploy pipeline
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Build
        run: bun run build
        env:
          # Add needed env vars

      - name: Run D1 migrations
        run: |
          bunx wrangler d1 migrations apply santri-pay-dev --local
          bunx wrangler d1 migrations apply santi-pay-prod --env production

      - name: Deploy to Cloudflare (Production)
        if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production

      - name: Deploy Preview
        if: github.event_name == 'pull_request'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env preview
```

### Secrets Required

| Secret | Where to Get | Purpose |
|--------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard | Deploy authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard | Account identifier |
| `CLOUDFLARE_DATABASE_ID` | From wrangler d1 create | D1 database ID |

---

## Phase 6: Data Migration

### AI Prompt Template (Data Migration)

```
PROMPT FOR: Supabase to D1 Data Migration
MODEL: Claude Sonnet 5

CONTEXT:
- Source: Supabase PostgreSQL (production data)
- Target: Cloudflare D1 (SQLite)
- Data size: ~10,000 records (estimated)
- Tables to migrate: 12 tables

MIGRATION STRATEGY:
1. Export from Supabase via pg_dump or API
2. Transform data to SQLite-compatible format
3. Import to D1 via wrangler d1 execute

IMPORTANT:
- Convert UUIDs to TEXT
- Convert timestamps to ISO 8601 strings
- Handle NULL values properly
- Maintain referential integrity
- Run in transaction where possible
```

### Migration Script Template

```typescript
// scripts/migrate-data.ts
// Run this ONCE to migrate data from Supabase to D1

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../src/lib/db/schema';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const db = drizzle(process.env.D1_DATABASE!, { schema });

async function migrate() {
  console.log('Starting data migration...');

  // Migrate in order (respecting foreign keys)
  // 1. profiles
  console.log('Migrating profiles...');
  const profiles = await supabase.from('profiles').select('*');
  for (const p of profiles.data ?? []) {
    await db.insert(schema.profiles).values({
      id: p.id,
      username: p.username,
      email: p.email,
      fullName: p.full_name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }).onConflictDoNothing();
  }

  // 2. user_roles
  console.log('Migrating user_roles...');
  // ... similar pattern

  // Continue for all tables...

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

### Migration Order (Respecting Foreign Keys)

| Order | Table | Foreign Keys To |
|-------|-------|----------------|
| 1 | profiles | None |
| 2 | tahun_ajaran | None |
| 3 | kelas | tahun_ajaran |
| 4 | jenis_tagihan | None |
| 5 | user_roles | profiles |
| 6 | app_settings | None |
| 7 | kwitansi_counter | None |
| 8 | tahun_ajaran | profiles (created_by) |
| 9 | kelas | profiles (created_by), tahun_ajaran |
| 10 | kelas | profiles (wali_kelas_id) |
| 11 | riwayat_kelas | profiles (santri_id), kelas |
| 12 | santri | profiles (created_by), kelas |
| 13 | tagihan | profiles (created_by), tahun_ajaran, jenis_tagihan, kelas, santri |
| 14 | pembayaran | profiles (created_by), tagihan, tahun_ajaran |
| 15 | audit_logs | profiles (user_id) |
| 16 | whatsapp_logs | profiles (user_id), tahun_ajaran |

---

## Phase 7: Testing & Deployment

### AI Prompt Template (Testing)

```
PROMPT FOR: Comprehensive Testing
MODEL: Claude Sonnet 5

CONTEXT:
- Application: Santri-Pay financial management
- Testing scope: Full application regression
- Test environment: Cloudflare Workers preview

TESTING CHECKLIST:

1. AUTHENTICATION
   [ ] Login with valid credentials
   [ ] Login with invalid credentials (error shown)
   [ ] Logout clears session
   [ ] Protected routes redirect to login
   [ ] Role-based access (admin vs bendahara)

2. DASHBOARD
   [ ] Statistics load correctly
   [ ] Charts render
   [ ] Recent payments list
   [ ] Quick action buttons work

3. MASTER DATA - SANTRI
   [ ] List all students
   [ ] Filter by status, class
   [ ] Search by name/NIS
   [ ] Add new student
   [ ] Edit student
   [ ] Delete student (admin only)
   [ ] View student detail

4. MASTER DATA - KELAS
   [ ] List all classes
   [ ] Add new class
   [ ] Edit class
   [ ] Delete class
   [ ] Class statistics

5. MASTER DATA - TAGIHAN
   [ ] List fee types
   [ ] Add fee type
   [ ] Edit fee type
   [ ] Delete fee type

6. TRANSACTIONS - TAGIHAN
   [ ] Generate bulk tagihan
   [ ] View tagihan list
   [ ] Filter tagihan
   [ ] Edit tagihan amount
   [ ] Delete tagihan

7. TRANSACTIONS - PEMBAYARAN
   [ ] Record payment
   [ ] Edit payment
   [ ] Delete payment
   [ ] View payment history
   [ ] Generate kwitansi

8. REPORTS
   [ ] Monthly report
   [ ] Annual report
   [ ] Student recap
   [ ] Outstanding balances (tunggakan)

9. WHATSAPP
   [ ] Send reminder
   [ ] Send confirmation
   [ ] Broadcast message
   [ ] View message history

10. SETTINGS
    [ ] Update app settings
    [ ] Manage users
    [ ] View audit logs
```

### Deployment Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Create production D1 database | [ ] |
| 2 | Run migrations on production | [ ] |
| 3 | Migrate production data | [ ] |
| 4 | Configure production secrets | [ ] |
| 5 | Deploy to production | [ ] |
| 6 | Run smoke tests | [ ] |
| 7 | DNS switch (if needed) | [ ] |
| 8 | Monitor for 24 hours | [ ] |
| 9 | Decommission Supabase | [ ] |

---

## Implementation Order (100% Executable)

### Week 1: Infrastructure & Auth

| Day | Morning | Afternoon |
|-----|---------|-----------|
| 1 | Setup D1 + Drizzle | Read migrations, plan schema |
| 2 | Create schema.ts | Add migrations to D1 |
| 3 | Install BetterAuth | Configure auth schema |
| 4 | Implement auth handlers | Test login/logout |
| 5 | Update auth middleware | Verify auth flow |

### Week 2: CRUD Refactoring

| Day | Morning | Afternoon |
|-----|---------|-----------|
| 6 | Create query helpers | Dashboard queries |
| 7 | Master Santri CRUD | Master Santri CRUD |
| 8 | Master Kelas CRUD | Master Jenis Tagihan |
| 9 | Tagihan CRUD | Tagihan CRUD |
| 10 | Pembayaran CRUD | Laporan queries |

### Week 3: Polish & Deploy

| Day | Morning | Afternoon |
|-----|---------|-----------|
| 11 | Reports completion | Settings pages |
| 12 | WhatsApp integration | Cleanup Supabase code |
| 13 | CI/CD setup | Migration scripts |
| 14 | Data migration test | Full testing |
| 15 | Production deploy | Monitoring |

---

## Quick Start Prompts for Antigravity IDE

### Day 1 Prompt (Setup)

```
AI: Claude Sonnet

"Setup Cloudflare D1 database for Santri-Pay project:
1. Install drizzle-orm, drizzle-kit, and better-sqlite3
2. Create drizzle.config.ts
3. Update/create wrangler.toml with D1 binding
4. Run 'wrangler d1 create santi-pay-dev'
5. Create src/lib/db/ directory structure
6. Create initial empty schema.ts file with table placeholders

Working directory: D:\Ai\santri-pay-main
```

### Day 2-3 Prompt (Schema)

```
AI: Claude Sonnet

"Convert PostgreSQL schema from supabase/migrations/ to Drizzle schema:
1. Read all migration files in supabase/migrations/
2. Convert each table to Drizzle SQLite schema
3. Save to src/lib/db/schema.ts
4. Create src/lib/db/index.ts for exports
5. Create first migration file in drizzle/ folder
6. Run migration locally with wrangler

Key conversions:
- UUID → text()
- SERIAL → integer().primaryKey({ autoIncrement: true })
- TIMESTAMPTZ → text()
- Remove RLS policies, keep table structures
- Preserve foreign keys
```

### Day 4-5 Prompt (Auth)

```
AI: Claude Opus

"Implement BetterAuth for Santri-Pay:
1. Install better-auth package
2. Create auth schema extensions (users, sessions, accounts, verifications)
3. Create src/lib/auth/index.ts with BetterAuth instance
4. Configure drizzle adapter for BetterAuth
5. Create auth API routes in src/routes/api/auth/
6. Update src/hooks/use-auth.ts for BetterAuth
7. Update src/routes/auth.tsx login page
8. Test complete auth flow

IMPORTANT:
- Keep existing username/password flow (admin@pesantren.internal pattern)
- Use Drizzle adapter
- Configure for Cloudflare Workers environment
```

### Day 6-10 Prompt (CRUD)

```
AI: Claude Sonnet

"Refactor CRUD operations from Supabase to Drizzle:

For each file, convert Supabase queries to Drizzle:

Pattern:
- supabase.from('table').select() → db.select().from(table)
- supabase.from('table').insert() → db.insert(table).values()
- supabase.from('table').update().eq() → db.update(table).set().where()
- Use createServerFn from @tanstack/start/server

Files to refactor:
1. src/routes/_authenticated/index.tsx (dashboard)
2. src/routes/_authenticated/master.santri.tsx
3. src/routes/_authenticated/master.kelas.tsx
4. src/routes/_authenticated/master.jenis-tagihan.tsx
5. src/routes/_authenticated/master.tahun-ajaran.tsx
6. src/routes/_authenticated/tagihan.index.tsx
7. src/routes/_authenticated/tagihan.$id.tsx
8. src/routes/_authenticated/pembayaran.tsx
9. src/routes/_authenticated/laporan.tsx
10. src/routes/_authenticated/rekap.santri.tsx
11. src/routes/_authenticated/rekap.tunggakan.tsx

Start with dashboard (index.tsx) and work through list.
After each file conversion, verify it compiles without errors.
```

### Day 11-12 Prompt (Settings & Integration)

```
AI: Claude Sonnet

"Complete remaining refactoring and integrations:
1. Refactor pengaturan pages (settings, users, audit)
2. Update WhatsApp integration in src/lib/whatsapp-server.ts
3. Remove all Supabase imports from codebase
4. Update package.json to remove @supabase/supabase-js
5. Create server functions for complex operations:
   - assign_nomor_kwitansi
   - recalc_tagihan
6. Test all CRUD operations work correctly

Verify no Supabase imports remain in src/ directory."
```

### Day 13-14 Prompt (Migration & Deploy)

```
AI: Claude Sonnet

"Setup CI/CD and prepare for production:
1. Create .github/workflows/deploy.yml
2. Configure GitHub Secrets in repo settings
3. Create data migration script in scripts/migrate-data.ts
4. Test migration script against local D1
5. Create production D1 database: wrangler d1 create santi-pay-prod
6. Run migrations on production D1
7. Deploy to Cloudflare Workers
8. Run full smoke tests on deployed version

Secrets needed:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
```

### Day 15 Prompt (Final Testing)

```
AI: Claude Opus

"Final testing and deployment verification:
1. Run full regression test suite
2. Verify all CRUD operations work in production
3. Check authentication flow end-to-end
4. Verify WhatsApp integration works
5. Test reports generate correctly
6. Monitor Cloudflare Workers analytics
7. Verify no Supabase dependencies remain

Create final report with:
- All features tested and status
- Any issues found and resolutions
- Performance metrics
- Deployment URL
```

---

## File Summary After Migration

### Directory Structure

```
santri-pay/
├── src/
│   ├── lib/
│   │   ├── auth/           # BetterAuth (NEW)
│   │   │   ├── index.ts
│   │   │   └── middleware.ts
│   │   └── db/              # Drizzle (REFACTORED)
│   │       ├── schema.ts
│   │       ├── index.ts
│   │       └── queries.ts
│   ├── routes/
│   │   ├── api/auth/        # Auth API (NEW)
│   │   ├── _authenticated/ # All pages (REFACTORED)
│   │   └── auth.tsx         # Login page (REFACTORED)
│   ├── hooks/
│   │   └── use-auth.ts      # Auth hook (REFACTORED)
│   └── integrations/         # CLEANED (supabase removed)
├── drizzle/                 # Drizzle migrations (NEW)
│   └── migrations/
├── scripts/                 # Migration scripts (NEW)
│   └── migrate-data.ts
├── wrangler.toml           # Updated
├── drizzle.config.ts        # New
├── .github/workflows/       # CI/CD (NEW)
│   └── deploy.yml
└── supabase/               # Can be archived/deleted
```

### Dependencies Change

```diff
- @supabase/supabase-js
+ better-auth
+ @auth/drizzle-adapter
+ drizzle-orm
+ better-sqlite3
```

---

## Rollback Plan

If migration fails at any point:

1. **Keep Supabase as fallback** - Don't delete Supabase project yet
2. **Use feature flags** - Could implement temporary feature flag to switch between Supabase/D1
3. **Quick rollback** - Point DNS back to Lovable deployment
4. **Database backup** - Full backup before migration starts

---

## Success Criteria

- [ ] All 12 database tables migrated to D1
- [ ] All CRUD operations work via Drizzle
- [ ] Authentication works with BetterAuth
- [ ] No Supabase code remains in src/
- [ ] CI/CD pipeline working
- [ ] Production deployment successful
- [ ] All smoke tests pass
- [ ] Supabase project can be safely deleted

---

*Document Version: 2.0 (Combined Plan)*
*Last Updated: 18 Juli 2026*
*Status: Ready for Execution*
