# Website Designer — 7A

7A adds a dedicated `/designer` workspace, reached from Website Settings. It edits the homepage using the same renderer as `/s/[siteSlug]`. Supported sections are the existing introduction and catalog, text, image/caption, and featured products. Select a section in the preview or sidebar, change its settings, and add, move, duplicate, hide, or remove sections. Arrow buttons support keyboard reordering. The catalog can be moved or hidden but remains in the configuration to preserve existing category and pagination URLs.

The desktop/mobile preview uses an iframe so viewport media queries match the preview width. Selection mode prevents navigation and highlights sections. Interactive mode enables disclosure controls, affiliate links, and private in-editor category/pagination navigation. Editing overlays are not included in public rendering. Catalog details are read from existing records; featured-product settings store only product IDs. The picker currently loads the newest 1,000 products. Catalog content edits retain the existing live-edit behavior; draft isolation applies to design configuration and design images.

Existing accent, background, heading font, and logo controls remain available under **Site branding**. Hero text is edited in the Introduction section. The old branding form is retired from Settings. Blocks, expanded global theme settings, and the rest of the section library are 7B. Theme switching, product/category templates, and rollback controls are 7C. The current single Homepage selector makes no promise of those later features.

## Migration and deployment

Apply `supabase/migrations/202609220001_designer.sql` after every previous migration, before deploying the new application. Do not rerun applied migrations. Back up the project using the normal operational workflow first.

The migration copies existing branding into version-1 design configurations. Published websites receive the same initial published snapshot; drafts receive no public snapshot. Existing names, slugs, products, affiliate links, branding rows, and files remain intact. New websites receive an initial design automatically. The old branding table becomes read-only to clients; new changes go through the designer. A migration failure rolls back the transaction. The new renderer requires this migration and fails closed if a published snapshot is unavailable.

## Saving and publishing

**Save draft** writes only the private draft and increments its revision. **Publish** validates and saves the current editor configuration, then applies the published snapshot and website status in one database transaction. Unsaved editor changes are included after confirmation. The previous published configuration is retained for the future rollback UI. Settings' existing Publish button publishes the last saved draft atomically; Unpublish still makes new anonymous requests unavailable. Publishing requires a product.

Revision checks prevent another editor tab from silently replacing newer changes. On a conflict or uncertain connection result, reload to reconcile the saved state before retrying. The editor warns before leaving with unsaved changes. Undo/redo is not implemented until 7B.

Server Actions validate configuration and verified identity. Database RPCs derive the website from `auth.uid()`, lock it, check revision, validate configuration and references, and perform the write. Clients cannot write snapshot columns directly. RLS and column grants expose only published snapshots to anonymous users of published websites; drafts and previous snapshots are owner-only. Renderer configuration uses constrained values and escaped text, with no custom HTML or scripts.

## Assets

Section uploads accept still JPEG/PNG/WebP up to 2 MiB, decode with the existing 25-megapixel limit, strip metadata, and store resized WebP in private `design-assets`. Logos keep the existing 1 MiB/512px limits and private `website-logos` bucket. Owner preview routes derive storage paths from the authenticated owner's website. Public media routes and Storage policies check the current published snapshot and disable caching.

Assets are immutable. Replacing a draft image never deletes a live or previous-version image. There is no automatic design-asset deletion in 7A: reconcile unused objects administratively against draft, published, and previous snapshots with a grace period for uploads in flight. Migrated logos referenced by any retained design cannot be deleted by the legacy cleanup path. Previously downloaded media cannot be recalled.

## Verification boundary

Local checks use embedded Postgres and simulated browser persistence; they do not prove hosted Supabase Storage behavior. Before rollout, verify in a dedicated hosted project that existing sites retain their appearance and URLs, save/reload preserves sections, a second account cannot read or mutate private designs or assets, draft edits leave signed-out output unchanged, publishing applies the intended snapshot, and failures preserve the previous published site. See [progress](PROGRESS.md) for the checks actually run.
