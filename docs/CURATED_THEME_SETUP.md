# Curated: MishBaby-inspired customer websites

## Reference and adaptation

Read-only reference: [MishBaby-V2](https://github.com/MaorSaadia/MishBaby-V2/tree/d9942aecc9acadd6c702fb66fee126fbe5d7ab38), inspected September 23, 2026, at commit `d9942aecc9acadd6c702fb66fee126fbe5d7ab38`. A separate checkout lives at `D:\MyProjects\references\MishBaby-V2`; it was not edited or deployed. The [live site](https://www.mishbaby.com/) was accessible. Homepage desktop/mobile screenshots and category/product desktop screenshots were reviewed alongside the responsive source.

Presentation references were `app/globals.css`, `app/page.tsx`, `app/components/navbar.tsx`, `footer.tsx`, `product-card.tsx`, and the category/product page components. Curated adapts their pale color roles, readable deep accents, serif/sans typography pairing, roughly 1,150px content area, generous section spacing, rounded product/category cards, hero composition, compact mobile grid, product detail hierarchy, and multi-column footer. It is an AffiPic implementation with scoped CSS and the existing section registry, not a copied backend. No Sanity dependency, reference images, credentials, analytics identifiers, affiliate URLs, or customer data were imported. No claim is made that reference third-party imagery is licensed for redistribution.

## Customer experience

- New websites start with Curated. The homepage contains an intentional text-only introduction, catalog, category discovery, and an optional About section. Uploading a hero image enables its two-column composition. Empty About, image/text, and manually featured-product sections stay absent publicly. Collections and guides are not shown because those features do not yet exist.
- Existing websites can choose **Try Curated theme** in the existing designer. This explicitly upgrades the draft, preserving existing branding overrides, section IDs, text, images, product selections, visibility, and order. Missing discovery/About sections are appended if there is room within the existing 25-section limit. Nothing is published automatically. Discarding unsaved changes or reloading restores the saved draft; the previous published snapshot is retained by the existing publication transaction.
- **Site branding** provides a draft website-name override, optional topic/tagline, logo, favicon, Coast/Sage/Rose/Ink palettes and custom colors, heading/body font pairs, button shape, product-card style, category selection/order, footer text, and HTTPS social links. The name in Website Settings remains the fallback. Topic suggestions never create or replace content or categories. System font stacks avoid third-party font requests.
- Introduction settings add image, image fit/position, headline, text, alignment, CTA label, and internal CTA destination. Existing section add/reorder/duplicate/hide/remove controls and featured-product selection remain available. Header/footer selection opens their relevant settings.
- Product details use actual catalog names, descriptions, images, categories, and merchant links. Purchases remain external, with affiliate disclosure and sponsored link attributes. There are no invented prices, ratings, testimonials, or sales claims.
- Empty catalogs can show clearly labeled editor-only sample cards. Sample IDs are not UUIDs, links are empty, and samples are never offered by the product picker or stored in design JSON. Public rendering never imports the sample data. A sample preview does not satisfy the existing requirement to add a real product before publishing.

## Compatibility and setup

Apply `supabase/migrations/202609230001_curated_theme.sql` after `202609220001_designer.sql` and every earlier migration, before deploying this application version. Use the normal backup/migration workflow; do not rerun applied migrations.

The migration does **not** update any existing draft, published, previous-published, branding, catalog, or website row. It adds version-2 validation, changes the initial design for newly created websites, and extends published-asset access to the currently published favicon. Version-1 validation and the legacy storefront renderer remain available. Existing public URLs, including `?category=...` bookmarks, continue to work. The new theme adds website-scoped `/s/[siteSlug]/categories/[id]` and `/s/[siteSlug]/products/[id]` routes. These new routes require the Curated theme to be published. There are no public draft-preview routes.

All personalization lives in the existing versioned configuration. Draft Save remains private; Publish validates references, compares revision, and atomically replaces the published snapshot. Owner/anonymous RLS, explicit website scoping, immutable storage, and prior-snapshot protection remain in place. Public names and favicons come from the published design, never the current editor draft.

Favicon uploads accept still JPEG/PNG/WebP up to 1 MiB, are decoded by the existing image processor, resized within 64×64, and stored as WebP in private `design-assets`. Logo limits remain 1 MiB/512px; section images remain 2 MiB/1600px. Public requests recheck snapshot references and do not issue signed URLs. Replacing draft images never removes published assets. Asset reconciliation remains administrative; see [designer setup](DESIGNER_SETUP.md).

Custom text and accent colors must meet 4.5:1 contrast against background, surface, and white cards/buttons. Invalid palettes are rejected by application and database validation; unsaved invalid palette values use a safe preview fallback. Social URLs must use HTTPS. Arbitrary HTML, scripts, and CSS are not accepted.

## Limits and rollout checks

The editor still loads the newest 1,000 products. Product/category preview selectors inspect shared theme pages; they are not separate layout-template editors. Additional themes, nested blocks, guide/collection features, undo/redo, and rollback controls remain later work. Catalog edits themselves retain the existing live-update behavior; snapshot isolation covers design configuration and its image references.

Hosted migration, two-real-account browser flows, and hosted favicon/hero/logo uploads must still be checked in a dedicated Supabase project before rollout. Test a legacy published site before/after migration, a draft-only theme upgrade, publication, a second account's private records, and anonymous asset requests before and after publication/unpublication. See [progress](PROGRESS.md) for local results. No hosted project was migrated or deployed during implementation.
