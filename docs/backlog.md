# Post-launch implementation backlog

This backlog records deferred work. It is not evidence that an item has been
implemented, tested, or approved for production.

## Private S3 photo storage

- Replace the current upload contract with authenticated, five-minute presigned
  POST uploads that enforce allowed content types and an 8 MB
  `content-length-range` at S3.
- Use `temp/{clerkUserId}/{uuid}` for new objects and keep the uploads bucket
  private.
- Confirm uploads with `HeadObject`, validate the actual image bytes and
  format, and reject cross-user keys and arbitrary key manipulation.
- Persist durable object keys, not media or signed URLs. Generate fresh signed
  read URLs only after authorization.
- Promote temporary objects to permanent `photos/{clerkUserId}/{uuid}` keys
  idempotently before persisting draft, invitation, or render references.
- Add recovery for interrupted promotion, replaced photos, deleted drafts, and
  orphaned permanent assets. Never delete a key that is still referenced by a
  draft, invitation, or active render.
- Add API tests for unauthenticated access, invalid formats and sizes,
  ownership violations, confirmation, promotion, signed reads, and local
  storage compatibility.

## Web and Android upload UX

- Integrate the finalized S3 API into the web editor and Expo Android picker.
- Preserve instant local previews; add progress, loading, failure, retry, and
  expired-upload handling without unnecessary editor UI changes.
- Prevent save and export while a required upload is incomplete.
- Extend the typed WebView bridge only where upload state or confirmed object
  references must cross the native/web boundary.
- Add editor and Android integration tests for upload, replacement, retry, and
  local-storage development mode.

## Remotion Lambda and render operations

- Verify the provisioned Lambda, Serve URL, private-photo access, and all six
  templates with controlled real AWS renders.
- Generate render-time signed read URLs that remain valid for the entire render
  window; keep free exports watermarked at 720p.
- Bound distributed rendering to one active submission initially, queue excess
  work across app instances, and implement bounded backoff for throttling.
- Validate status polling, duplicate prevention, recovery, failure handling,
  MP4/poster downloads, the 90-second duration cap, and configurable per-user
  export limits.

## Security, quality, and release validation

- Document minimum production IAM permissions; do not treat administrator
  credentials as production runtime credentials.
- Review access to private uploads and the shared Remotion bucket; public pages
  must expose only explicitly shared content.
- Perform real end-to-end QA for auth, editor, drafts, photo replacement,
  exports, sharing, guest links, RSVP actions, and Android native flows.
- Record actual Lambda duration, memory, invocation count, S3 consumption, and
  measured/estimated cost in `docs/cost-benchmarks.md`. Do not fabricate data.
- Resolve formatting and relevant lint warnings; run `pnpm check`, production
  build, environment validation, and the complete test suite.
- Update README, stage documentation, `.env.example`, and deployment notes
  after the architecture is finalized.

## Explicitly out of scope for this backlog

RevenueCat, Google Play Billing, Play Store release, Vercel deployment,
production Clerk/domain/CORS configuration, Polar activation, and AI-writer
activation remain separate decisions.
