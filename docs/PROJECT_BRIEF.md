# AffiPic

AffiPic is a SaaS tool that lets creators build affiliate websites without coding. Creators choose their branding and categories, then add products with images, descriptions, merchant names, and their own affiliate links. Shoppers purchase on external merchant websites. AffiPic charges creators for software subscriptions; it does not process shopper purchases.

## Stack and current boundaries

- Next.js App Router, strict TypeScript, React, Tailwind CSS, shadcn/ui (Base UI primitives), and Lucide icons.
- npm and its committed lockfile; ESLint and Prettier.
- Vercel hosting and GitHub source control are the deployment targets.
- The app builds without credentials or remote fonts. Day 2 requires Supabase configuration for account access; absent configuration never opens the dashboard.
- `/` redirects to `/dashboard`. `app/(dashboard)/dashboard/layout.tsx` owns the creator shell. Server-rendered pages share client components only for navigation and the preview dialog.
- `components/ui` contains shadcn primitives, `components/dashboard` the shell, `components/products` the product UI, and `lib` shared navigation and milestone content.
- The website-details checklist step now reflects the account's saved draft website. Other setup steps stay incomplete until their milestones; no product exists yet.

## Ownership and public rendering: future requirements

One application will serve many account-owned websites. Products, categories, merchants, collections, and guides must belong to a website. Website ownership must belong to an authenticated account. Enforce account-level data protection with Supabase row-level security, server-side authorization, and storage policies; never rely on browser filtering or a submitted website ID as authorization.

Plan public pages under `app/(public)/s/[siteSlug]` with their own layout, outside the creator shell. Resolve slugs to published websites; unpublished content must remain inaccessible. Public metadata and indexing rules must override the dashboard's no-index defaults. Database schema, authentication, account isolation, and the public renderer are deliberately not implemented on Day 1.

## Planned integration boundaries

- Supabase: server-side authentication, database, and image-storage access; future server modules under `lib/server/supabase`. Use a `server-only` guard on privileged modules. Never expose service-role credentials.
- AI: define an internal provider-neutral generation interface and separate usage accounting before adding `lib/server/ai/providers/gemini`. Product features depend on that interface, so Gemini can be replaced. Start with its free tier, verify current limits at implementation, and enforce app-level quotas server-side.
- Billing: internal subscription entitlements are independent of payment-provider IDs and API payloads. A future Polar adapter maps verified, idempotent webhooks into internal subscription state. Lemon Squeezy is only a fallback if Polar does not approve AffiPic.
- Resend: a separate transactional email adapter, called from authorized server workflows.
- Store secrets in ignored local environment files and Vercel environment settings. Only intentionally public values may use `NEXT_PUBLIC_`. No integration credentials are needed today.

## Day 2 implementation

Supabase SSR and Auth SDKs are now included. All current Supabase calls execute on the server through `lib/server/supabase/client.ts`; no browser client or privileged key is needed. `proxy.ts` refreshes cookie sessions and performs early redirects. The dashboard layout and the account data-access layer independently check a confirmed, non-anonymous identity using `getUser()`. Mutable server actions recheck identity, and account IDs always come from that identity. The proxy is not the sole authorization boundary.

`public.accounts` is a one-to-one personal account table keyed to `auth.users.id`. A controlled trigger creates account records, including a migration backfill. RLS permits only owner reads and owner updates; column grants restrict updates to `display_name`. No client insert/delete grants exist. Metadata is display-only and never confers authorization. Future websites must reference `accounts.id` and add their own website-scoped RLS policies.

Authenticated pages are dynamic and auth-related responses are private/no-store. Email links use a configured `SITE_URL` rather than a request Host header. Login return destinations use a fixed internal allowlist. The current sign-out control ends this browser's session. Password reset requires a verified session after token-hash confirmation. There is no unauthenticated dashboard preview mode.

The migration has been tested in embedded Postgres; hosted Supabase configuration and live integration checks are pending. [Setup instructions](SUPABASE_SETUP.md) document the environment, migration, email templates, testing, and Vercel configuration. AI, billing, analytics, storage, public rendering, and website creation remain outside Day 2.

## Day 3 implementation

`public.websites` adds account-owned draft websites with globally unique slugs, details, status, and managed timestamps. One website per account is the current product scope, enforced by a unique constraint independently of billing. Ownership derives from the authenticated user at the database boundary; row policies and column grants prevent cross-account access and client ownership/status changes.

`lib/server/websites.ts` contains the request-scoped website query. The settings route owns create/edit server actions; forms receive the appropriate action from that server page. Supplied IDs are never used to select ownership. The overview and creator shell read the same saved draft and only mark website details complete. Missing schema or read failures surface as errors instead of false empty state.

Creation does not publish: the database accepts only draft status, there is no anonymous website read policy, and no public renderer is installed. Categories and other future content must use `website_id` references to the UUID, not the mutable slug. [Day 3 setup](WEBSITE_SETUP.md) records migration order, one-website scope, slug rules, and pending live verification.

## Day 4 implementation

Categories and merchants now have website-scoped create, rename, and delete screens. Both use UUID identity, owner-only database policies, protected ownership columns, and case-insensitive name uniqueness per website. Server actions resolve ownership from the authenticated account. Categories now drive the overview checklist. Product associations remain Day 5 work; composite foreign-key targets are prepared to enforce same-website relationships. See [catalog setup](CATALOG_SETUP.md) for migration and hosted verification steps.
