# Day 8: Gemini product descriptions

## Visual editor and title suggestions

The description toolbar now edits visually using Tiptap; it no longer exposes Markdown in a textarea. Bold, italic, subheadings, lists and emojis share the public renderer's document model and styles. Existing plain text and version-1 Markdown stay readable and editable without migration. Newly edited formatted content can use the `affipic:description:v2` compact structured representation in the existing text field. No arbitrary HTML is interpreted. The 5,000-character storage limit includes formatting; an edit that exceeds it is rejected with an inline message instead of silently truncating saved content.

**Suggest titles with AI** is a separate inline action beside Product name. It reads the current name and the facts in the writing panel; the image is included only with explicit image consent. Three short distinct suggestions are validated as a single successful generation using the existing allowance system. Clicking a suggestion only changes the form. The original name remains available via **Undo title choice** until the product saves successfully. There are no automatic provider calls and no automatic saves/publications. Description generation remains a separate button. Both actions use the same account allowance, concurrency, cooldown, global cap and duplicate-request protection.

No new environment variables or migrations are required. Install the updated lockfile dependencies on deployment. The checks for this change were local manual fixture interactions with mocked title output plus the production build; hosted persistence, live Gemini titles and actual quota accounting were not exercised. The earlier verification entries below describe earlier milestones, not additional checks for this update.

## September 25 upgrade: inline workspace and image assistance

The current Add/Edit Product page replaces the original modal with inline writing controls. Product details and the description editor sit alongside the image and writing panels on desktop; mobile stacks image, product details, and AI controls. There is one shared product name. Source facts stay separate from description text and remain in the current editing session. Style presets and controls cover tone, Short/Standard/Detailed length, paragraphs/bullets/structured format, emojis, audience, closing CTA, and extra instructions. These all reach the provider prompt. Last preferences are stored per website in this browser, outside public branding; facts, results and image consent are not stored there. Consent always starts off.

The image picker supports dropping, previewing, replacing and removing files. Existing save-time Storage uploads remain unchanged. Selecting an image does not generate or publish. Explicitly enabling image assistance sends the selected file or the saved owned product image with the next generation. Server validation reuses the actual decoder (JPEG/PNG/WebP, 2 MiB, 25 megapixels, still images), strips metadata, and produces a separate WebP no larger than 1024px for Gemini. Unsaved AI images are processed in memory, not written to temporary storage. Existing-image paths come only from the owned product row and are downloaded through the authenticated client. No arbitrary URLs are fetched.

The current local model is `gemini-3.6-flash`; it has not been changed. Its official [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) confirms image input and [pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.6-flash) lists free-tier availability, checked September 25, 2026. Image mode permits this verified model and the existing `gemini-3.1-flash-lite` default. Other configured models remain available for text; image mode asks the operator to choose a verified model. The SDK uses inline image bytes following Google's [image-understanding guidance](https://ai.google.dev/gemini-api/docs/image-understanding), without Files API storage, tools, or billing changes. Documentation does not establish the actual project's billing tier or available quota.

The prompt permits only visible color, shape, pattern and design from an image, never inferred specifications, materials, safety, suitability or health claims. A name plus image can yield a limited visual description; unclear/conflicting input requests clarification instead. Clarifications and image-processing failures do not spend the successful-generation allowance. No automatic text-only fallback occurs. Text+image still counts as one generation and reuses all Day 8 reservation rules.

Descriptions support a toolbar and preview for paragraphs, bold, italic, subheadings, bullets, numbered lists and emojis. Newly formatted content uses a versioned `affipic:description:v1` prefix with a restricted Markdown subset inside the existing 5,000-character text column. Only explicit React text/formatting elements are rendered; HTML, links, embedded images and scripts are never interpreted. The editor, Curated detail pages, legacy storefront details, clean catalog excerpts and metadata all understand the format. Unmarked existing descriptions remain literal text, including existing asterisks, and are not rewritten. No database migration or new dependencies are needed.

Suggestions remain separate until **Apply to description**; **Undo AI replacement** restores the exact previous form value. Regenerate and discard do not save. Saving still updates a live catalog if the website is already published. Navigation links and page unloads warn for unsaved form changes/source notes/results. Same-document back/forward cancellation uses the Navigation API where supported; browser/device restrictions can suppress native leave warnings, so source notes should not be treated as durable storage.

Output limits are now 800/2,000/4,500 characters and 2,200 model output tokens, with the same 25-second provider timeout and no retries. No new environment variables or migration are required; retain existing secrets, beta enablement, and database quotas. No hosted quota, data, or publication was changed. See the latest [progress entry](PROGRESS.md) for mocked checks and the unsuccessful single live smoke attempt; live image-generation acceptance remains pending.

The original Day 8 setup below still applies to keys and database limits. Its modal/plain-text workflow descriptions are superseded by this upgrade.

AI writing extends the existing product form. Open **Write with AI**, check the name/category/facts, choose tone and length, generate, edit the result, then **Use description**. Applying changes only the local form; **Save product** is still required. On an already published website, that existing save behavior updates the live catalog. No design, publication, catalog, merchant link, or image is changed by generation. New unsaved products are supported.

## Enable locally and in Vercel

