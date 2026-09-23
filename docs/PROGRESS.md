# Progress

## Curated — MishBaby-inspired default theme implemented locally

September 23, 2026. Confirmed Git access to both repositories. Inspected MishBaby at `d9942aecc9acadd6c702fb66fee126fbe5d7ab38` in a separate read-only checkout and reviewed its live homepage on desktop/mobile plus category/product desktop views. Adapted its palette roles, typography, spacing, rounded cards, navigation/footer composition, mobile grid, and detail-page hierarchy into original AffiPic components. No MishBaby backend, Sanity dependency, third-party images, credentials, tracking IDs, merchant URLs, or customer data were copied. The reference checkout remains clean.

Curated is the default for new websites and an explicit draft upgrade for existing websites. Its version-2 configuration extends the existing designer, registry, and publication workflow. Customers can personalize draft name/topic, logo/favicon, palettes/custom colors, font pairs, hero image/copy/CTA, category selection/order, product selections, section layout, card/button style, About text, footer, and social links. Homepage, category, and product previews share public components and real catalog data. Empty optional sections hide publicly; empty editor catalogs have clearly labeled, non-persisted samples without affiliate links. See [Curated setup](CURATED_THEME_SETUP.md).

The additive `202609230001_curated_theme.sql` migration does not update existing snapshots or catalog records. Version-1 rendering remains intact until the owner explicitly upgrades and publishes. New product/category routes are scoped by website identity; existing homepage/query URLs are preserved. The published snapshot controls custom identity and favicon visibility. Existing revision checks, transactional publishing, prior snapshots, and immutable asset retention remain active.

Lean verification completed:

- Ten targeted checks passed across existing database, branding, public-access, and metadata test files. These include new default creation, exact preservation of existing snapshots, draft isolation, explicit publication, another account's private design, rejection of foreign category/favicon references and unreadable colors, published favicon access, scoped product queries, and rejection of sample IDs/script links. A fixture initially attempted to insert the protected `account_id` column; using the existing authenticated insert contract fixed that test.
- Six focused desktop/mobile Chromium browser cases passed: the new personalization/save/reload/publish/category/product/sample flow, the existing designer persistence flow, and the existing public storefront flow. The new homepage passed axe checks; representative mobile detail-preview overflow and homepage screenshots were checked. A text-encoding defect in the sample label was found and corrected before the affected cases were rerun. Desktop/mobile new-theme screenshots were reviewed, using the intentional text-only/no-product-image layout.
- Production build and its TypeScript phase passed after correcting a nullable fixture selector. Changed TypeScript files passed targeted lint after cleanup. Existing tests were preserved; neither the full offline suite nor full browser suite was run.

Hosted migration, real-account browser persistence, actual Storage uploads, favicon rendering in hosted browsers, Safari/Firefox, and uploaded-image layout acceptance remain unverified. No hosted migration, commit, push, publication, or deployment was performed. The editor's existing 1,000-product preview limit remains. Other themes, nested blocks, separately editable product/category templates, undo/redo, rollback UI, guides, and collections remain planned rather than represented by fake controls.

## 7A — Website Designer foundation implemented locally

September 22, 2026. Added a full-screen `/designer` with homepage section selection, settings, add/reorder/duplicate/hide/remove controls, keyboard reorder buttons, desktop/mobile viewport preview, and separate interactive preview mode. Text, image/caption, and featured-product sections extend the migrated introduction/catalog layout. Existing branding controls remain available in the designer. Public rendering and preview use the same registry/components, preserve affiliate disclosures and links, and keep selection overlays out of public output.

The additive designer migration copies existing branding into versioned configurations and preserves published layouts, data, and URLs. Draft and published snapshots are separate, publication is transactional, revisions reject stale writes, and a previous distinct published snapshot is retained. Existing Settings publication also applies the saved draft atomically. Immutable assets and protected migrated logos remain available to published and previous designs. Legacy branding writes become read-only. See [designer setup](DESIGNER_SETUP.md) for deployment order and behavior.

Focused verification:

- Targeted existing test files passed: branding/database policies (including five focused 7A cases), public access, public logos, publishing actions, proxy authentication, and public metadata. Checks cover migration compatibility, draft privacy, save/read persistence, atomic snapshots, stale-tab rejection, account isolation, invalid input, publication failure, and asset retention. The repeated-publish check confirms the previous distinct snapshot is retained.
- Four targeted browser cases passed across desktop/mobile: designer edit/save/reload, private draft versus live fixture, publication matching the preview, and existing storefront filters, pagination, affiliate links, disclosures, accessibility scan, and responsive layouts. The editor case initially used the wrong selector for a native select; correcting the test locator resolved it. Browser persistence is simulated in a separate fixture, not hosted Supabase.
- The production build includes TypeScript verification. Full lint found one Next.js navigation-link issue; it was fixed and the affected file passed lint. The production build was repeated to include that correction. Existing tests were preserved; no full offline/browser suite was run for this milestone.

