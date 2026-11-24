# CherryQube

Animated holiday greetings and video invitations — Thanksgiving, Christmas, and New Year's Eve — built with Next.js, Remotion, and React Native.

> **Web first.** Pick a template, edit it, preview it live in the Remotion Player, then export a real MP4.  
> **Android second.** An Expo shell loads the same web editor in a WebView.  
> **No AI video.** Everything is template-driven; AI only writes message text.

## What's inside

| Package             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `apps/web`          | Next.js editor, API, public result pages, guest pages, dashboard          |
| `apps/mobile`       | Expo React Native WebView shell for Android                               |
| `packages/remotion` | Compositions, scenes, themes, templates, inline-SVG florals, props schema |
| `packages/shared`   | Design tokens, mobile bridge schemas, shared types and constants          |

Six templates ship: a card and an invitation for each holiday theme.

| Theme                                 | Card             | Invitation          |
| ------------------------------------- | ---------------- | ------------------- |
| Thanksgiving "Harvest"                | Harvest greeting | Harvest gathering   |
| Christmas "Evergreen & Cranberry"     | Evergreen wishes | Evergreen gathering |
| New Year's Eve "Midnight & Champagne" | Midnight toast   | Midnight gathering  |

Durations run about 5–8 sec for cards and 20–30 sec for invitations, with a hard 90-sec cap enforced in the template registry.

## Local development

### 1. Start MongoDB

```sh
docker compose up -d --wait
```

### 2. Configure environment

```sh
cp .env.example apps/web/.env.local
```

Add at least `MONGODB_URI` and `APP_BASE_URL`. Clerk keys are optional — the picker and preview work without them; you only need them to save, export, or buy.

### 3. Install and run

```sh
pnpm install
pnpm --filter @greetings/web dev
```

Visit `http://localhost:3000/api/health` to confirm the app and database are connected.

### 4. Check everything

```sh
pnpm check
```

Runs typecheck, lint, tests, and formatting in one command.

## Templates and local renders

The picker is at `http://localhost:3000/`. Editors preview the shared Remotion composition live before any export happens. Text drafts live in browser storage; photos stay in memory during preview.

Open Remotion Studio:

```sh
pnpm --filter @greetings/remotion studio
```

Render a local MP4:

```sh
mkdir -p artifacts/local-renders
pnpm --filter @greetings/remotion exec remotion render src/root.tsx harvest-card ../../artifacts/local-renders/harvest-card.mp4
```

Swap `harvest-card` for `harvest-invitation`, `evergreen-card`, `evergreen-invitation`, `midnight-card`, or `midnight-invitation`. Local render timings are in `docs/cost-benchmarks.md`.

## Saved drafts and exports

For local rendering, run the worker in a second terminal (requires Clerk keys in `.env.local`):

```sh
pnpm --filter @greetings/web worker
```

The development worker reads jobs from MongoDB, writes watermarked 720p MP4s and posters, and removes unreferenced photos older than seven days at startup. Export status and downloads appear in the editor and dashboard.

For a deployed app, configure Remotion Lambda with `REMOTION_AWS_FUNCTION_NAME`, `REMOTION_SERVE_URL`, and `REMOTION_BUCKET_NAME` (or `S3_BUCKET`). The web service atomically claims each queued render and submits it directly to Lambda, including new exports, retries, HD jobs, and previously queued cached jobs. It polls Lambda status through the existing render API, so a long-running worker is not required in a Lambda-enabled deployment.

> Local media storage and the worker are development adapters. Production still needs S3 presigned uploads and AWS operational setup. Clerk webhooks hit `/api/webhooks/clerk` and need `CLERK_WEBHOOK_SECRET`.

To exercise the local pipeline against an isolated test database:

```sh
MONGODB_URI=mongodb://127.0.0.1:27017/greetings_stage4_test \
LOCAL_MEDIA_DIR=./.media-stage4-test \
pnpm --filter @greetings/web exec tsx scripts/verify-render-pipeline.ts
```

## Result pages and sharing

