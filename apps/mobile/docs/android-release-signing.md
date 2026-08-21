# Android release signing

Glimpse release builds must use a production upload key. The Gradle configuration no longer falls back to the checked-in debug key.

## Local setup

1. Copy `android/keystore.properties.example` to `android/keystore.properties`.
2. Point `glimpse.releaseStoreFile` to the upload keystore and fill all four values.
3. Load the values as Gradle properties, or provide the equivalent environment variables:

   - `GLIMPSE_RELEASE_STORE_FILE`
   - `GLIMPSE_RELEASE_STORE_PASSWORD`
   - `GLIMPSE_RELEASE_KEY_ALIAS`
   - `GLIMPSE_RELEASE_KEY_PASSWORD`

The keystore and property file are ignored by Git. CI should supply the same values through its secret store.

## Validation-only build

Use `./gradlew :app:assembleRelease -Pglimpse.allowUnsignedRelease=true` only to prove that Release compiles. The resulting artifact is unsigned and must never be published.

A production `assembleRelease` or `bundleRelease` without all four signing values fails closed.