1. Apply all previous migrations, then `supabase/migrations/202609240001_product_ai.sql` in the Supabase SQL Editor or your migration workflow. It only adds two AI operational tables, indexes and server-only functions. It does not rewrite existing rows, policies, designs, or save/publish functions. Existing manual editing works while AI is disabled or unavailable.
2. In Google AI Studio, create/use an API key on a **free-tier project without paid billing**. Check that the selected model is available and inspect that project's current quota. This implementation does not enable billing, upgrade projects, switch models, or retry the provider automatically. A key belonging to a paid project can incur charges; a free-tier model name alone does not force free billing.
3. Set these variables in `.env.local` and the intended Vercel environment (then restart/redeploy):

   ```dotenv
   AI_WRITING_ENABLED=true
   GEMINI_API_KEY=YOUR_PRIVATE_GOOGLE_KEY
   GEMINI_MODEL=gemini-3.1-flash-lite
   SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SUPABASE_SERVER_KEY
   ```

   The last value is the Supabase service-role key or server secret key from project settings. It is used by a separate server-only client solely for usage RPCs; the normal authenticated client validates website/product/category ownership first. Keep the existing public Supabase URL/publishable key. Never prefix either private key with `NEXT_PUBLIC`, commit them, or paste them into chat. If enablement/credentials are missing, the dialog says **AI writing is not configured yet**, and manual editing remains available.

4. Set the global cap explicitly in the database. It defaults to **0**, intentionally preventing provider calls until configured. For example, **only if 10 attempts is comfortably below your actual project/model daily allowance**, run:

   ```sql
   update public.ai_limits
   set daily_success_limit = 10,
       cooldown_seconds = 10,
       global_daily_attempt_limit = 10
   where id = true;
   ```

   Adjust these three values in the SQL Editor, not client code. Account successes are shared across all owned websites. At most one reservation runs per account. The global cap includes failed and abandoned attempts and is not refundable. No client can read or mutate accounting tables, change limits, or invoke accounting RPCs directly. Set `AI_WRITING_ENABLED=false` to disable new AI calls without affecting editing; an already dispatched call may finish. Set the database cap to 0 to block new reservations immediately.

## Model and provider

Selected **gemini-3.1-flash-lite**, a stable, low-latency model for lightweight text work. Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) supports text and structured output, and its [pricing table](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite) lists free-tier input/output. Verified September 24, 2026. The official current JavaScript SDK is `@google/genai`, as documented in the [quickstart](https://ai.google.dev/gemini-api/docs/quickstart). The small `DescriptionProvider` interface and Gemini adapter live in `lib/server/ai/provider.ts`; the model is server-configurable with no fallback.

These are **AffiPic application limits**, separate from [Google's provider limits](https://ai.google.dev/gemini-api/docs/rate-limits). Google quotas are project/model/tier dependent, can also constrain requests/tokens per minute, and may change. Use the actual AI Studio allowance, leave headroom for other consumers, and account for differing reset windows (AffiPic uses UTC; Google's daily quotas use Pacific time). A cap that is safe over one UTC day can straddle a provider day; conservatively budget for that overlap. Provider 429s remain possible and are handled without retries. No billing, quota-increase request, AI guide, image generation, scraping, bulk action, or analytics integration was added.

## Privacy, quality and failure semantics

- Only the entered name, facts, selected category label, selected tone/length, and existing draft theme topic go to Gemini. There is currently no persisted brand-voice setting; the dialog's tone is used without adding a branding system. Affiliate URLs, account IDs, website IDs, auth details, other products, and secrets are excluded from the prompt. URLs and email addresses are stripped from writing fields. Users are told not to put private information into facts. Free-tier processing follows Google's terms; no prompt/output logging is added by AffiPic.
- Require a name and a factual sentence of at least 25 characters/five words, bounded to 3,000 facts characters. The model is instructed to treat strings as untrusted data and omit unsupported details, including safety/medical claims, materials, reviews, ratings and prices. It receives no tools, browsing, database access or secrets. Semantic truth cannot be guaranteed by a character validator; users must review every claim.
- Validate successful completion, structured JSON, plain text and output size (800 characters Short, 2,000 Standard) before displaying. Never render generated HTML. The result remains editable; all manual product fields survive failures/cancellation.
- The provider has a 25-second timeout/abort and exactly one SDK attempt. SQL locks the singleton limits row for short reservation/finalization transactions, not during the network call. UUID request IDs are retained across browser transport errors. An ID can never initiate a second model call; completed output is not persisted/replayed. If a response is lost, **Check request** confirms it cannot be run twice, then a deliberate new attempt gets a new ID.
- A successful valid result consumes one account allowance even if discarded. Failed/invalid responses consume no success allowance. Every accepted reservation counts toward the global attempt cap, conservatively including crashes before dispatch. Leases expire after two minutes (or UTC midnight, whichever comes first); subsequent attempts clean up expired leases. Late results cannot finalize. Requests do not start in the final 30 seconds of the UTC day. Success is finalized in the same UTC day as its reservation.
- If finalization is uncertain, output is withheld and the dialog explains that the request may have counted. Refresh the allowance rather than assuming a failed connection means an unused allowance. Provider cancellation is best-effort; Google may still process a timed-out request, which is why its global attempt stays counted.
- Stored metadata contains request/account/website IDs, status, model, timestamps and optional token counts. No prompt/output history is stored. Deleting an account/website nulls its reference without resetting the shared attempt count. Do not delete request IDs if indefinite duplicate suppression is required; a retention/tombstone policy is future operational work. No generation-history UI was added.

## Verification and remaining setup

See the Day 8 entry in [PROGRESS.md](PROGRESS.md) for executed checks. Database tests use embedded Postgres; browser tests use an isolated fixture with mocked responses, not hosted accounts or a live Google call. No Gemini key was configured locally, so no live generation was attempted. Apply the migration and configure the secrets/cap before a controlled hosted smoke test. Hosted concurrent transactions, real Supabase RPC permissions, Vercel request timeouts, live model output quality and provider quota behavior still need acceptance checks. Keep the beta disabled until those are satisfactory. Do not run a burst of live requests to test limits; use the mocks.