Hosted migration, actual Storage uploads/downloads, real-account editor saves, and two-account hosted acceptance remain unverified. No migration was applied to a hosted project and no website was published or deployed. Section image uploads reuse the existing server decoder, but the browser fixture does not exercise actual uploads. The product picker/interactive catalog preview is limited to the newest 1,000 records. Undo/redo, blocks, expanded settings/library, other themes/templates, theme switching, and rollback UI remain planned under 7B/7C, not completed.

## Day 7 - implemented locally; hosted verification pending

Added Website Settings branding controls for logos, contrast-checked accent colors, backgrounds, system heading styles, and hero text. The live preview shares public storefront components. Save, defaults, discard, upload retry, and removal preserve saved state correctly. The setup checklist now reflects saved branding.

Added website-owned branding records with revision checks, published-only anonymous access, and a private logo bucket. Images are decoded and resized server-side. Replacing or removing logos cleans up only after successful persistence; uncertain outcomes retain files. Public logo responses recheck access and disable caching. See [branding setup](BRANDING_SETUP.md).

Verification: all 364 offline tests passed. Full browser suite: 32 passed, 10 explicitly skipped without hosted credentials. Branding checks cover save failure/retry, logo removal, defaults/discard, color validation, axe accessibility, and 320/768/1024px layouts. Desktop and mobile preview screenshots were reviewed. Production build, TypeScript, lint, formatting, and diff whitespace checks passed.

Hosted migration and live persistence/Storage verification remain pending. Apply `202609200006_branding.sql` after all earlier migrations and follow the setup guide's two-account checks. Browser saves use isolated fixtures; embedded Postgres models the Storage operation helper. No hosted migration, publication, commit, push, or deployment was performed for Day 7.

## Day 6 - implemented locally; hosted verification pending

September 20, 2026. The working tree was clean at the start of this milestone.

### Implemented

- Added a responsive public storefront at `/s/[siteSlug]`, outside the creator shell, with website-specific metadata, category filters, pagination, full product descriptions, image fallbacks, affiliate disclosure, and merchant links.
- Added confirmed publish/unpublish controls in Website Settings, requiring at least one product before first publication. All current catalog content is public while published, and saved edits appear live. Updated website/sidebar/product status text and setup progress.
- Added the publishing migration with owner-only status updates, anonymous published-content policies, and display-column grants that exclude account IDs and management fields. Public reads use a cookie-free anonymous client, including for signed-in owners.
- Kept image storage private and added download-only access for referenced published images. Public image routes recheck publication and disable caching; anonymous listing and signed-URL creation remain blocked. The migration requires Supabase's operation-aware Storage helper.
- Moved dashboard styles out of the root layout and gave public pages their own styles. Public requests skip creator session refresh, and page/image/database responses use no-store behavior. Published metadata explicitly overrides dashboard no-index defaults.
- Added [publishing setup](PUBLISHING_SETUP.md), including migration requirements, live-edit semantics, image access, cache limits, and hosted acceptance checks. Extended the opt-in hosted integration suite to cover publication and image access before/after unpublishing.

### Verified locally

- All 301 offline tests passed, including 54 new publishing/public-access/metadata/image/client tests.
- Production build, TypeScript, ESLint, Prettier, and diff whitespace checks passed.
- Full browser suite: 28 passed, 10 explicitly skipped. New checks cover public filters, pagination, descriptions, affiliate links, confirmation/cancellation, failed publication, unpublishing, no-index invalid routes, and no-store image responses. Axe scans and 320/768/1024px overflow checks passed. Desktop and mobile storefront screenshots were reviewed.
- Browser storefront and publishing interactions use simulated fixture data outside production routes. Production browser checks cover invalid public routes and authentication boundaries. Embedded Postgres tests model the Storage operation helper; real hosted behavior remains unverified.

### Remaining

Apply `202609200005_publishing.sql` after all prior migrations, configure SITE_URL for the deployment origin, and verify the signed-in publishing flow plus two-account access in a dedicated hosted test project. The migration and hosted integration tests were not run; no existing website was published, and no commit, push, or deployment was performed. Live dashboard checks were skipped without test credentials. Safari, Firefox, physical devices, and manual assistive-technology testing remain unverified.

