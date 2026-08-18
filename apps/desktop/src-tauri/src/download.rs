use std::collections::HashMap;
use std::path::{Path, PathBuf};

use futures_util::StreamExt;

use crate::models::ManagedModelRecord;

/// Resolve the primary models directory under the app's Application Support.
/// macOS: ~/Library/Application Support/com.glimpse.desktop/models/
pub fn models_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("~/.local/share"));
    base.join("com.glimpse.desktop").join("models")
}

/// Resolve candidate external directories where tools like LM Studio, oMLX, HuggingFace, or Ollama store GGUF models.
pub fn external_model_dirs() -> Vec<PathBuf> {
    let mut dirs_to_check = Vec::new();

    if let Some(home) = dirs::home_dir() {
        // LM Studio default model paths
        dirs_to_check.push(home.join(".cache").join("lm-studio").join("models"));
        dirs_to_check.push(home.join(".lmstudio").join("models"));

        // HuggingFace hub cache
        dirs_to_check.push(home.join(".cache").join("huggingface").join("hub"));

        // oMLX and local model directories
        dirs_to_check.push(home.join(".omlx").join("models"));
        dirs_to_check.push(home.join(".ollama").join("models"));
        dirs_to_check.push(home.join("models"));
    }

    dirs_to_check
}

/// Resolve the local file path for a model ID in primary storage.
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
/// Emits `model:download-progress` and `model:download-done` via rustra event sink.
pub async fn download_model(
    _app: &tauri::AppHandle,
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

    let response = match client.get(&url).send().await {
        Ok(res) => res,
        Err(e) => {
            if tmp_path.exists() {
                let _ = tokio::fs::remove_file(&tmp_path).await;
            }
            return Err(format!("Download request failed: {}", e));
        }
    };

    if !response.status().is_success() {
        if tmp_path.exists() {
            let _ = tokio::fs::remove_file(&tmp_path).await;
        }
        return Err(format!(
            "HuggingFace returned status {} for {}",
            response.status(),
            url
        ));
    }

    let total_bytes = response.content_length().unwrap_or(model.size);
    let mut bytes_received: u64 = 0;

    // Open temp file for writing
    let mut file = match tokio::fs::File::create(&tmp_path).await {
        Ok(f) => f,
        Err(e) => return Err(format!("Failed to create temp file: {}", e)),
    };

    use tokio::io::AsyncWriteExt;

    let mut stream = response.bytes_stream();
    let model_id = model.id.clone();

    while let Some(chunk_result) = stream.next().await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => {
                let _ = tokio::fs::remove_file(&tmp_path).await;
                return Err(format!("Download stream error: {}", e));
            }
        };

        let chunk_len = chunk.len() as u64;

        if let Err(e) = file.write_all(&chunk).await {
            let _ = tokio::fs::remove_file(&tmp_path).await;
            return Err(format!("File write error: {}", e));
        }

        bytes_received += chunk_len;

        let percentage = if total_bytes > 0 {
            (bytes_received as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        // Emit progress via rustra event sink
        glimpse_bridge::emit_model_download_progress(
            &model_id,
            bytes_received,
            total_bytes,
            percentage,
        );
    }

    if let Err(e) = file.flush().await {
        let _ = tokio::fs::remove_file(&tmp_path).await;
        return Err(format!("File flush error: {}", e));
    }
    drop(file);

    // Rename temp file to final destination
    if let Err(e) = tokio::fs::rename(&tmp_path, &dest_path).await {
        let _ = tokio::fs::remove_file(&tmp_path).await;
        return Err(format!("Failed to rename temp file: {}", e));
    }

    // Emit done via rustra event sink
    glimpse_bridge::emit_model_download_done(&model.id, &dest_path.to_string_lossy());

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

/// Recursively collect all `.gguf` files under a directory (up to max depth 4).
fn collect_gguf_files(dir: &Path, depth: usize, out: &mut Vec<PathBuf>) {
    if depth > 4 || !dir.exists() || !dir.is_dir() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_gguf_files(&path, depth + 1, out);
            } else if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("gguf")) {
                out.push(path);
            }
        }
    }
}

/// Scan all model directories (primary + external LM Studio/oMLX/HuggingFace paths).
/// Returns a map of filename/stem (lowercase) -> absolute PathBuf.
pub fn scan_available_model_files() -> HashMap<String, PathBuf> {
    let mut file_map = HashMap::new();
    let mut all_files = Vec::new();

    // 1. Scan primary Glimpse models directory
    collect_gguf_files(&models_dir(), 0, &mut all_files);

    // 2. Scan external tool directories (LM Studio, HuggingFace, oMLX, etc.)
    for external_dir in external_model_dirs() {
        collect_gguf_files(&external_dir, 0, &mut all_files);
    }

    for path in all_files {
        // Map by full filename: e.g. "qwen3.5-0.8b-q4_k_m.gguf"
        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
            file_map.insert(file_name.to_lowercase(), path.clone());
        }
        // Map by stem: e.g. "qwen3.5-0.8b-q4"
        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
            file_map.insert(stem.to_lowercase(), path);
        }
    }

    file_map
}

/// Update model records with their on-disk download status across primary and external locations.
pub fn sync_download_status(models: &mut Vec<ManagedModelRecord>) {
    let available_files = scan_available_model_files();

    for model in models.iter_mut() {
        let id_key = model.id.to_lowercase();
        let filename_key = model.filename.to_lowercase();
        let filename_stem = model
            .filename
            .strip_suffix(".gguf")
            .unwrap_or(&model.filename)
            .to_lowercase();

        // Check if matching GGUF file exists in primary or external folders (LM Studio, etc.)
        let matched_path = available_files
            .get(&id_key)
            .or_else(|| available_files.get(&filename_key))
            .or_else(|| available_files.get(&filename_stem));

        if let Some(found_path) = matched_path {
            if model.status == "not_downloaded" {
                model.status = "ready".into();
            }
            if model.path.is_none() {
                model.path = Some(found_path.to_string_lossy().to_string());
            }
        }
    }
}
