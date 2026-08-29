//! Rolling pre-sync backups of the desktop database.
//!
//! Created BEFORE any merge (`apply_delta` / `merge_data`) so a corrupt
//! merge, crash, or power loss always has a file-level restore point.
//! Best-effort by design: SQLite transactions remain the primary guarantee,
//! this is the second net — a backup failure must never block the sync
//! itself, so callers log and continue.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Rolling backup folder under the app data directory.
const BACKUP_DIR: &str = "backups/pre-sync";
const MAX_BACKUPS: usize = 5;
/// The core database file the bridge opens at startup.
const DB_FILE: &str = "glimpse-core.db";

/// Copy the database (plus its WAL/SHM sidecars, so a checkpoint-in-flight
/// snapshot loses as little as possible) into the rolling backup folder.
/// Returns the copied DB path; a failure is propagated as `Err` but callers
/// treat backup failure as non-fatal.
pub fn backup_db_before_sync(app_data_dir: &Path) -> std::io::Result<PathBuf> {
    let source = app_data_dir.join(DB_FILE);
    if !source.exists() {
        // Nothing to protect (fresh install before first launch) — not an
        // error, there is simply no data at risk yet.
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "database file not found",
        ));
    }
    let dir = app_data_dir.join(BACKUP_DIR);
    fs::create_dir_all(&dir)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default();
    let dest = dir.join(format!("glimpse-core-{stamp}.db"));
    fs::copy(&source, &dest)?;
    for suffix in ["-wal", "-shm"] {
        let sidecar = app_data_dir.join(format!("{DB_FILE}{suffix}"));
        if sidecar.exists() {
            let _ = fs::copy(
                &sidecar,
                dest.with_file_name(format!("glimpse-core-{stamp}.db{suffix}")),
            );
        }
    }
    prune_old_backups(&dir)?;
    Ok(dest)
}

/// Keep only the newest [`MAX_BACKUPS`] `.db` snapshots; names sort
/// chronologically because the millisecond stamp is zero-padded by the
/// integer formatting.
fn prune_old_backups(dir: &Path) -> std::io::Result<()> {
    let mut backups: Vec<PathBuf> = fs::read_dir(dir)?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "db"))
        .collect();
    backups.sort();
    while backups.len() > MAX_BACKUPS {
        let oldest = backups.remove(0);
        // Sidecars of a removed snapshot are removed too; failures here are
        // cosmetic (an orphaned -wal file), never sync-blocking.
        for suffix in ["-wal", "-shm"] {
            let _ = fs::remove_file(oldest.with_file_name(format!(
                "{}{suffix}",
                oldest.file_name().and_then(|n| n.to_str()).unwrap_or_default()
            )));
        }
        let _ = fs::remove_file(oldest);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "glimpse-backup-test-{tag}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    #[test]
    fn backup_copies_database_into_pre_sync_folder() {
        let dir = temp_dir("copy");
        fs::write(dir.join(DB_FILE), b"db-content").expect("seed db");

        let dest = backup_db_before_sync(&dir).expect("backup");
        assert!(dest.exists());
        assert!(dest.to_string_lossy().contains("backups/pre-sync"));
        assert_eq!(fs::read(&dest).expect("read back"), b"db-content");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn missing_database_is_reported_not_panic() {
        let dir = temp_dir("missing");
        assert!(backup_db_before_sync(&dir).is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rolling_keeps_only_the_newest_snapshots() {
        let dir = temp_dir("rolling");
        fs::write(dir.join(DB_FILE), b"db").expect("seed db");

        // Six rounds with distinct stamps — the oldest must drop out.
        for _ in 0..(MAX_BACKUPS + 1) {
            backup_db_before_sync(&dir).expect("backup");
            // Same-millisecond copies would collide on filename; a small
            // sleep is the honest way to advance the stamp.
            std::thread::sleep(std::time::Duration::from_millis(2));
        }

        let kept = fs::read_dir(dir.join(BACKUP_DIR))
            .expect("backup dir")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|ext| ext == "db"))
            .count();
        assert_eq!(kept, MAX_BACKUPS, "rolling retention must cap snapshots");
        let _ = fs::remove_dir_all(&dir);
    }
}
