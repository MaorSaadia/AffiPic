# AffiPic

AffiPic is a SaaS tool that lets creators build affiliate websites without coding. Creators choose their branding and categories, then add products with images, descriptions, merchant names, and their own affiliate links. Shoppers purchase on external merchant websites. AffiPic charges creators for software subscriptions; it does not process shopper purchases.

## Stack and current boundaries

- Next.js App Router, strict TypeScript, React, Tailwind CSS, shadcn/ui (Base UI primitives), and Lucide icons.
- npm and its committed lockfile; ESLint and Prettier.
- Vercel hosting and GitHub source control are the deployment targets.
- Day 1 runs without credentials, remote fonts, or integration connections.
- `/` redirects to `/dashboard`. `app/(dashboard)/dashboard/layout.tsx` owns the creator shell. Server-rendered pages share client components only for navigation and the preview dialog.
- `components/ui` contains shadcn primitives, `components/dashboard` the shell, `components/products` the product UI, and `lib` shared navigation and milestone content.
- Setup counts are a static first-time roadmap, not saved account state. No website or product exists yet.

## Ownership and public rendering: future requirements

One application will serve many account-owned websites. Products, categories, merchants, collections, and guides must belong to a website. Website ownership must belong to an authenticated account. Enforce account-level data protection with Supabase row-level security, server-side authorization, and storage policies; never rely on browser filtering or a submitted website ID as authorization.

Plan public pages under `app/(public)/s/[siteSlug]` with their own layout, outside the creator shell. Resolve slugs to published websites; unpublished content must remain inaccessible. Public metadata and indexing rules must override the dashboard's no-index defaults. Database schema, authentication, account isolation, and the public renderer are deliberately not implemented on Day 1.

## Planned integration boundaries

- Supabase: server-side authentication, database, and image-storage access; future server modules under `lib/server/supabase`. Use a `server-only` guard on privileged modules. Never expose service-role credentials.
- AI: define an internal provider-neutral generation interface and separate usage accounting before adding `lib/server/ai/providers/gemini`. Product features depend on that interface, so Gemini can be replaced. Start with its free tier, verify current limits at implementation, and enforce app-level quotas server-side.
- Billing: internal subscription entitlements are independent of payment-provider IDs and API payloads. A future Polar adapter maps verified, idempotent webhooks into internal subscription state. Lemon Squeezy is only a fallback if Polar does not approve AffiPic.
- Resend: a separate transactional email adapter, called from authorized server workflows.
- Store secrets in ignored local environment files and Vercel environment settings. Only intentionally public values may use `NEXT_PUBLIC_`. No integration credentials are needed today.

No provider SDKs, speculative database migrations, API calls, or entitlement enforcement are included in this foundation.
