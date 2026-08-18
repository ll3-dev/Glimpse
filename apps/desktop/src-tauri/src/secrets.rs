//! OS 키체인 기반 시크릿 저장 (BYOK API 키).
//!
//! localStorage 평문 저장을 대체한다 — service/account 쌍으로
//! keyring Entry 를 만들어 조회/설정/삭제한다. macOS 는 Keychain,
//! Linux 는 Secret Service, Windows 는 Credential Manager.

use keyring::Entry;

const SERVICE: &str = "glimpse-desktop";

fn entry(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account).map_err(|e| format!("Failed to open keyring entry: {}", e))
}

#[tauri::command]
pub fn get_secret(account: String) -> Result<Option<String>, String> {
    match entry(&account)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read secret: {}", e)),
    }
}

#[tauri::command]
pub fn set_secret(account: String, secret: String) -> Result<(), String> {
    if secret.is_empty() {
        // 빈 값은 삭제로 취급 — 키체인에 빈 엔트리를 남기지 않는다
        return delete_secret_inner(&account);
    }
    entry(&account)?
        .set_password(&secret)
        .map_err(|e| format!("Failed to store secret: {}", e))
}

#[tauri::command]
pub fn delete_secret(account: String) -> Result<(), String> {
    delete_secret_inner(&account)
}

fn delete_secret_inner(account: &str) -> Result<(), String> {
    match entry(account)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete secret: {}", e)),
    }
}