Day 7 adds branding customization. Publishing currently uses the shared storefront design. Public content previously downloaded cannot be recalled; owner-generated dashboard signed image links retain their prior expiration, while the storefront itself never emits signed URLs.

---

## Day 5 - implemented locally; hosted verification pending

September 20, 2026. The working tree was clean when this milestone began.

### Implemented

- Replaced the preview-only product dialog with a saved catalog, dedicated create/edit routes, pagination, confirmed deletion, category/merchant selectors, descriptions, and validated affiliate links. Product existence now drives the setup checklist.
- Added product RLS, protected identity/ownership columns, composite same-website category/merchant foreign keys, and revision checks that reject stale-tab writes. Referenced categories/merchants cannot be deleted.
- Added a private image bucket and website-scoped Storage policies. JPEG/PNG/WebP uploads up to 2 MiB are decoded, checked against a 25-megapixel limit, resized, stripped of metadata, and encoded as WebP on the server. Added Sharp as a direct dependency and set the Server Action body limit to 3 MiB.
- Added local image previews, replacement/removal, input preservation on failure, temporary signed previews, and post-save image cleanup. Ambiguous database outcomes retain uploaded files for later reconciliation; no scheduled orphan cleanup job is installed.
- Updated setup docs and the roadmap. [Product setup](PRODUCT_SETUP.md) describes the two new migrations, privacy, limits, cleanup, hosted acceptance checks, and opt-in two-account Storage integration tests.
- Resolved the earlier auth browser failures: primary buttons darken on hover to preserve contrast, and the test opens the still-supported confirmation route directly instead of expecting the removed login link.

### Verified locally

- All 247 offline tests passed, including 65 new product/database/storage-policy/image-decoding/action tests.
- Production build, TypeScript, ESLint, Prettier, and diff whitespace checks passed.
- Full browser suite: 22 passed, 10 explicitly skipped. Product checks cover create/edit/delete, upload retry with preserved image selection, oversized-file recovery, image removal, desktop/mobile accessibility, and overflow at 320/768/1024px. Desktop and mobile editor screenshots were visually reviewed.
- Visual review caught native select resets after form submission. Fixed by remounting the form with retained state; all four product browser tests passed again with explicit category/merchant preservation assertions. The production build and lint passed again after this fix.
- Component browser tests simulate server responses in a Vite fixture outside production routes. Embedded Postgres uses a minimal storage-schema model to test policy logic. Neither substitutes for hosted Supabase Storage verification.

### Remaining

Apply migrations 202609200003_products.sql and 202609200004_product_images.sql after the existing migrations, then run the documented signed-in persistence and two-account Storage checks in a dedicated test project. Hosted migrations and integration tests were not run. No commit, push, or deployment was performed. The opt-in live dashboard tests were skipped without dedicated credentials; the no-configuration branch was skipped because Supabase configuration is present. Safari, Firefox, physical devices, and manual assistive-technology use were not verified.

Day 6 adds public website rendering and publishing. Products and images remain private drafts today.

---

## Day 4 ? implemented locally; hosted verification pending

September 20, 2026.

- Added website-owned categories and merchants with create, rename, confirmed delete, validation, duplicate-name errors, pending feedback, and empty/no-website states.
- Added the third SQL migration with owner-only RLS, immutable ownership/identity columns, timestamps, scoped case-insensitive unique names, and composite keys for future product relationships.
- Updated overview category completion from saved data, removed Day 4 placeholders, and documented migration order in [catalog setup](CATALOG_SETUP.md).
- Verified 182 offline tests, production build, strict TypeScript, lint, formatting, and diff whitespace checks. Four catalog browser tests passed in desktop/mobile Chromium, including keyboard creation, CRUD, duplicate input preservation, delete cancellation, axe accessibility scans, and overflow checks at 320/768/1024px. These use simulated actions outside the production app; database and server actions are tested separately.
- The broader browser run had 12 passes, 12 skips, and 6 failures before the catalog submission fix. All four catalog failures were fixed and passed on targeted rerun. Two existing auth-screen checks failed (desktop button hover contrast and a mobile auth-flow timeout); those were outside the Day 4 changes and remain unresolved. Hosted/signed-in checks were skipped without test credentials.
- No hosted migration, commit, push, or deployment was performed. Apply the third migration and complete the hosted acceptance checks before marking Day 4 fully verified. Product management and image uploads remain Day 5.

---

## Immediate signup follow-up

