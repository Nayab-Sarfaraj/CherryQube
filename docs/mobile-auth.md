# Android Clerk authentication setup

The app and the web deployment use one Clerk instance per environment. Never
point a development APK at production web or Clerk credentials, or a production
APK at development credentials.

## Environment matrix

| Build                      | Web deployment                  | Clerk instance       | Mobile build variables                                                             |
| -------------------------- | ------------------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| Development build          | local or development web origin | development instance | development publishable key, development web origin, development Google client IDs |
| EAS preview/internal build | preview web origin              | development instance | development publishable key, preview web origin, development Google client IDs     |
| EAS production / Play      | production web origin           | production instance  | production publishable key, production web origin, production Google client IDs    |

Set these variables for the matching web deployment:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` — server only; never use an `EXPO_PUBLIC_` prefix
- `CLERK_WEBHOOK_SECRET`
- `APP_BASE_URL`

Set these variables in the matching EAS build profile (and in
`apps/mobile/.env.local` for a local development build):

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_WEB_ORIGIN`
- `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID`

`apps/mobile/app.config.js` copies the two Google client IDs into Expo config.
This is required because EAS does not expose application environment variables
inside third-party native modules by default. These are public client IDs, not
secrets.

## Clerk dashboard — do this for each Clerk instance

1. Enable **Native API** under **Native applications**.
2. Add the Android native application with namespace and package name
   `com.cherryqube.app` (change this document and configuration together if
   the package name changes).
3. Enter the signing certificate's SHA-256 fingerprint for the appropriate
   build. Use the development keystore for a local development build; use the
   EAS/Play signing certificate for release builds.
4. Enable email code sign-in under the instance's sign-in options.
5. Under **SSO connections**, add Google for all users, enable it for both
   sign-up and sign-in, and select **Use custom credentials**.
6. Paste the Google Web OAuth client ID and client secret into the Google
   connection. Add the Clerk-provided authorized redirect URI to that Google
   Web OAuth client exactly as shown.

## Google Cloud Console — do this for each environment

Create a separate Google OAuth configuration for development and production so
their redirect URIs and client credentials cannot be mixed.

1. Configure the OAuth consent screen and create a **Web application** client.
   Add the authorized redirect URI supplied by the matching Clerk instance.
2. Create an **Android** OAuth client using package
   `com.cherryqube.app` and the SHA-1 fingerprint for every certificate
   that signs that environment's APK/AAB.
3. Use the Web client ID and secret in the matching Clerk Google connection.
   Use the Web and Android client IDs in the matching mobile environment.

Obtain a keystore's SHA-1 and SHA-256 with:

```sh
keytool -keystore <debug-or-release-keystore> -list -v
```

For local Android development this is normally the debug keystore. For EAS
release builds, retrieve the EAS Android signing certificate fingerprints. For
Google Play App Signing, register **both** the upload certificate and the Play
app-signing certificate SHA-1 values in Google Cloud; register the Play
app-signing SHA-256 value in the production Clerk Native application. Add any
additional rotated signing certificates before rollout.

## Build requirements

`<AuthView />` is Clerk's native authentication UI and requires a development
or release build. It does not run in Expo Go. The Expo plugins
`expo-secure-store`, `@clerk/expo`, and `@clerk/expo-native-components` are
registered in `apps/mobile/app.json`.

Google OAuth is handled by native Clerk UI, never by the WebView. The mobile
handoff sends only a single-use, 60-second Clerk ticket to `/mobile-auth`; it
never injects a JWT or Clerk secret into the WebView.

## Known draft behavior

When the web editor requests native authentication, text fields and host reply
details are saved to browser localStorage before the WebView reloads. The
selected photo is memory-only and is lost during this handoff. Do not describe
this as a complete draft restore until photo persistence is deliberately built.
