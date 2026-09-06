# 🧊 AgroStore — Agri Cold Storage Booking API

Backend for a cold-storage marketplace where Bangladeshi farmers reserve refrigerated capacity **by the kilogram for an exact date window**, pay storage rent through Stripe, have their produce quality-graded at intake, and settle a recalculated bill on withdrawal.

| | |
|---|---|
| **Live API** | https://sojibislam9878assignment6.vercel.app |
| **API Documentation** | https://documenter.getpostman.com/view/54802755/2sBYAxNoag |
| **Repository** | https://github.com/sojibislam9878/l2-a6 |
| **Health check** | https://sojibislam9878assignment6.vercel.app/ |

---

## Demo credentials

Demo accounts covering all three roles are **provided separately with the submission**, and are not published here.

`npm run db:seed` creates them locally: one admin, four farmers (one deliberately banned, to demonstrate the `403`) and three warehouse owners. All are seeded pre-verified, so they log in immediately with no OTP step.

```bash
curl -X POST https://sojibislam9878assignment6.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}'
```

---

## The problem

Bangladesh loses a large share of its potato, onion and vegetable harvest every season because farmers cannot find or reserve cold-storage space at harvest peak. Capacity is sold by phone and paper ledger, so the same chamber gets double-committed, farmers arrive at a full warehouse, and produce rots on the truck.

AgroStore is the booking and settlement layer for that market.

```
Farmer                      Warehouse Owner              Admin
  │                               │                        │
  ├─ search warehouses            ├─ register warehouse    ├─ approve warehouse
  ├─ check real availability      ├─ define chambers       ├─ grade intake quality
  ├─ book capacity  ───────────►  ├─ approve booking       ├─ manage users
  ├─ pay via Stripe ───────────►  ├─ store the lot         ├─ issue refunds
  ├─ request withdrawal ───────►  ├─ release + final bill  └─ read audit logs
  └─ review the warehouse
```

---

## Three roles

| Role | Can do | Blocked from |
|---|---|---|
| `FARMER` | Search, check availability, book, pay, withdraw, review, manage own profile | Approving bookings, other farmers' lots, any admin route |
| `WAREHOUSE_OWNER` | Register warehouses and chambers, set pricing, approve/reject bookings, store and release lots | Another owner's warehouse, quality grading, user management |
| `ADMIN` | Approve warehouses, record inspections, manage crop types and users, refunds, audit logs, platform stats | — (every action is audit-logged) |

**Admin accounts cannot be created through the API.** Signup rejects `role: "ADMIN"` with a `400`; the only path is an existing admin promoting a user via `PATCH /admin/users/:id/role`.

---

## What makes this more than CRUD

### Capacity is kilograms × overlapping date ranges

A chamber is not "free" or "taken" — it holds a quantity, and bookings overlap in time. A new booking must fit under the **peak committed load inside its own window**.

```
Chamber capacity: 10,000 kg

Booking A  3,000kg  ├──────────────┤          Mar 1 – Mar 20
Booking B  4,000kg         ├───────────────┤  Mar 10 – Mar 31
Booking C  2,000kg  ├───┤                     Mar 1 – Mar 8

Daily load:  Mar 1-8   → 5,000    (A+C)
             Mar 9     → 3,000    (A)
             Mar 10-20 → 7,000    (A+B)  ← PEAK
             Mar 21-31 → 4,000    (B)

A request for Mar 5 – Mar 25 competes with the 7,000 kg peak,
so only 3,000 kg is actually available.
```

Computed by a sweep line over booking edges in `src/utils/capacity.ts` — `O(n log n)` on overlapping bookings only, backed by the composite index `bookings(chamber_id, status, start_date, end_date)`.

### Two farmers cannot book the same last kilogram

`POST /bookings` takes a **row lock on the chamber** inside a transaction, recomputes the peak load *inside* the lock, and only then inserts:

```ts
await tx.$queryRaw`SELECT id FROM chambers WHERE id = ${chamberId} FOR UPDATE`;
```

Two simultaneous requests for the last 500 kg produce **one `201` and one `409`** — never two bookings. A `SELECT`-then-`INSERT` without the lock would let both through.

