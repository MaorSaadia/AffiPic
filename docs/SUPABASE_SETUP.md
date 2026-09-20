# Day 2: Supabase setup and live verification

The application code and migrations are ready. The local project connection and enabled signup form have been verified, but the hosted account and website tables are still missing. No hosted database was changed and no live email/session integration was verified. Complete the remaining steps below.

## 1. Create the project and configure the environment

Create a Supabase project for AffiPic. From its Connect dialog, copy the **Project URL** and **publishable key** (`sb_publishable_...`). This app intentionally rejects secret keys and legacy JWT keys in the public-key setting. It does not require a service-role key.

Copy `.env.example` to `.env.local` and replace its placeholders:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SITE_URL=http://localhost:3000
```

Use the exact origin you browse. `localhost` and `127.0.0.1` are different cookie origins. `SITE_URL` determines email destinations and must not contain a path. Restart the development server after changing environment values. Builds work without these values, but account forms are unavailable and protected routes redirect to sign-in. There is no demo authentication bypass.

## 2. Apply the account migration

In the project's SQL Editor, run the complete contents of `supabase/migrations/202609180001_accounts.sql` once. This transaction creates the account table, trigger, privileges, row-level security policies, and backfills existing Auth users. Do not rerun it on an already-migrated database. When adopting Supabase CLI migrations later, record this migration as applied to avoid replaying it.

Each Auth user has one personal account with the same UUID. Auth creates the account through a database trigger. Authenticated users can read only their own record and update only `display_name`. The browser cannot insert/delete accounts or change their ID/timestamp. Deleting a user through administrative Auth tools cascades to that user's account. User metadata never determines ownership or permissions.

The migration must run as the project's administrative database role. The application itself uses the publishable key plus the current user's session, so RLS applies to application queries.

**Day 3 update:** the current dashboard also needs `supabase/migrations/202609200001_websites.sql`, applied after the account migration. Follow [website setup](WEBSITE_SETUP.md). The integration suite now creates a draft for each dedicated fixture account if none exists and tests website isolation as well; these fixture drafts remain for reuse.

## 3. Configure authentication and email

In Supabase Authentication settings:

1. Enable email/password signups. Under **Authentication → Sign In / Providers → Email**, turn **Confirm email off** and save. Supabase then implicitly confirms new users and returns a session; the app takes them directly to the dashboard. Keep anonymous sign-in disabled. Set the minimum password length to **8** to match the application (maximum accepted by the UI is 128 characters). This dashboard setting cannot be changed with the application's publishable key.
2. Set the project **Site URL** to `http://localhost:3000` for initial local testing. Add `http://localhost:3000/auth/confirm` to allowed Redirect URLs.
3. Signup confirmation emails are no longer required. If confirmation is enabled again later, install `supabase/templates/confirmation.html` under **Email Templates → Confirm signup**; the app retains its confirmation fallback.
4. In **Email Templates → Reset password**, paste `supabase/templates/recovery.html`.
5. Review Auth rate-limit settings and test email delivery. The default Supabase sender restricts delivery to authorized project-team addresses and is for testing. Configure custom SMTP before onboarding external users. This milestone does not connect Resend's API; a future transactional email adapter remains Day 13.

The templates use `.RedirectTo` (the app-supplied `/auth/confirm` URL) and `.TokenHash`. Do not leave the default confirmation-link template in place: this app handles token-hash confirmation, not the default code callback. A valid signup token redirects to `/dashboard`; a recovery token redirects to `/reset-password`. Invalid, expired, or reused links lead to a recoverable error page. Token links are single-use and should not be shared. Email-link scanning can consume single-use links; disable link tracking on your SMTP service and request a fresh link if needed.

Supabase handles Auth rate limiting. Server actions validate inputs, avoid returning raw provider errors, and use non-enumerating recovery/resend messages. No custom CAPTCHA is wired in this milestone; enabling a CAPTCHA requirement in Supabase also requires a corresponding client integration.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates), [custom SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 4. Verify the connected app

Run `npm run dev` and use two different email addresses you control:

- Sign up as account A. Check that you reach the dashboard immediately without a confirmation email. Visit **Your account**, change the name, and reload to confirm persistence.
- Sign out, verify direct dashboard URLs return to sign-in, and sign back in. Incorrect passwords and unconfirmed accounts must not gain access.
- In a separate browser profile, create account B. Confirm each account sees its own email/name. Do not use shared browser tabs as separate accounts; they share cookies.
- Request a password reset, follow its email, choose a new password, sign out, and verify the new password works and the old one does not.
- Test confirmation resend, expired/reused links, sign-out followed by browser Back/reload, and session refresh after access-token expiry. Sign-out ends the current session; it does not sign out every other device. An already-issued access token can remain valid at the database API until expiry, so use appropriate Supabase session settings.

Do not mark live verification complete until these checks pass.

## 5. Automated connected-project checks

Use a dedicated test Supabase project and two confirmed fixture users. Never run this workflow with real customer credentials. Put fixture login values in an ignored `.env.test.local`:

```dotenv
E2E_EMAIL=first-test-user@example.com
E2E_PASSWORD=replace-with-test-password
E2E_OTHER_EMAIL=second-test-user@example.com
E2E_OTHER_PASSWORD=replace-with-other-test-password
```

Point `.env.local` at that test project. Then run:

```sh
npm run test:integration
npm run build
npm run test:e2e:live
```

The integration command loads both environment files, signs in through the real Auth API, and checks own-account access, foreign-account denial, anonymous denial, and allowed updates through PostgREST. Updates write the existing display name back to avoid changing fixture content. It fails explicitly when configuration is missing. No administrative API keys are needed.

The live browser command enables the preserved dashboard/navigation/dialog tests and the sign-in, reload, account, and sign-out flow. Without fixture credentials, those eight desktop/mobile cases are explicitly skipped; unauthenticated browser checks still run. The browser suite launches the production server at `http://127.0.0.1:3100`; it does not send signup/recovery emails. The email flows and token expiry still require the manual checks above. Browser traces may contain fixture credentials/session cookies; keep `test-results/` private and ignored.

`npm test` runs offline validation/action/proxy tests and the actual SQL migration against embedded Postgres (PGlite), including two-account RLS and column privileges. The Auth schema there is a fixture, so these checks do not claim to validate hosted Supabase itself.

## 6. Vercel environments

Keep Vercel as the hosting provider. Add the two public Supabase values and `SITE_URL` to the appropriate Vercel environment, then redeploy. Use the exact HTTPS app origin as `SITE_URL`; this prevents email redirects from being derived from request headers. Add each trusted deployment's `/auth/confirm` URL to Supabase's redirect allowlist. A stable preview-branch URL is easiest to configure. Do not allow arbitrary third-party hosts. Use a separate test project for Preview when possible.

Keep all `.env.local` and `.env.test.local` files out of Git. Never configure a service-role/secret key with a `NEXT_PUBLIC_` prefix. Account pages are dynamically rendered, and auth-related responses use private/no-store cache headers. Do not add CDN caching or static export to authenticated routes.
