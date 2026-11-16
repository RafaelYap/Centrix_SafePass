# SafePass release status — November 16, 2026

Created Apple identifier com.sapphire.centrixsafepass and App Store Connect app Centrix SafePass (6835368063) under the confirmed team 94NL23B23D. Selected limited app access. No build uploaded, no app published, no signing credential created.

Added full-android-store AAB profile (bundleFullRelease) and full-ios submission mapping in eas.json. Existing Android package identity is preserved. Client regressions: 44 passed. Device readiness script passes its static Android checks, but reports missing google-services.json.

Still required before release:
- Authenticate local EAS CLI as the Expo project owner. Browser sign-in does not sign in the CLI.
- Build signed iOS IPA and Android AAB; verify actual signing identity. Android Gradle currently falls back to debug signing without release keystore properties; do not upload a debug-signed artifact.
- Configure APNs and Firebase/FCM. Existing push-enabled flag depends on an Android Firebase file, so iOS push must be configured and its platform handling reviewed separately.
- Validate iOS native prebuild, NFC entitlements, Face ID/camera/location permission strings, native dependencies, and Google iOS OAuth configuration.
- Review account deletion (no self-service deletion reference found in the inspected profile/server), privacy policy, store privacy/data-safety declarations, review accounts, screenshots and applicable Apple login requirements.
- Test login, registration, attendance, visitor lifecycle, exports, permissions, notifications and NFC on actual iPhone and Android devices.
- Complete Google Play account setup/access separately; only Apple and Expo accounts were accessed.

No claim of 100% readiness: no signed native build or device run has succeeded in this session. Store review is external.
