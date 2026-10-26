# Referral 10% and review photos — review report

## Applied database changes
- `0062_referral_ten_percent_issuance`: protected one-time rollout ledger; welcome allocator explicitly inserts percent/10 while preserving existing-code reuse, confirmation/queue gates and collision retries.
- Authorized data operation in `scripts/referral-ten-percent-rollout.sql`: updated **15 referral rows** in place. Five were already 10%; all 15 read back percent/10.
- Protected-field digest before and after: `5890f1422ee5adb21e2ac158aa12bc57`; exact before-record comparison returned **0 mismatches** excluding only discount type/value/update timestamp. No IDs/names/owners/usage/limits/expiry/combinations/history were changed.
- `0063_moderated_member_review_photos`: owned photo registry, private-storage owner/Admin read policies, published/nonarchived public registry reads, service-only atomic review/photo linkage.
- `0064_review_photo_cleanup_retry_safety`: retryable cleanup claims and database guard against linking cleanup-claimed/unready images or exceeding five photos.
- Private `review-photos` bucket created with a 5 MB limit. No browser INSERT/UPDATE/DELETE storage policies: authenticated server functions validate and own all writes.
- No project review/photo rows were created during verification; readback returned photo count 0.

## Referral editing
- Member profiles open the complete existing code editor, not a reduced rename form. Includes code name/type/amount/member link/active/expiry/limits/minimum spend/note/combination flags.
- Existing ID is updated, so rename cannot bypass code-ID redemption history. Exact unchanged expiry is preserved in member-profile edits.
- Admin/member rewards/code usage/checkout quote caches are invalidated after save.
- New Admin code form starts percent/10; explicit Admin custom values are not forced back to 10. Welcome allocator reuses custom codes unchanged.
- Per-code history/claims, self-referral, account/email matching, rewards, first offer, Club/caps and historical orders remain unchanged.

## Review photo behavior
- Add Image, local previews and removal; JPG/PNG/WebP only, maximum five, 5 MiB each (5,242,880 bytes).
- Server checks real image headers against declared MIME and limits dimensions to 40 megapixels. Paths are generated from verified user ID plus random upload ID; client paths/IDs cannot select storage destinations.
- Upload progress reports completed photos. Failures show errors and attempt owned-unlinked cleanup; storage cleanup failure is retryable without deleting the ownership record.
- Submission links the review and photos atomically and starts unpublished, unfeatured and unrated, matching existing moderation behavior.
- Shared public review cards and Admin review list/edit preview show accessible thumbnails with larger-view dialog.
- Public image endpoint accepts only upload UUIDs and rechecks published/nonarchived review status every request; no-store response, no arbitrary storage paths. Pending photos remain private. Owner/Admin signed URLs are temporary.

## Actual checks
- `bun test scripts`: **500 passed, 0 failed**, 5,556 assertions, 54 files, exit **0**.
- `bash scripts/referral-photo-db.test.sh`: **30 isolated PostgreSQL checks passed**, exit **0**. Covers in-place preservation, repeat-rollout/custom edits, future defaults, voucher preservation, owner/other/Admin reads and storage policies, linkage/moderation, six-file atomic rejection, path/type/size constraints and cleanup race/retry safety.
- Existing per-code lifecycle/concurrency suite: **33 checks passed**, exit **0**. Includes normalized email, own codes, same/different-code concurrency, retry/late/stale/manual payment settlement and vouchers.
- Latest automatic build/typecheck diagnostic: **build OK at 2026-10-26 11:42:24 UTC**. Earlier introduced type errors were corrected.
- Standalone `bunx tsgo --noEmit` and `bun run build` were **not run**: this environment's instructions prohibit manual project build/typecheck commands. No standalone exit codes or new full production bundle are claimed.
- Actual browser `/reviews`: Add Image signed-out notice, 64px natural-width local preview, removal, six-file rejection, SVG rejection, mobile no horizontal overflow and no page errors. Invalid/missing public image IDs returned 404.
- Browser scripts directly attached a local file only to test client previews; this was **not authenticated upload verification** and made no storage/review writes.
- Authenticated end-to-end upload/submission/readback and Admin save/readback remain **unverified**. Managed self-session mint failed because the requesting owner has no matching app auth account. No other member was impersonated. User must sign into preview to enable authenticated verification; do not fabricate a review merely for testing.

## Scope and publication
- No Publish action, orders/payments/emails, product changes, SEO changes or served/pending prep-pad artwork changes.
- New source scope: AdminDiscounts/AdminMemberRewards, LeaveReviewForm/AdminReviews/ReviewsStrip/ReviewPhotos; referral input/functions/welcome copy/referral page; review model/functions/photo validation/photo functions/public photo endpoint. Package dependency `image-size`, generated route/types, migrations, tests and notes are included.
- Reviewed SEO source is preserved; pending prep-pad assets remain unserved and untouched. Publish ships the full current application snapshot, not a selective feature subset.
- Outstanding verification: authenticated photo flow and Admin editing; standalone production build evidence. Owner retains publication control.