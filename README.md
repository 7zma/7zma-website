# 7ZMA Store

Arabic-first storefront for digital games and electronics, built with Next.js, Supabase, and Vercel. It uses explicit customer-selected currencies and does not use location to select a currency.

## Current delivery status

The repository contains the Arabic-first storefront, catalog and product detail routes, bundle state, a checkout form wired to the protected order API, order tracking, customer sign-in entry, legal/contact information routes, Supabase schema/security functions, rate limits, cron keepalive, and automated tests. The interface includes reduced-motion-aware section reveals, responsive control feedback, and a distinct Liquid Glass control layer. Legal pages are drafts and require owner review.

This is not yet a completed production store. The admin area is still an authorization gate rather than an operational dashboard; account onboarding, username selection, order history, admin MFA enrollment and CRUD, realtime updates, and some account/admin bot-protection flows remain. Supabase, Turnstile, and Vercel values are not configured in this workspace, so the local preview uses clearly labeled setup/empty states and cannot accept real orders.

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and fill the values using your own Supabase, Cloudflare Turnstile, and deployment accounts. Never commit `.env.local` or share service-role keys in chat.
3. In Supabase, create a project. In **Project Settings → API**, copy the project URL and anon/publishable key to the public variables. Put the service-role key only in the server variable.
4. In **SQL Editor**, run migrations `supabase/migrations/001_schema.sql` through `007_admin_storage_jobs.sql` in order, then run `supabase/seed.sql`. Enable `pg_cron`, `pg_trgm`, `fuzzystrmatch`, and Vault if your project has not enabled them. The Vault encryption secret must be created through the Vault dashboard/SQL interface; the function expects the name `7zma_stock_encryption_key`.
5. Configure Supabase Auth email delivery and allowed redirect URLs. Add the site origin and `/auth/callback` for local and production origins.
6. Create a Cloudflare Turnstile site and configure its public and secret keys. The order form includes the widget; account signup and admin authentication still need their corresponding flows.
7. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin in deployment settings. Set `CRON_SECRET` to a high-entropy random value and configure the same value in the Vercel project.
8. Install dependencies with `npm install`, then use `npm run dev`. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before release.
9. Import the project into Vercel and configure the same environment variables for Production, Preview, and Development as appropriate. Keep service-role and Turnstile secret values server-only.

## Bootstrap the first owner

Admin grants are deliberately not self-service. After creating the owner's Auth user, a trusted project operator must use Supabase's SQL editor to add that exact Auth UUID and the `owner` role to `public.admin_users` (including a display name). Then require authenticator-app MFA on the account and verify the session reaches AAL2. Never expose an owner-creation endpoint to the public web.

## Security boundaries

- Client reads go through public-safe views; the base tables are protected by RLS.
- Customer writes and stock operations must use validated server endpoints and the corresponding service-only database functions.
- The service-role key must not be imported into client components or exposed as a `NEXT_PUBLIC_` variable.
- Tracked inventory is encrypted at rest using a Vault-managed key; stock reveal operations are privileged and audited.
- Public order tracking uses a short-lived encrypted token and returns limited fields.
- Admin mutations require an allowlisted role and AAL2 in database-side checks.
- Rate limiting uses a keyed hash of the request source; it does not perform IP geolocation.
- The browser CSP is nonce-based and excludes `unsafe-eval`.

## Release gates still required

- Finish account onboarding/order history, MFA and admin CRUD, realtime propagation, operational release checks, and owner review of legal content.
- Add integration tests against a disposable Supabase project for RLS, SQL functions, coupon edge cases, inventory races, and cancellation/refund paths.
- Add browser coverage for Arabic RTL, English LTR, responsive layouts, screen readers, empty/error states, and the order lifecycle.
- Verify image and font CSP rules against the production storage domain.
- Confirm prices, taxes, business details, support contact, privacy text, terms, and refund policy with the store owner before taking real orders.
- Review the final threat model and obtain a production security review before enabling live credentials.
