# Day 3: website creation and ownership

Day 3 adds one private draft website per personal account. Creators can create and edit a name, unique address slug, and optional description at `/dashboard/settings`. The overview and sidebar read saved website data. Website creation completes only the first setup-checklist step; no website is published.

## Connect the database

Complete [Supabase setup](SUPABASE_SETUP.md) first. The required Supabase URL, publishable key, and site origin were still absent when Day 3 was implemented. No hosted database was changed or claimed as verified.

Run these migrations **once, in order** in your Supabase project's SQL Editor:

1. `supabase/migrations/202609180001_accounts.sql` — only if Day 2's migration has not already been applied.
2. `supabase/migrations/202609200001_websites.sql` — adds the website table, indexes/constraints, ownership policies, privileges, and timestamp trigger.

The SQL transaction must run as the project's administrative database role. The application continues to use the publishable key plus verified user sessions, never a service-role key. Restart development after setting environment variables, or rebuild/redeploy Vercel with the proper environment settings. If migrations or the connection are missing, the workspace shows a retryable load error rather than pretending an existing account has no website.

## Current model and rules

- `websites.id` is a generated UUID; `account_id` references `accounts.id`. The database derives the account from `auth.uid()` on insert. Clients cannot supply or change ownership, IDs, status, or timestamps.
- One website per account is enforced by a unique constraint for this milestone. Future support for multiple websites will require an intentional migration and a website selector; this is not a subscription entitlement.
- `name`: 1–80 characters after trimming. `description`: optional, up to 500 characters.
- `slug`: 3–48 lowercase ASCII letters, numbers, and single hyphens between words. It is globally unique. The app trims and lowercases submissions; the database rejects noncanonical direct writes. Reserved words are listed in `lib/websites/schema.ts` and enforced by the migration.
- Availability is checked on save using the database unique constraint, including concurrent requests. Duplicate submissions cannot create a second site. No public slug-lookup endpoint exposes private draft information.
- A slug can be changed while the site is a draft. The old slug becomes available again. Plan URL stability/redirect behavior before publishing is implemented.
- Status is restricted to `draft`. Anonymous reads are denied; authenticated users can read/edit only their own website. There are no client delete, ownership-transfer, or publishing privileges.
- `created_at` and `updated_at` are database-managed. Deleting an Auth user administratively cascades through that account to its website. There is no deletion UI.
- Future categories, merchants, products, collections, and guides must reference the website UUID and enforce ownership through it. They must not use an editable slug as an ownership identifier.

The displayed `/s/[slug]` address is plain text, not a public-page link. `/s/[siteSlug]` rendering and publishing remain Day 6. Branding remains Day 7. No categories, products, image storage, domains, or publishing controls were implemented here.

The protections combine server-verified identity with [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security).

## Verification after setup

Use two confirmed test accounts in separate browser profiles:

1. With account A, open Website Settings, create a draft, and confirm its name/address remain after reload. The sidebar should show its name, and the overview should show **1 of 5** with a **Draft · Not published** status.
2. Edit the name, slug, and description. Save and reload; confirm the changes persist without completing other checklist steps.
3. Try a reserved/invalid slug and a slug belonging to account B. Saving should fail clearly and preserve entered fields. Simultaneous create requests must never produce two websites for one account.
4. Confirm account B sees only its own website. Direct API attempts to read/edit account A's website must fail or return zero rows. Supplying a different account or website ID must never change ownership.
5. Sign out and revisit the dashboard/settings route: it must redirect to sign-in. Visiting `/s/your-slug` must still return 404, including when signed in.
6. Complete the Day 2 live authentication checks as well; local website tests do not replace them.

## Automated checks

- `npm test` applies both real SQL migrations in embedded Postgres with a minimal Auth fixture and exercises website ownership, constraints, privileges, server actions, and validation. This is not hosted Supabase verification.
- `npm run build` then `npm run test:e2e` runs the production app's unauthenticated checks and a separate, isolated browser fixture for the website components. The fixture lives under `tests/fixtures/website-ui`, uses simulated save responses, and runs only on local port 3101 during tests. It is not a Next.js route, login bypass, or persistent backend.
- `npm run test:integration` uses the two confirmed test users from `.env.test.local` against real Supabase. It now checks website ownership and draft protection as well as accounts. It creates a draft fixture only when the fixture account has no website; those drafts remain for repeatable testing. Use a dedicated test project. Existing website names are saved unchanged.
- `npm run test:e2e:live` adds signed-in dashboard tests and a desktop create/edit/reload/overview workflow. Live website writes run once to avoid races on the shared fixture account; mobile UI behavior is covered separately. Without credentials, live cases are explicitly skipped.

See [PROGRESS.md](PROGRESS.md) for checks actually run. Apply the migration and complete hosted verification before treating Day 3 as production-ready.