`FOR UPDATE` was chosen over `isolationLevel: Serializable` deliberately: serializable fails the loser with a retry-able `40001`, whereas the row lock makes it *wait* and then fail with a business-meaningful `409 Only 300kg available for the selected dates`.

### Money is conditional and recalculated

An estimate at booking, a real charge at payment, and a settlement at withdrawal:

```
billableDays = max(actualDaysStored, warehouse.minBookingDays)
baseCost     = quantityKg × ratePerKgPerDay × billableDays
overstayDays = max(0, actualDays − bookedDays)
surcharge    = quantityKg × ratePerKgPerDay × overstayDays × 0.5
finalCost    = baseCost + surcharge
```

Early withdrawal still pays the minimum-days floor; an overstay pays 1.5× on the extra days.

### A nine-state booking machine

```
PENDING_APPROVAL ──approve──► APPROVED ──pay──► PAID ──store──► STORED
       │                          │                               │
       ├─reject─► REJECTED        ├─expires─► EXPIRED             ▼
       └─cancel─► CANCELLED       └─cancel──► CANCELLED   WITHDRAW_REQUESTED
                                                                  │
                                                                  ▼
                                                             COMPLETED
```

Every illegal transition returns `409` naming the states you *can* reach. `COMPLETED`, `REJECTED`, `CANCELLED` and `EXPIRED` are terminal.

### Business rules enforced in services

- A crop's ideal temperature range must fit **inside** the chamber's range → `422`
- Duration ≥ warehouse `minBookingDays`, ≤ crop `maxStorageDays` → `422`
- A warehouse must be admin-`APPROVED` before it accepts bookings → `409`
- Inspection grade `REJECTED` cancels the booking **in the same transaction** and blocks storage
- A review requires a `COMPLETED` booking the caller owns, one per booking
- Role changes are refused when they would orphan warehouses or active bookings

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+, TypeScript 5.9 (strict, ESM) |
| Framework | Express 5 |
| Database | PostgreSQL (Prisma Postgres) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Validation | Zod 4 |
| Auth | JWT access + refresh, bcrypt, Google OAuth 2.0 |
| Payments | Stripe Checkout + signed webhook |
| Cache / limits | Redis (Upstash) — response cache, rate limits, OTP, token denylist |
| Email | Resend (OTP verification) |
| Security | helmet, cors, express-rate-limit |
| Tooling | Biome, tsup, tsx |
| Deployment | Vercel |

---

## Getting started

```bash
git clone https://github.com/sojibislam9878/l2-a6.git
cd l2-a6
npm install
```

Create `.env` in the project root:

```env
NODE_ENV=development
PORT=8000
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require

BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET=<48+ random bytes>
JWT_REFRESH_SECRET=<a different 48+ random bytes>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DEMO_FX_RATE=0.0085

REDIS_URL=rediss://default:PASSWORD@HOST.upstash.io:6379

RESEND_API_KEY=re_...
EMAIL_FROM=AgroStore <onboarding@resend.dev>
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
```

Generate the JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then:

```bash
npm run db:generate     # generate the Prisma Client
npm run db:migrate      # apply migrations
npm run db:seed         # wipe and load demo data
npm run dev             # http://localhost:8000
```

Every environment variable is validated by Zod **at boot** (`src/config/env.ts`). A missing or malformed value stops the server with a message naming the exact variable, rather than failing later on a random request.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Bundle to `dist/server.js` (tsup) |
| `npm start` | Run the bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome check with fixes |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:seed` | Wipe and reseed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run test:e2e` | 122-check end-to-end suite against a running server |

---

## API overview

