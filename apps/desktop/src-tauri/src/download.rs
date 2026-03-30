use std::path::PathBuf;

use futures_util::StreamExt;
use tauri::Emitter;

use crate::models::{DownloadDoneEvent, DownloadProgressEvent, ManagedModelRecord};

/// Resolve the models directory under the app's Application Support.
/// macOS: ~/Library/Application Support/com.glimpse.desktop/models/
pub fn models_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("~/.local/share"));
    base.join("com.glimpse.desktop").join("models")
}

/// Resolve the local file path for a model ID.
pub fn model_path(model_id: &str) -> PathBuf {
    models_dir().join(format!("{}.gguf", model_id))
}

/// Check if a model file exists on disk.
#[allow(dead_code)]
pub fn is_model_downloaded(model_id: &str) -> bool {
    model_path(model_id).exists()
}

/// Build the HuggingFace download URL from repo and filename.
fn hf_url(repo: &str, filename: &str) -> String {
    format!(
        "https://huggingface.co/{}/resolve/main/{}",
        repo, filename
    )
}

/// Download a GGUF model from HuggingFace with progress events.
///
/// Emits `model:download-progress` and `model:download-done` Tauri events.
pub async fn download_model(
    app: &tauri::AppHandle,
    model: &ManagedModelRecord,
) -> Result<PathBuf, String> {
    let dest_dir = models_dir();
    tokio::fs::create_dir_all(&dest_dir)
        .await
        .map_err(|e| format!("Failed to create models dir: {}", e))?;

    let dest_path = dest_dir.join(format!("{}.gguf", model.id));
    let tmp_path = dest_path.with_extension("gguf.tmp");

    let url = hf_url(&model.repo, &model.filename);

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "HuggingFace returned status {} for {}",
            response.status(),
            url
        ));
    }

    let total_bytes = response.content_length().unwrap_or(model.size);
    let mut bytes_received: u64 = 0;

    // Open temp file for writing
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    use tokio::io::AsyncWriteExt;

    let mut stream = response.bytes_stream();
    let model_id = model.id.clone();
    let app_handle = app.clone();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Download stream error: {}", e))?;
        let chunk_len = chunk.len() as u64;

        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;

        bytes_received += chunk_len;

        let percentage = if total_bytes > 0 {
            (bytes_received as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        // Emit progress (throttled: only emit every ~1% change or every 1MB)
        let _ = app_handle.emit(
            "model:download-progress",
            DownloadProgressEvent {
                model_id: model_id.clone(),
                bytes_received,
                total_bytes,
                percentage,
            },
        );
    }

    file.flush()
        .await
        .map_err(|e| format!("File flush error: {}", e))?;
    drop(file);

    // Rename temp file to final destination
    tokio::fs::rename(&tmp_path, &dest_path)
        .await
        .map_err(|e| format!("Failed to rename temp file: {}", e))?;

    // Emit done
    let _ = app_handle.emit(
        "model:download-done",
        DownloadDoneEvent {
            model_id: model.id.clone(),
            path: dest_path.to_string_lossy().to_string(),
        },
    );

    Ok(dest_path)
}

/// Delete a downloaded model file from disk.
pub async fn delete_model_file(model_id: &str) -> Result<(), String> {
    let path = model_path(model_id);
    if path.exists() {
        tokio::fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete model file: {}", e))?;
    }
    Ok(())
}

/// Scan the models directory and return which model IDs have been downloaded.
pub fn scan_downloaded_models() -> std::collections::HashSet<String> {
    let dir = models_dir();
    let mut downloaded = std::collections::HashSet::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "gguf") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    downloaded.insert(stem.to_string());
                }
            }
        }
    }
    downloaded
}

/// Update model records with their on-disk download status.
pub fn sync_download_status(models: &mut Vec<ManagedModelRecord>) {
    let downloaded = scan_downloaded_models();
    for model in models.iter_mut() {
        if downloaded.contains(&model.id) {
            if model.status == "not_downloaded" {
                model.status = "ready".into();
            }
            if model.path.is_none() {
                model.path = Some(model_path(&model.id).to_string_lossy().to_string());
            }
        }
    }
}
