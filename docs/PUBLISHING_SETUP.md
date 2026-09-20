# Public website and publishing (Day 6)

Apply all migrations through Day 5, then apply `supabase/migrations/202609200005_publishing.sql` in the Supabase SQL Editor or your normal migration workflow. Do not rerun applied migrations.

The migration requires Supabase's `storage.allow_only_operation(text)` helper. If your Storage schema does not provide it, update the Supabase Storage installation before applying the migration. Do not replace the operation check with an unrestricted anonymous SELECT policy.

## Publish a website

1. Save your website details and add at least one product.
2. Open Website Settings, review the Publishing section, and choose Publish website.
3. Confirm that the current catalog should become public.
4. Open the share link at `/s/[siteSlug]` in a signed-out browser.

Publishing exposes the website name and description, its current products, categories, merchants, affiliate links, and referenced product images. It does not expose account IDs, account records, or product management fields. All products on a published website are live; there is no per-product draft status.

Saved changes appear live while published. Unpublish before making private edits. Changing the website slug makes the old address unavailable; no alias or redirect is created. Unpublishing preserves the catalog and makes new anonymous page/image requests unavailable. Republish to restore the website. Publishing requires a product, but deleting the last product afterward is allowed and shows a public empty state.

The overview, sidebar, website settings, and product screens reflect publication status. Branding is still the Day 7 milestone, so a published website may show four completed setup steps out of five.

## Public rendering and security

The public route group owns its layout and styles, outside the creator shell. It renders a responsive catalog with category filters, pagination, product descriptions, image fallbacks, affiliate disclosure, and outbound merchant links with `sponsored noopener noreferrer`. It does not collect analytics or process purchases.

The public data client uses only the publishable key, with no cookie adapter or session persistence. Public reads always use the anonymous role, even if the visitor is the website owner. RLS exposes only published website content. Column grants hide account IDs and management fields; all anonymous writes remain denied. Authenticated dashboard queries retain owner-only access.

The private image bucket remains private. An anonymous download policy requires a referenced product on a published website and the exact Storage download operation. Anonymous listing, mutation, and signed-URL creation are denied. This follows [Supabase's operation-aware Storage policies](https://supabase.com/docs/guides/storage/schema/helper-functions) and [column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security).

Public image URLs are application routes scoped to the website slug and product UUID. Each request rechecks published access and returns image bytes without a signed redirect. Pages, image responses, and public Supabase fetches disable caching so new requests reflect unpublishing and edits. Previously downloaded content cannot be recalled. Owner-generated signed preview URLs from the dashboard retain their existing one-hour lifetime; the storefront never emits those URLs.

Published pages have website-specific titles and descriptions and explicitly allow indexing. Missing/draft pages are unavailable and no-index. Set `SITE_URL` to the intended deployment origin to generate canonical and Open Graph URLs; URLs are never derived from an untrusted Host header. No custom domains, branding editor, sitemap, analytics, or product collections are included.

## Verification and hosted acceptance

Local automated checks cover publishing ownership, confirmation validation, empty-catalog rejection, stale status changes, anonymous content isolation, hidden account fields, prohibited mutations, image access before/after unpublishing, signed-URL denial, metadata, public-client session isolation, filters, pagination, empty states, accessibility, and mobile layouts.

- `npm test`
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`
- `npm run test:e2e`

Component browser tests use simulated data outside production routes. Embedded Postgres models the Storage operation helper to test policy behavior; this does not verify your hosted Storage service.

For a dedicated hosted test project, apply all migrations and configure the two fixture accounts described in [Supabase setup](SUPABASE_SETUP.md). Both fixture websites must begin unpublished. `npm run test:integration` includes real publication/unpublication, anonymous product reads, image download/signing checks, and cleanup. The test temporarily publishes the fixture website and returns it to draft.

Before release, verify through the real app:

1. Draft links and images are unavailable to signed-out visitors and to the owner through public routes.
2. Publish after reviewing the catalog; open the share link in a private browser window.
3. Check category filters, pagination, images, descriptions, merchant links, metadata, and mobile layouts.
4. Edit a product and verify a fresh public request shows it. Rename the slug and confirm the old address is unavailable.
5. Unpublish and verify fresh page, product API, and image requests are denied. Republish and verify recovery.
6. Use a second account to verify it cannot change the first account's publication state.

Hosted migration, live integration checks, and deployment remain pending. Creating the feature does not publish an existing customer's website.