- Changed signup to preserve Supabase's auto-confirmed session and redirect directly to the dashboard. Removed the confirmation resend link from the normal login screen; existing confirmation links and password recovery still work through their existing routes.
- The project owner must turn off **Confirm email** in Supabase's Email provider settings. The publishable key cannot modify project configuration. Existing identity checks and account ownership protections remain in place.
- Real signup remains unverified until the hosted setting is changed. Added regression coverage for immediate signup, duplicate accounts, and invalid sessions.
- Verification: all 136 offline tests, TypeScript, and lint passed. A read-only hosted Auth settings check still reports email confirmation enabled.

## Signup configuration follow-up

- The disabled signup button was caused by missing Supabase configuration. After the project URL and publishable key were added, verified that the live Auth endpoint responds successfully, email signup and confirmation are enabled, and the local signup button is enabled with an 8-character minimum.
- Hosted `accounts` and `websites` REST checks return missing-table responses. Both migrations still need to be applied; real signup, email confirmation, and dashboard persistence remain unverified. Direct database hostname resolution failed, so applying migrations requires Session pooler connection details or the dashboard SQL Editor.
- Restored `.env.example` to placeholders after finding a committed database password. Local credentials are ignored by Git. The exposed database password needs rotation; restoring the template does not remove it from Git history.
- Changed the minimum password length from 12 to 8 for signup and password reset, including browser validation, server validation, messages, and setup instructions. The Supabase project's own minimum must also be set to 8.

## Day 3 — implemented locally; hosted verification pending

September 20, 2026. The working tree was clean at the start. `.env.local` exists, but the required Supabase URL, publishable key, and site origin are not configured; no live project connection or database mutation was attempted.

### Implemented

- Replaced the Website Settings placeholder with create/edit forms for a name, unique address, and optional description. Added slug suggestions, validation, pending/error/success feedback, and input preservation after errors.
- Added account-owned website persistence, one website per account, unique canonical slugs, draft-only status, managed timestamps, owner-only RLS, and protected ownership/status columns. Repeated creation is prevented by database constraints, including concurrent submissions.
- Updated the overview and sidebar to read saved website state. Only the website-details checklist step can become complete. Missing database tables or query errors show a load error instead of an empty state.
- Kept `/s/[siteSlug]`, publishing, branding, and all Day 4+ features unimplemented. Draft addresses are plain text, and there is no anonymous draft access, delete, or transfer UI.
- Added [website setup](WEBSITE_SETUP.md), migration instructions, offline database/action tests, isolated browser-component checks, and opt-in hosted website tests. The UI fixture is outside Next.js routes and never bypasses production authentication.

### Verified locally

- Production build, TypeScript, ESLint, formatting, and diff whitespace checks passed.
- 133 offline tests passed, covering account and website SQL migrations, cross-account isolation, insert/update/read privileges, forbidden ownership/status changes, uniqueness, reserved/invalid addresses, validation, actions, and query failures.
- Browser suite: 16 passed, 10 explicitly skipped. Passing cases include the existing unauthenticated production-app checks plus six desktop/mobile website-component checks with simulated save responses.
- Website forms passed automated axe checks, keyboard submission, error input preservation, create-to-edit state, slug suggestion behavior, and overflow checks at 320/768/1024px. Desktop creation and mobile draft screenshots were visually reviewed.

### Remaining and next task

Apply both migrations in order to a configured Supabase project (do not rerun Day 2 if already applied), then verify real creation, editing, reload persistence, overview progress, and two-account isolation. The real Supabase integration suite and signed-in browser flow were provided but not run. No deployment, commit, or push was performed. Safari, Firefox, physical devices, and manual screen-reader use were not verified.

After hosted Day 2/3 verification, Day 4 adds categories and merchants scoped to the owned website UUID.

---

## Day 2 — implemented locally; hosted verification pending

September 18, 2026. The user chose email/password with email confirmation and asked for implementation plus setup documentation without an existing Supabase project.

### Implemented

- Added signup, sign-in, sign-out, confirmation/resend, password recovery/reset, and account-name editing with responsive AffiPic screens.
- Added server-side Supabase SSR cookies, verified identity, protected dashboard routes, allowlisted return URLs, and private/no-store auth responses. No credentials means no dashboard access, rather than an insecure fallback.
- Added the personal account migration with Auth-triggered creation/backfill, RLS, owner-only reads/updates, column-restricted name edits, and no client insert/delete privileges.
- Added environment examples, email templates, [Supabase setup](SUPABASE_SETUP.md), and opt-in live integration/browser commands. No service-role credential is required or used.
- Preserved the Day 1 dashboard and product preview; website creation and other milestones remain unimplemented.

