# Products and image uploads (Day 5)

Apply the existing account, website, and catalog migrations first. Then apply:

1. `supabase/migrations/202609200003_products.sql`
2. `supabase/migrations/202609200004_product_images.sql`

Use the Supabase SQL Editor or your established migration workflow. Do not rerun applied migrations. The image migration requires Supabase's managed storage schema and creates the private `product-images` bucket. No service-role key or public bucket is needed.

## Creator workflow

Create a website, then open Products and choose Add product. Name and an HTTP(S) affiliate URL are required. Description, category, merchant, and one image are optional. Categories and merchants must belong to the same website. Referenced categories and merchants cannot be deleted until their product connections are removed.

Products support creation, editing, confirmed deletion, and a catalog with 20 products per page. The overview marks the first-product step complete when a saved product exists. Saving does not publish anything.

Images accept still JPEG, PNG, or WebP files up to 2 MiB and 25 million decoded pixels. The server decodes, auto-orients, resizes to fit 1600 by 1600 without enlargement, strips metadata, and encodes WebP. The file uploads only when the product is saved. A new image replaces the previous image; the remove checkbox saves the product without an image.

The Server Action body limit is 3 MiB, with room for the 2 MiB upload and form fields. The browser and server validate independently. The bucket caps stored objects at 2 MiB and WebP. SVG, animated images, remote image imports, and multiple product images are not supported.

## Ownership and failure handling

Server actions derive the website from the authenticated identity. Product queries and mutations include its UUID, and RLS independently checks ownership. Composite foreign keys enforce same-website category/merchant references. IDs, ownership, timestamps, and the revision counter cannot be modified by clients. Revision checks reject stale updates and deletions.

Images use `website-uuid/random-uuid.webp` paths. Storage policies restrict upload/read/delete to the website owner, allow deletion only when no product references the image, and do not allow overwrites. The private bucket follows [Supabase Storage access-control guidance](https://supabase.com/docs/guides/storage/security/access-control). Server image decoding uses [Sharp's input pixel limit](https://sharp.pixelplumbing.com/api-constructor/).

The dashboard obtains signed preview URLs that expire after one hour. Anyone given a signed URL can access that image until expiration; reload the dashboard to renew an expired preview. No public website or anonymous bucket policy is installed.

After a successful replacement/removal/deletion, the app removes the obsolete object through the Storage API. On a confirmed database rejection or revision conflict, it attempts to remove the unused new upload. It preserves uploaded objects when a network failure leaves the database outcome uncertain, rather than risking deletion of a committed product's image. Cleanup failures after a successful save are shown separately from save failures.

Database writes and Storage API calls are not one transaction. Interrupted requests, failed compensation, and administrative website/account deletion can leave unused objects. No scheduled cleanup job is installed. For reconciliation, list objects older than 24 hours in the product-images bucket, compare their paths against all products' image_path values using an administrative server context, and delete only verified unreferenced objects through the Storage API or dashboard. Do not delete storage metadata with SQL, and never put an administrative key in browser code.

## Verification

- `npm test`: embedded Postgres product/RLS/storage-policy tests, server-action failure/authorization checks, validation, and actual image decoding tests.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`.
- `npx playwright test tests/product-ui.spec.ts`: isolated desktop/mobile form checks with simulated actions, upload retry, image preview/removal, CRUD, accessibility, and narrow layouts.
- `npm run test:integration`: opt-in dedicated hosted project tests with two accounts. The suite verifies real product persistence, private upload/download, signed URLs, cross-account denial, revision changes, and cleanup.

Configure test credentials as described in [Supabase setup](SUPABASE_SETUP.md). Hosted tests must use a dedicated test project; they create temporary products/images and clean up those exact fixtures. They have not been run as part of this local implementation.

Before marking Day 5 fully verified, use the signed-in app to save an uploaded image, reload, replace it, remove it, and delete the product. Check private image access with a second account and while signed out, category/merchant deletion restrictions, overview progress, stale-tab conflicts, and failed-upload input preservation. Verify a Vercel preview with the same migrations and configuration before release.

Publishing and public website rendering remain Day 6.
