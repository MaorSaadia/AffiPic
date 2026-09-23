# AffiPic

A creator workspace for building affiliate websites. Day 1 supplies the dashboard, Day 2 adds Supabase authentication and account protection, and Day 3 adds private website creation and ownership. The app builds without credentials, but account access stays unavailable until Supabase is configured.

## Local setup

Use Node.js 22 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The root redirects to `/dashboard`, which now requires sign-in. Without Supabase configuration, `/login` displays an honest setup-pending state; there is no authentication bypass.

To connect authentication, copy `.env.example` to `.env.local` and follow [Supabase setup](docs/SUPABASE_SETUP.md): set the project URL and publishable key plus `SITE_URL`, apply both account and website migrations, disable signup email confirmation, and install the password recovery email template. The local project connection is verified; end-to-end signup/session verification remains pending.

Then follow [website setup](docs/WEBSITE_SETUP.md) to apply the Day 3 migration after the account migration. Each account can create one draft website and edit its name, address, and description in Website Settings. Creating a website does not publish it.

Day 4 adds saved categories and merchants with add, rename, and confirmed deletion. Follow [catalog setup](docs/CATALOG_SETUP.md) to apply the third migration and verify account isolation. Hosted Day 4 verification is pending.

Day 5 adds product creation, editing, deletion, and private image uploads. Follow [product setup](docs/PRODUCT_SETUP.md) to apply the two new migrations and verify the hosted workflow.

Day 6 adds public websites at `/s/[siteSlug]` with owner-controlled publishing and unpublishing. Follow [publishing setup](docs/PUBLISHING_SETUP.md) to apply the new migration and verify public access.

Day 7 adds logo uploads, accent colors, backgrounds, heading styles, custom hero text, and a live branding preview in Website Settings. Follow [branding setup](docs/BRANDING_SETUP.md) to apply the migration and verify hosted behavior.

7A moves design editing into the full-screen Website Designer with homepage sections, a shared public/preview renderer, private drafts, and atomic publishing. Apply the additional migration in [designer setup](docs/DESIGNER_SETUP.md). This supersedes Day 7's direct-to-live branding saves; 7B customization and 7C themes/templates remain planned.

Curated adds a MishBaby-inspired default website with personalized branding, a complete homepage, category pages, and product details. Existing published sites stay on their current design until explicitly upgraded and published. Apply the backward-compatible migration in [Curated theme setup](docs/CURATED_THEME_SETUP.md).

## Commands

| Command                | Purpose                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Local development                                                                                         |
| `npm run build`        | Production build                                                                                          |
| `npm start`            | Serve the production build                                                                                |
| `npm run typecheck`    | Generate route types and check strict TypeScript                                                          |
| `npm run lint`         | ESLint with Next.js and TypeScript rules                                                                  |
| `npm run format`       | Format source and documentation                                                                           |
| `npm run format:check` | Verify formatting                                                                                         |
| `npm run test:e2e`     | Desktop/mobile Chromium navigation, dialog, accessibility, and layout checks against the production build |

Before the first browser test, run `npx playwright install chromium`. Run `npm run build` before `npm run test:e2e`; the test runner starts a production server on port 3100 and an isolated website-component fixture on port 3101, then stops both. Fixture saves are simulated; they do not represent hosted persistence or bypass authentication. Screenshots and failure traces are written to ignored `test-results/`.

Additional Day 2 commands:

| Command                    | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `npm test`                 | Offline action/proxy/validation tests and account RLS tests in embedded Postgres  |
| `npm run test:watch`       | Watch the offline tests                                                           |
| `npm run test:integration` | Opt-in checks against a configured Supabase test project with two confirmed users |
| `npm run test:e2e:live`    | Load local fixture credentials and run authenticated browser checks               |

