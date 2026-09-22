# Branding customization (Day 7)

**Superseded by 7A:** after the designer migration, use Site branding in the Website Designer. Saves remain private until publishing, and the legacy branding table is read-only. See [designer setup](DESIGNER_SETUP.md). The following describes the original Day 7 milestone.

Apply all migrations through Day 6, then apply `supabase/migrations/202609200006_branding.sql` using your normal Supabase migration workflow. Do not rerun applied migrations. The migration adds `website_branding`, its revision trigger and access policies, and the private `website-logos` bucket. It requires the earlier product revision function and publishing policies. Apply it before running this version against the hosted project: a failed branding query deliberately reports an error instead of pretending the site has no saved branding.

## Using the editor

Open **Website Settings → Website branding** after creating a website. Choose a dark accent color, one of three backgrounds, modern sans serif or classic serif headings, optional hero text, and an optional logo. The adjacent preview shares the actual storefront header and hero components. Its navigation is inert. Blank hero fields use the website name and description; page metadata continues to use the website name and description.

Edits remain local until **Save branding**. **Use defaults** prepares the original design and removes the logo on the next save. **Discard changes** restores the last saved design. Saving branding completes the branding setup checklist step, including when defaults are saved. A website without a branding row keeps the original design.

Saved changes appear immediately on a published website. Unpublish first if you want to edit privately. The editor rejects stale revisions so another tab cannot silently overwrite newer branding; reload after a conflict or uncertain network result. Website details and branding have separate Save buttons.

## Images, colors, and access

- Logos accept still JPEG, PNG, or WebP up to 1 MiB. Server-side decoding rejects invalid images and images above 25 million pixels, strips metadata, and outputs WebP within 512 × 512 pixels. Transparency is preserved. SVG and animated images are not accepted.
- Logo objects use immutable random paths scoped to the authenticated owner's website. Submitted website IDs and logo paths cannot select another website. A previous logo is deleted only after the new branding is saved. Cleanup failure is reported separately from save success; uncertain database outcomes retain files for reconciliation.
- The bucket stays private. Owners can preview their logos through one-hour signed URLs. Anonymous readers can download only logos referenced by published websites; anonymous listing and signed URL creation are denied. The public `/s/[siteSlug]/logo` route checks published access and streams bytes with `no-store`, without exposing owner preview URLs. Unpublishing blocks new anonymous requests; already downloaded content and unexpired owner preview URLs cannot be recalled.
- Accent colors must be six-digit hex values meeting 4.5:1 contrast against every supported background. The database enforces the same constraint, and the storefront maps validated values to CSS variables. Fonts and backgrounds use fixed allowlists; arbitrary CSS is not accepted. The calculation follows [W3C contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum). Storage operation restrictions use the [Supabase Storage helper](https://supabase.com/docs/guides/storage/schema/helper-functions).

After an interrupted upload/save, reconcile unused `website-logos` objects against `website_branding.logo_path` using trusted administrative tooling and a grace period for in-flight saves. Do not delete referenced files or infer unused objects from only one user's partial view. There is no automated orphan cleanup job.

## Hosted acceptance checks

Use two dedicated accounts in a test project after applying the migration:

1. Save text, colors, and a transparent PNG logo for account A. Reload settings and confirm persistence and checklist completion. Verify account B cannot read or change A's branding or storage objects.
2. Confirm A's draft page and logo are unavailable anonymously. Publish A's site with a product, then verify the saved design and logo in a signed-out browser.
3. Replace and remove the logo. Verify the new design survives reload, old unused files are cleaned up, and the public route shows the current logo or returns 404 after removal.
4. Open two settings tabs. Save in one, then confirm the stale tab reports a conflict without replacing the saved logo. Simulate upload failure and retry without losing text or selected image.
5. Unpublish and verify fresh anonymous page/logo requests fail. Test direct Storage download, listing, and signed URL behavior, since the offline database suite models the operation helper rather than running hosted Storage.

Local validation covers schemas, database ownership/public access, storage policies, server actions with real image decoding, failure cleanup, public logo responses, and desktop/mobile editor interactions. Hosted migration and acceptance checks remain pending. This milestone does not add custom fonts, custom CSS, favicon uploads, or a layout builder.
