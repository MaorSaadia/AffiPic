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
  products/               Accessible product-form preview
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

Future public websites will live at `/s/[siteSlug]` in a separate `(public)` route group. See [project architecture](docs/PROJECT_BRIEF.md) and the [roadmap](docs/ROADMAP.md).

## Current limitations

- Email/password signup, confirmation/resend, sign-in/out, password recovery, and account-name editing are implemented. Hosted Supabase setup and end-to-end email/session verification remain pending.
- Dashboard pages require a confirmed, non-anonymous user. Verified identity and database RLS protect account and website records. Website creation/editing is implemented; product storage is not.
- The setup checklist reflects saved website details (zero or one of five). Categories, products, branding, and publishing remain incomplete until their milestones.
- Product fields are a UI preview only. Save is disabled; closing discards input. Image URLs are not fetched, and there are no sample products or fabricated analytics.
- Website Settings supports real draft creation and editing after database setup. Categories, merchants, collections, guides, analytics, billing, branding, and publishing retain clear Coming soon content.
- No AI calls, payment processing, tracking, scraping, imports, custom domains, or website editor.
- Supabase integration code is ready but no hosted project has been connected. Gemini, Polar, and Resend remain future integrations. Polar is separate from future internal entitlements.
- No provider connection or deployment is claimed as verified. The offline RLS tests use a real embedded Postgres engine with a fixture Auth schema, not a hosted Supabase project.

Environment files are ignored. Keep future secrets in `.env.local` or Vercel environment settings and privileged code behind server-only boundaries. Never put secret keys in `NEXT_PUBLIC_` variables. System fonts keep builds independent of external font services.

## GitHub and Vercel setup remaining

This checkout now has the GitHub remote `https://github.com/MaorSaadia/AffiPic.git`. No linked Vercel project is present, and no deployment was made during this milestone.

1. Review `git diff` and `git status`, then commit the milestone files. Never stage local environment files or test artifacts.
2. Push your feature branch with `git push -u origin HEAD`.
3. In Vercel, choose **Add New → Project**, import that repository, select Next.js, and keep the repository root as the root directory. Use `npm run build` and the default Next.js output settings. Configure the environment variables and trusted redirect URLs described in the Supabase setup guide. Match the project's Node.js version to Node 22.
4. To create a preview, push a non-production branch and open a pull request. Vercel's Git integration will create a Preview deployment. Confirm its successful build and test all dashboard routes and the product dialog at the generated URL before sharing it.

The first default-branch deployment may be Production; use the non-production branch workflow explicitly for previews. Hosting remains Vercel.

## Next milestone

Finish the live checks in [Supabase setup](docs/SUPABASE_SETUP.md) and [website setup](docs/WEBSITE_SETUP.md). Day 4 adds website-scoped categories and merchants; product persistence remains Day 5. See [verified progress](docs/PROGRESS.md).
