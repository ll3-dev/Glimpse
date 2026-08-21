# Desktop release

Normal development builds do not create updater artifacts. A release build is fail-closed and requires an HTTPS update endpoint, the updater public key, and the private signing key in the environment.

```sh
export GLIMPSE_TAURI_UPDATER_ENDPOINT='https://releases.example.com/{{target}}/{{arch}}/{{current_version}}'
export GLIMPSE_TAURI_UPDATER_PUBKEY='...'
export TAURI_SIGNING_PRIVATE_KEY='...'
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='...'
bun run --cwd apps/desktop tauri:build:release
```

`release:prepare` writes a mode-0600 config under ignored `src-tauri/.release/`. The private key is never written to that file; Tauri reads it directly from the environment. The updater endpoint must return signed metadata compatible with the configured public key.

Platform distribution still requires platform credentials:

- macOS: Developer ID signing and notarization credentials
- Windows: a trusted code-signing certificate
- Linux: the package repository or distribution signing policy

Do not publish an updater public key until its private key has been placed in durable secret storage. Losing the private key prevents trusted updates for already-installed clients.