Base path: **`/api/v1`** · 73 endpoints · full request/response examples in the [Postman documentation](https://documenter.getpostman.com/view/54802755/2sBYAxNoag).

### Response envelope

```jsonc
// success
{ "success": true, "message": "...", "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }

// error
{ "success": false, "message": "Validation failed", "errors": [ { "path": "quantityKg", "message": "..." } ] }
```

`meta` appears only on paginated lists, `errors` only on failures.

### Endpoints by module

| Module | Count | Highlights |
|---|:-:|---|
| **Auth** | 10 | signup, OTP verify/resend, login, refresh, logout, set/change password, Google OAuth |
| **Users** | 4 | profile read/update, role-aware dashboard, soft-delete account |
| **Farmer Profile** | 3 | optional farming details |
| **Owner Profile** | 3 | business verification — **gates every owner action** |
| **Crop Types** | 5 | public reads (cached 24 h), admin CRUD |
| **Warehouses** | 8 | public search with filter/sort/paginate, owner CRUD, availability, booking queue |
| **Chambers** | 6 | nested create/list, availability with daily breakdown |
| **Bookings** | 10 | create, lifecycle transitions, invoice |
| **Inspections** | 2 + 1 | admin quality grading |
| **Payments** | 7 | checkout session, webhook, success/cancel/failed, history, refund |
| **Reviews** | 4 | gated on completed bookings, denormalized rating |
| **Admin** | 9 | users, roles, bans, warehouse approval, audit logs, statistics |

### Status codes

| Code | Meaning |
|:-:|---|
| `400` | Validation failed, malformed uuid, unknown field |
| `401` | Bad credentials, missing/invalid/expired/revoked token |
| `403` | Wrong role, not your record, banned, email unverified, owner profile incomplete |
| `404` | Route or record not found |
| `409` | Duplicate, illegal state transition, capacity exhausted |
| `410` | OTP expired or already used |
| `422` | Business rule violated (temperature, duration, dates) |
| `429` | Rate limited |
| `502` | Upstream failure (email or Stripe) |

---

## Payment flow

```
1. FARMER  POST /payments/checkout-session { bookingId }
             → booking must be APPROVED, hold not expired, caller owns it
             → Payment row created (PENDING), Stripe Checkout Session opened
             → { checkoutUrl, amountBdt, amountUsd, fxRate }

2. Farmer pays on Stripe's hosted page (test card 4242 4242 4242 4242)

3. Stripe → POST /payments/webhook          ← the ONLY thing that marks a booking PAID
             → express.raw() BEFORE express.json(), signature verified
             → Payment SUCCEEDED, Booking PAID, AuditLog row — all in one transaction

4. Stripe redirects the browser to /payments/success (or /cancel, /failed)
             → renders an HTML result page, JSON for API clients
             → READ-ONLY, it never mutates anything
```

**Design rules that matter:**

- The success redirect **never** changes state. A user typing that URL cannot pay for themselves — only the signature-verified webhook can.
- If `STRIPE_WEBHOOK_SECRET` is unset the webhook returns `503` rather than trusting an unverifiable event.
- **Idempotent** — Stripe retries deliveries. The update is `WHERE status = 'PENDING'`, so a duplicate matches zero rows and writes nothing.
- Storage rent is priced in **BDT** and charged in **USD** at a documented `DEMO_FX_RATE`, because the Stripe test account is USD-only. `amountBdt`, `amount`, `currency` and `fxRate` are all persisted, so an invoice is reconstructable.
- A payment that succeeds when the booking is no longer `APPROVED` is still recorded, with an audit row flagging `needsManualRefund` — losing the money silently would be worse.

---

## Security

| Concern | Handling |
|---|---|
| Passwords | bcrypt, cost 12, never returned by any endpoint |
| Tokens | 15-min access + 7-day rotating refresh; logout adds the `jti` to a Redis denylist, killing **both** immediately |
| Refresh replay | Rotation revokes the old token — reusing it returns `401` |
| Ban / delete | The auth middleware re-reads the user on every request, so a ban takes effect instantly |
| User enumeration | Wrong password and unknown email return the same message, with a decoy bcrypt compare to equalise timing |
| Mass assignment | `.strict()` on every body schema — `role`, `status` and `email` are rejected with explicit messages |
| Privilege escalation | Signup refuses `ADMIN`; admins cannot modify themselves or other admins |
| Rate limiting | Redis-backed: 300/15 min global, 10/15 min auth, 6/15 min OTP, 10/min bookings, 20/15 min payments |
| Headers & CORS | helmet, credentialed CORS pinned to `FRONTEND_URL` |
| Data integrity | 20 CHECK constraints — the database rejects bad rows even if application validation is bypassed |

---

## Architecture

```
route → middleware → controller → service → prisma
```

Strict layering, five files per module. Controllers never touch Prisma; services never touch `req`/`res` and signal outcomes by throwing `AppError(status, message)`. One global error handler turns everything into the response envelope.

```
src/
├── server.ts              entry point, connect + listen
├── app.ts                 middleware order, route mounting
├── config/env.ts          Zod-validated environment, fails fast at boot
├── lib/                   prisma, redis, stripe, google, mailer singletons
├── middlewares/           auth, authorize, requireCompleteProfile,
│                          validateRequest, cache, rateLimiter,
│                          notFound, globalErrorHandler
├── modules/               auth user farmer owner cropType warehouse
│                          chamber booking inspection payment review admin
│                          └─ each: route · controller · service · validation · interface
└── utils/                 capacity  pricing  stateMachine  paginate
                           jwt  otp  tokenDenylist  auditLogger
                           cacheKeys  publicUser  paymentPage
                           AppError  catchAsync  sendResponse
```

---

## Data model

11 models · 37 indexes · 13 foreign keys · 20 CHECK constraints · 4 migrations.

```
User ──1:1──► FarmerProfile
 │    ──1:1──► OwnerProfile
 │
 ├──1:N──► Warehouse ──1:N──► Chamber ──1:N──► Booking
 │             │                                  │
 │             └──1:N──► Review ◄─────1:1─────────┤
 │                                                ├──1:1──► Payment
 ├──1:N──► Booking (as farmer) ───────────────────┤
 ├──1:N──► Inspection (as inspector) ◄────1:1─────┤
 └──1:N──► AuditLog (as actor)         CropType ──┘ N:1
```

**Soft deletes** — `deletedAt` on User, Warehouse, Chamber, CropType, Booking and Review. Nothing is ever hard-deleted; every read filters `deletedAt: null`. Deleting a warehouse cascades to its chambers in one transaction and is refused while lots are stored.

**Audit logs** — every status and role change writes a row with before/after snapshots, actor and IP **inside the same transaction as the change**, so a log entry can never survive a rolled-back write.

**Performance** — composite indexes on the hot paths, explicit `select` everywhere (a password can never leak), denormalized `avgRating`/`reviewCount` recomputed transactionally, and Redis response caching on crop types (24 h), warehouse list (60 s), warehouse detail and reviews (5 min).

Availability and booking reads are **deliberately never cached** — serving a stale capacity number is exactly the bug this project exists to prevent.

---

## Testing

```bash
npm run dev                                              # terminal 1
STRIPE_WEBHOOK_SECRET=whsec_test... npm run test:e2e     # terminal 2
```

122 checks across every endpoint: happy paths, all three roles, 18 distinct `403`s (role *and* ownership), the full booking lifecycle, signed webhook delivery plus duplicate-delivery idempotency, and error handling. Runs against the live database.

---

## Deployment

Deployed to Vercel from `dist/server.js` via `@vercel/node`.

```bash
npm run build
```

Set every environment variable in the Vercel dashboard, with `APP_URL` and `GOOGLE_REDIRECT_URI` pointing at the deployed domain rather than localhost. Register the production webhook at Stripe → Developers → Webhooks:

```
https://sojibislam9878assignment6.vercel.app/api/v1/payments/webhook
```

listening for `checkout.session.completed`, `checkout.session.expired` and `payment_intent.payment_failed`, then paste the returned `whsec_…` into `STRIPE_WEBHOOK_SECRET` and redeploy.

---

## Notes

- **Email delivery** — Resend only delivers to a verified sending domain. The demo accounts are seeded pre-verified so they log in without an OTP; a brand-new signup to an unverified address will get a `502` on the email step.
- **`npm run db:seed` wipes everything** in foreign-key-safe order, then loads 8 users, 8 crop types, 6 warehouses, 12 chambers and 17 bookings covering all nine booking statuses — including a pending warehouse for the approval demo, a warm chamber for the temperature-mismatch error, and a failed inspection with its refund.