### Verification

- Production build, strict TypeScript, lint, and formatting checks passed.
- 50 offline tests passed: input/environment/redirect validation, mocked Auth server-action and proxy behavior, and 15 migration/privilege/RLS checks against embedded Postgres with a fixture Auth schema.
- Browser suite: 10 unauthenticated desktop/mobile Chromium checks passed. Eight signed-in checks are explicitly skipped without Supabase fixture credentials, including the preserved Day 1 dashboard cases and live sign-in/reload/sign-out flow.
- Auth screens passed automated axe checks on desktop/mobile. Inspected login screenshots, checked responsive overflow down to 320px, and verified protected redirects plus invalid confirmation-link recovery.
- No hosted migration, real Auth email delivery, token confirmation, session refresh/revocation, or PostgREST integration was executed. The opt-in live integration suite is provided, not reported as passing.

### Remaining setup and next task

Create a Supabase project, configure `.env.local`, apply the migration, enable email confirmation, and install the supplied templates. Complete the live checklist and two-account integration suite in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before marking Day 2 fully verified. The repository has a GitHub remote, but no linked Vercel project; this turn did not commit, push, or deploy. Browser validation does not include Safari, Firefox, physical devices, or manual screen-reader use.

After live Day 2 verification, Day 3 adds website creation and account ownership. No Day 3 feature has been implemented.

---

## Day 1 — complete locally

Verified on September 18, 2026, using Node.js 22.20.0 on Windows.

### Completed

- Preserved the existing Next.js 16.3.5 App Router foundation and strict TypeScript configuration; read the installed layout, component, and metadata documentation before implementation.
- Added Tailwind styling, shadcn/ui with Base UI primitives, Lucide icons, formatting configuration, an AffiPic SVG favicon, and page-specific metadata.
- Added a responsive creator shell with desktop sidebar, modal mobile navigation, breadcrumbs, active navigation, skip link, and keyboard focus states.
- Implemented all nine dashboard destinations. Seven future-feature routes have specific Coming soon content. Unknown feature routes return 404.
- Created the setup introduction and five linked checklist steps with an explicit uncreated website state and no fabricated performance statistics.
- Created an empty catalog and accessible product dialog containing all requested fields. Saving is disabled with a visible explanation. Closing discards input; no data or image is sent to an external provider.
- Documented account-owned websites, website-scoped content, separate future public layouts at `/s/[siteSlug]`, replaceable AI providers, and billing-independent entitlements.
- Added setup documentation, the full fifteen-milestone roadmap, deployment steps, and browser acceptance tests.

### Checks performed

- `npm run build`: passed; all expected dashboard pages prerendered successfully.
- `npm run typecheck`: passed, including route type generation and strict TypeScript checks.
- `npm run lint`: passed.
- `npm run format:check`: passed after final formatting.
- `npm run test:e2e`: 6 of 6 tests passed against the production build in desktop Chromium and mobile Chromium emulation.
- Browser checks covered root redirect, all nine navigation links, active states, mobile menu closing, product dialog keyboard opening, focus trapping, Escape/close-button dismissal, focus restoration, disabled saving, discarded preview input, and the empty catalog after reload.
- Automated axe scans passed on the overview and open product dialog in both viewports. Initial text contrast and duplicate landmark-label issues were fixed and verified by rerunning the suite.
- Checked horizontal overflow at desktop/mobile sizes and at 320, 768, and 1024 pixels. Visually reviewed the desktop and mobile overview screenshots.
- `git diff --check`: passed. npm reported zero known dependency vulnerabilities during installation.

### Limits and blockers

- No local implementation blocker remains.
- No Git remote, linked Vercel project, or local GitHub/Vercel CLI was configured. Work is saved in this checkout, but has not been pushed or deployed. README contains the exact repository and Vercel preview setup steps. No hosting provider was changed.
- Browser verification used Chromium only. Real devices, Safari, Firefox, and manual screen-reader operation were not verified. Automated accessibility checks do not replace manual assistive-technology testing.
- Authentication, Supabase access, storage, account isolation, public rendering, publishing, AI, payments, analytics, email, and all later-milestone functionality remain intentionally unimplemented. No external integration is claimed as connected.

### Next task — Day 2

Provision a Supabase project, decide the initial login method, and configure allowed local/preview callback URLs. Implement account authentication, server-side session handling, protected creator routes, account records, and database row-level security. Verify unauthenticated denial and cross-account data protection. Keep privileged credentials server-only. Website creation and ownership follow in Day 3.
