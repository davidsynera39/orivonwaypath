# Waypath — personal business journey tracker

A founder's personal workspace: describe your business, get (or build) a
custom stage-by-stage journey, track milestones and goals, journal, check in
weekly, and talk to an AI companion that's grounded in your own data.

Stack: **Next.js 14 (App Router)** · **Supabase** (Postgres + Auth + RLS) ·
**Groq** (AI, server-only) · **Stripe** (payments, optional until you're ready).

## 1. Set up Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run the contents of `supabase/schema.sql`. This
   creates every table, the row-level-security policies that keep each
   user's data private, the rate-limiting function, and a trigger that
   provisions a `profiles` row on sign-up.
3. Project Settings → API: copy the Project URL and anon public key.
4. Project Settings → API → service_role key: copy it too (server-only,
   never shipped to the browser — used for account deletion, the
   deadline-scan cron job, rate limiting, and the Stripe webhook).

## 2. Get a Groq key

Create a key at console.groq.com/keys. The default model in `.env.example`
is `openai/gpt-oss-120b` (Groq's current recommended general-purpose model); change `GROQ_MODEL` to swap it. If you deployed this project before August 2026, update your existing `.env.local` too — Groq decommissioned the old default (`llama-3.3-70b-versatile`) on August 16, 2026, and any AI request will 400 until you switch it.

## 3. Configure environment

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY`. Leave every Stripe variable
and `CRON_SECRET` blank for local development — the app runs fully without
them (see the Billing section below).

## 4. Run it

```
npm install
npm run dev
```

Visit http://localhost:3000, register, and walk through onboarding.

## 5. Turning on real payments (optional)

Until you set the Stripe variables, upgrading to Pro just flips the plan in
the database directly — no card, no charge. To go live:

1. Create a Product + recurring Price in the Stripe Dashboard for Pro.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_PRO` in `.env.local`.
3. Run the Stripe CLI locally to forward webhooks and get a signing secret:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint in the Stripe Dashboard pointed at
   `https://yourdomain.com/api/stripe/webhook`, subscribed to at least:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Use that
   webhook's signing secret for `STRIPE_WEBHOOK_SECRET` in your deployed
   environment.

Once those are set, "Upgrade to Pro" in Settings redirects to real Stripe
Checkout, and a "Manage billing" button appears for the Stripe customer
portal (update card, view invoices, cancel). The webhook — not the
browser — is what actually updates `profiles.plan` and `subscriptions`, so
a closed tab or a flaky network never leaves the database out of sync with
what was actually paid for.

## Architecture notes

- **Auth**: Supabase Auth via `@supabase/ssr`. `middleware.js` refreshes the
  session on every request and redirects unauthenticated users away from
  protected routes. Supabase Auth has its own built-in rate limiting on
  sign-up/sign-in — there's no separate custom auth route in this codebase
  to rate-limit, since the browser talks to Supabase directly.
- **Data access**: every API route in `app/api/**` reads the caller's
  session with `lib/supabase/server.js` and lets Postgres Row Level Security
  (defined in `supabase/schema.sql`) enforce ownership — there's no code
  path where swapping an ID in a URL returns another user's business.
- **AI**: `lib/ai.js` is the only file that talks to Groq, and only from
  server routes (`app/api/ai`, `app/api/checkins`). The API key never
  reaches the browser. Swapping providers later means editing this one file.
- **AI safety**: the weekly check-in (`app/checkin`) shows AI suggestions
  but only writes to the journey after the user clicks "Approve" —
  `app/api/checkins/[id]/apply`.
- **Grants**: `app/grants-page` suggests non-dilutive funding leads via
  `app/api/grants/suggest`, grounded in the business's actual profile. The
  model has no live knowledge of which programs are currently open or their
  real deadlines/URLs, so `lib/ai.js`'s `suggestGrants()` deliberately
  restricts it to well-established program categories, forbids inventing
  deadlines or deep-link URLs (it may only cite a program's stable top-level
  domain), and the UI carries a visible disclaimer. Nothing is written to
  the `grants` table until the user clicks "Save" — same approve-before-persist
  pattern as the weekly check-in.
- **Spreadsheets**: `app/spreadsheets-page` lets founders catalog anything
  (inventory, suppliers, contacts, expenses) in a lightweight, user-defined
  grid. Columns (`spreadsheet_columns`) are user-defined with a type — text,
  number, date, checkbox, or dropdown — and row data (`spreadsheet_rows`) is
  stored as JSONB keyed by column id rather than real SQL columns, so adding,
  renaming, or deleting a column never requires a migration. Supports CSV
  export client-side.
- **Rate limiting**: `lib/rate-limit.js` is a Postgres-backed fixed-window
  limiter (see `check_rate_limit` in `supabase/schema.sql`), applied to the
  AI chat route (20 msg/min/user) and the weekly check-in route
  (10/min/user). It's backed by Postgres rather than an in-memory counter
  because serverless deployments run multiple isolated instances — an
  in-memory count would only ever see a fraction of the real traffic.
- **Billing**: `lib/billing.js` auto-detects whether Stripe is configured
  (`billingIsLive`). Unconfigured → stub (instant plan flip, no Stripe
  calls). Configured → real Checkout Sessions, a billing portal, and
  cancel-at-period-end. `app/api/stripe/webhook` is the source of truth for
  subscription state — the client never marks itself "pro" on faith.
- **Notifications**: `app/api/cron/scan-deadlines` scans all businesses for
  upcoming/overdue milestones and goal deadlines and writes notifications.
  It's not user-triggered, so it uses the service-role client
  (`lib/supabase/admin.js`) gated by `CRON_SECRET`, and is wired up for
  Vercel Cron in `vercel.json` (daily at 13:00 UTC). Point any other
  scheduler at the same route with the `x-cron-secret` header instead.
- **Account deletion**: client SDKs can't delete their own `auth.users` row,
  so `app/api/account/delete` verifies the session normally, then uses the
  service-role client for that one call. Every other table cascades via
  `on delete cascade` in the schema.

## Known gaps to close before a real launch

- Email verification / password strength requirements are whatever
  Supabase Auth defaults to — review them in the Supabase dashboard.
- The AI companion's context window (`lib/ai.js`) currently sends the
  business's current stage, goals, and 3 recent journal entries. For very
  active businesses you may want to trim history or add pagination.
- Stripe webhook retries: the handler returns 500 on internal errors so
  Stripe retries automatically, but there's no dead-letter alerting if a
  webhook keeps failing — worth wiring up before relying on it for revenue.