Without `E2E_EMAIL` and `E2E_PASSWORD`, signed-in cases are explicitly skipped (ten skipped cases in the current suite; the live website writer runs only on desktop to avoid shared-account races). See the setup guides for fixture environment files and live verification commands. The live integration suite creates draft websites for dedicated fixture accounts if missing; those remain for subsequent runs. Never share test traces containing credentials or session cookies.

## Structure

```text
app/
  (auth)/                 Login, signup, recovery, confirmation error screens
  auth/                   Server actions and token-hash confirmation route
  (dashboard)/dashboard/   Creator layout, overview, products, future-feature routes
  layout.tsx              Root metadata and global styles
  page.tsx                Dashboard redirect
components/
  auth/                   Auth forms, account form, and sign-out control
  dashboard/              Navigation shell and page heading
  products/               Saved product catalog and image editor
  websites/               Create/edit website form and settings presentation
  ui/                     shadcn/ui components (Base UI)
lib/
  auth/                   Environment parsing, validation, safe redirects
  server/                 Verified identity, account data access, Supabase SSR client
  websites/               Website types, validation, and address suggestions
proxy.ts                  Session refresh, protected redirects, no-store headers
supabase/                 Account/website migrations and email templates
docs/                     Product architecture, roadmap, verified progress
tests/                    Browser, unit, Postgres RLS, and opt-in integration checks
```

Published websites are served at `/s/[siteSlug]` in a separate `(public)` route group. See [project architecture](docs/PROJECT_BRIEF.md) and the [roadmap](docs/ROADMAP.md).

## Current limitations

- Email/password signup, confirmation/resend, sign-in/out, password recovery, and account-name editing are implemented. Hosted Supabase setup and end-to-end email/session verification remain pending.
- Dashboard pages require a confirmed, non-anonymous user. Verified identity and database RLS protect account, website, catalog, and branding records.
- The setup checklist reflects saved website details, categories, products, branding, and publishing.
- Products support persistence, editing, deletion, and private image uploads. Published websites expose the current catalog and referenced images.
- Website Settings supports creation, editing, branding customization, publishing, and unpublishing after database setup. Categories and merchants are saved. Collections, guides, analytics, and billing remain future features.
- No AI calls, payment processing, tracking, scraping, imports, custom domains, or website editor.
- Supabase integration code is ready but no hosted project has been connected. Gemini, Polar, and Resend remain future integrations. Polar is separate from future internal entitlements.
- No provider connection or deployment is claimed as verified. The offline RLS tests use a real embedded Postgres engine with a fixture Auth schema, not a hosted Supabase project.

Environment files are ignored. Keep future secrets in `.env.local` or Vercel environment settings and privileged code behind server-only boundaries. Never put secret keys in `NEXT_PUBLIC_` variables. System fonts keep builds independent of external font services.

## GitHub and Vercel setup remaining

This checkout now has the GitHub remote `https://github.com/MaorSaadia/AffiPic.git`. No linked Vercel project is present, and no deployment was made during this milestone.

1. Review `git diff` and `git status`, then commit the milestone files. Never stage local environment files or test artifacts.
2. Push your feature branch with `git push -u origin HEAD`.
3. In Vercel, choose **Add New → Project**, import that repository, select Next.js, and keep the repository root as the root directory. Use `npm run build` and the default Next.js output settings. Configure the environment variables and trusted redirect URLs described in the Supabase setup guide. Match the project's Node.js version to Node 22.
4. To create a preview, push a non-production branch and open a pull request. Vercel's Git integration will create a Preview deployment. Confirm its successful build and test dashboard routes, product uploads, and publishing at the generated URL before sharing it.

The first default-branch deployment may be Production; use the non-production branch workflow explicitly for previews. Hosting remains Vercel.

## Next milestone

Finish the live checks in [Supabase setup](docs/SUPABASE_SETUP.md) and [website setup](docs/WEBSITE_SETUP.md). Day 4 adds website-scoped categories and merchants; product persistence remains Day 5. See [verified progress](docs/PROGRESS.md).
