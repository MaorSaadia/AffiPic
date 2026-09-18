# AffiPic

A creator workspace for building affiliate websites. Day 1 delivers the dashboard foundation and a product-form preview. No external credentials are required.

## Local setup

Use Node.js 22 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The root redirects to `/dashboard`.

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

Before the first browser test, run `npx playwright install chromium`. Run `npm run build` before `npm run test:e2e`; the test runner starts and stops a local production server on port 3100. Screenshots and failure traces are written to ignored `test-results/`.

## Structure

```text
app/
  (dashboard)/dashboard/   Creator layout, overview, products, future-feature routes
  layout.tsx              Root metadata and global styles
  page.tsx                Dashboard redirect
components/
  dashboard/              Navigation shell and page heading
  products/               Accessible product-form preview
  ui/                     shadcn/ui components (Base UI)
lib/                      Shared navigation, feature descriptions, UI utilities
docs/                     Product architecture, roadmap, verified progress
tests/                    Browser acceptance checks
```

Future public websites will live at `/s/[siteSlug]` in a separate `(public)` route group. See [project architecture](docs/PROJECT_BRIEF.md) and the [roadmap](docs/ROADMAP.md).

## Current limitations

- No login, database, persistent storage, account isolation, or website creation.
- The setup checklist is a static roadmap, initially zero of five. It never claims completed setup.
- Product fields are a UI preview only. Save is disabled; closing discards input. Image URLs are not fetched, and there are no sample products or fabricated analytics.
- Categories, merchants, collections, guides, settings, analytics, and billing have real routes with purposeful Coming soon content.
- No AI calls, payment processing, tracking, scraping, imports, custom domains, or website editor.
- No integrations are connected. Gemini, Supabase, Polar, and Resend come in later milestones. Polar is separate from future internal entitlements.
- This is an unauthenticated interface preview, so do not put real private account information into it.

Environment files are ignored. Keep future secrets in `.env.local` or Vercel environment settings and privileged code behind server-only boundaries. Never put secret keys in `NEXT_PUBLIC_` variables. System fonts keep builds independent of external font services.

## GitHub and Vercel setup remaining

This checkout has no Git remote or linked Vercel project. No deployment has been made.

1. Create an empty GitHub repository for AffiPic. Review `git diff` and `git status`, then commit the Day 1 files with `git add .` and `git commit -m "Build AffiPic Day 1 dashboard"`.
2. Add your actual repository URL with `git remote add origin https://github.com/OWNER/REPOSITORY.git`, then push your branch with `git push -u origin HEAD`.
3. In Vercel, choose **Add New → Project**, import that repository, select Next.js, and keep the repository root as the root directory. Use `npm run build` and the default Next.js output settings. Day 1 requires no environment variables. Match the project's Node.js version to Node 22.
4. To create a preview, push a non-production branch and open a pull request. Vercel's Git integration will create a Preview deployment. Confirm its successful build and test all dashboard routes and the product dialog at the generated URL before sharing it.

The first default-branch deployment may be Production; use the non-production branch workflow explicitly for previews. Hosting remains Vercel.

## Day 2 prerequisites

Provision a Supabase project and decide login methods and allowed redirect URLs for local and Vercel environments. Implement account authentication, protected dashboard access, account records, and row-level security with cross-account denial tests. Do not add website ownership or product persistence ahead of their milestones. See [verified progress](docs/PROGRESS.md).
