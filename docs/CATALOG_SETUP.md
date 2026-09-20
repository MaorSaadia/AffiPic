# Categories and merchants (Day 4)

Apply migrations in order through the Supabase SQL editor or your normal migration workflow:

1. `202609180001_accounts.sql`
2. `202609200001_websites.sql`
3. `202609200002_catalog.sql`

Do not rerun migrations already applied. Configure authentication as described in [Supabase setup](SUPABASE_SETUP.md). Create a draft in Website Settings, then visit Categories and Merchants.

Both screens support adding, renaming, and deleting names, with confirmation before deletion. Names are trimmed, limited to 80 characters, and unique without regard to case within each website and each content type. Categories and merchants use immutable UUIDs; renaming does not change identity. The overview marks categories complete whenever at least one exists.

Each table references the website UUID. RLS checks the authenticated website owner on every operation, and column privileges prevent changing website ownership, IDs, or timestamps. Server actions independently resolve the website from the authenticated account and scope updates/deletes to that website. No anonymous read access is granted. Database read failures surface as errors.

Day 5 product references should use composite foreign keys `(website_id, category_id)` and `(website_id, merchant_id)` against `(website_id, id)` on these tables, with deletion restricted while referenced. The unique constraints are already present for this purpose. Product connections, images, public rendering, and publishing are outside Day 4.

## Verification

`npm test` includes embedded Postgres checks of CRUD, case-insensitive uniqueness, invalid names, cross-account denial, protected columns, anonymous denial, and cascade isolation, plus server-action authorization tests.

`npm run build && npm run test:e2e` checks production authentication boundaries and isolated catalog components in desktop/mobile Chromium. Component actions are simulated; they do not verify hosted persistence.

Hosted acceptance checks still required:

1. With account A, create a website, add a category and merchant, reload, rename both, and reload again.
2. Verify duplicate names fail and identical names on account B's website succeed.
3. Verify account B cannot read, update, delete, or insert into A's website through direct authenticated database requests.
4. Delete A's last category and verify overview progress decreases; verify canceling a deletion preserves the item.
5. Confirm unauthenticated dashboard access redirects to login and anonymous database reads are denied.

This migration has not been applied to a hosted project by this implementation.