After exporting, choose **Open shareable result** in the editor or **Open result page** in the dashboard. Recipients can watch, download, share, or make their own creation without signing in. Set `APP_BASE_URL` to your deployed HTTPS origin before testing link previews in WhatsApp, iMessage, or X. Details are in `docs/stage-5.md`.

## Paid HD exports (implemented, currently disabled)

Polar one-time packs, the transactional credit ledger, and clean 1080p HD exports remain in the codebase, but are not part of the current launch UI. `NEXT_PUBLIC_ENABLE_PAID_EXPORTS=false` hides the paid controls and forces export requests to the free tier. Free exports remain watermarked.

Set `NEXT_PUBLIC_ENABLE_PAID_EXPORTS=true` only when Polar products, seller/support details, webhooks, and the paid-export launch decision are ready. Funded HD jobs render at 1080p without a watermark; failed paid jobs refund their credit automatically.

## AI message writer (implemented, currently hidden)

The server-side Anthropic integration and editable fallback suggestions are retained, but the editor does not show **Write it for me** by default. Set `NEXT_PUBLIC_ENABLE_AI_WRITER=true` to expose it after adding `ANTHROPIC_API_KEY` to `apps/web/.env.local`. Without a key — or if the provider times out — the flow returns curated suggestions and explains the fallback. See `docs/stage-7.md`.

## Personalized guest links

Invitation creators can add guests or paste/upload a CSV from the dashboard. Each guest gets a stable `/i/[token]` link that plays the invitation live with their name, plus email, WhatsApp, or SMS RSVP actions. RSVPs are not recorded on our side. See `docs/stage-8.md`.

## Android shell (Expo)

`apps/mobile` loads the same hosted web editor inside a WebView at `/?embed=1` and `/create/[templateId]?embed=1`. Native capabilities:

- Clerk sign-in via `@clerk/expo` with secure token storage, then a one-time auth ticket handed off to `/mobile-auth?ticket=…`
- Native photo picker: pick, downscale, upload to `/api/uploads`, and send the URL to the WebView
- Typed `postMessage` bridge (schemas in `packages/shared/src/mobile-bridge.ts`) for photo picking, sharing, and paywall requests
- Native share: download the MP4 to cache and open the Android share sheet
- WebView hardening: only the configured web origin may navigate; `mailto:`, `sms:`, and `wa.me` links open in the OS

```sh
pnpm --filter @greetings/mobile start
```

Configure `EXPO_PUBLIC_WEB_ORIGIN` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/mobile/.env.local`.

> In-app purchases through RevenueCat / Google Play Billing are not yet implemented; the paywall bridge message currently reports that purchases arrive in the next update.

## Documentation

- `docs/qa-phase-1-2.md` — Remotion core and Thanksgiving template QA
- `docs/stage-4.md` — Render pipeline: local worker for development and direct Lambda dispatch for deployment
- `docs/stage-5.md` — Public `/c/[shareId]` result pages, metadata, download, sharing
- `docs/stage-6.md` — Polar payments, HD exports, credit ledger
- `docs/stage-7.md` — AI message writer with Anthropic and curated fallback
- `docs/stage-8.md` — Guests, CSV import, `/i/[token]` links, RSVP deep links
- `docs/stage-9.md` — Remaining themes (Christmas, New Year's Eve) and polish
- `docs/cost-benchmarks.md` — Local render timings

## Still deployment work

- Provision the Remotion Lambda site/function and S3 bucket, then add the required production environment variables
- Replace the local upload adapter with S3 presigned uploads and lifecycle rules
- Measure Lambda cost, add an AWS budget alarm, and set an appropriate Lambda concurrency limit
- Fix the current `/mobile-auth` production-build Suspense boundary before Vercel deployment
- Decide when to enable Polar checkout and paid HD exports; until then, keep `NEXT_PUBLIC_ENABLE_PAID_EXPORTS=false`
- Decide when to expose the AI writer; until then, keep `NEXT_PUBLIC_ENABLE_AI_WRITER=false`
- Real-device QA: link previews in WhatsApp/iMessage/X, RSVP prefill on iPhone and Android, WebView auth handoff on a physical device
- RevenueCat / Google Play Billing and Play Store release
