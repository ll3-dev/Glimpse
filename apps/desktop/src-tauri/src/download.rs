use std::collections::HashMap;
use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use serde::Deserialize;
use sha2::{Digest, Sha256};

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

/// Build an immutable HuggingFace download URL from repo, commit, and filename.
pub fn hf_url(repo: &str, revision: &str, filename: &str) -> String {
    format!(
        "https://huggingface.co/{}/resolve/{}/{}",
        repo, revision, filename
    )
}

#[derive(Deserialize)]
struct HubRepoInfo {
    sha: String,
    siblings: Vec<HubFile>,
}

#[derive(Deserialize)]
struct HubFile {
    rfilename: String,
    size: Option<u64>,
    lfs: Option<HubLfsInfo>,
}

#[derive(Deserialize)]
struct HubLfsInfo {
    sha256: String,
    size: u64,
}

struct VerifiedArtifact {
    url: String,
    size: u64,
    sha256: String,
}

async fn resolve_verified_artifact(
    client: &reqwest::Client,
    repo: &str,
    filename: &str,
) -> Result<VerifiedArtifact, String> {
    let response = client
        .get(format!(
            "https://huggingface.co/api/models/{repo}?blobs=true"
        ))
        .send()
        .await
        .map_err(|error| format!("Failed to resolve model metadata: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "HuggingFace metadata returned status {} for {}",
            response.status(),
            repo
        ));
    }

    let repo_info: HubRepoInfo = response
        .json()
        .await
        .map_err(|error| format!("Invalid HuggingFace metadata: {error}"))?;
    let file = repo_info
        .siblings
        .iter()
        .find(|file| file.rfilename == filename)
        .ok_or_else(|| format!("Model file is missing from HuggingFace metadata: {filename}"))?;
    let lfs = file
        .lfs
        .as_ref()
        .ok_or_else(|| format!("Model file has no LFS SHA-256 metadata: {filename}"))?;
    let size = lfs.size.max(file.size.unwrap_or(0));
    if repo_info.sha.is_empty() || lfs.sha256.is_empty() || size == 0 {
        return Err("Model metadata is incomplete; refusing an unverified download".into());
    }

    Ok(VerifiedArtifact {
        url: hf_url(repo, &repo_info.sha, filename),
        size,
        sha256: lfs.sha256.clone(),
    })
}

/// Download a GGUF model from HuggingFace with progress events.
///
/// Emits `model:download-progress` / `model:download-done` /
/// `model:download-failed` via rustra event sink.
///
/// - `is_cancelled`: 다운로드 루프가 chunk 사이에 조회하는 취소 플래그.
/// - tmp 파일이 남아 있으면 `Range` 헤더로 이어받기(서버가 206을
///   돌려주지 않으면 처음부터 다시 받는다).
/// - 완료 시 수신 바이트가 기대 크기와 일치(±1KB)하는지 검증한 뒤
///   rename 한다 — 서버 조기 종료로 인한 부분 파일 완성본 취급 차단.
#[allow(clippy::too_many_arguments)]
pub async fn download_model(
    _app: &tauri::AppHandle,
    model: &ManagedModelRecord,
    is_cancelled: &(dyn Fn(&str) -> bool + Send + Sync),
) -> Result<PathBuf, String> {
    let dest_dir = models_dir();
    tokio::fs::create_dir_all(&dest_dir)
        .await
        .map_err(|e| format!("Failed to create models dir: {}", e))?;

    let dest_path = dest_dir.join(format!("{}.gguf", model.id));
    let tmp_path = dest_path.with_extension("gguf.tmp");

    let model_id = model.id.clone();

    // 실패 경로 정규화: tmp 정리 + 실패 이벤트 발행을 한 곳에서.
    let fail = |msg: String| -> Result<PathBuf, String> {
        if tmp_path.exists() {
            let tmp = tmp_path.clone();
            tokio::spawn(async move {
                let _ = tokio::fs::remove_file(&tmp).await;
            });
        }
        glimpse_bridge::emit_model_download_failed(&model_id, &msg);
        Err(msg)
    };

    let client = match reqwest::Client::builder().build() {
        Ok(c) => c,
        Err(e) => return fail(format!("Failed to create HTTP client: {}", e)),
    };
    let artifact = match resolve_verified_artifact(&client, &model.repo, &model.filename).await {
        Ok(artifact) => artifact,
        Err(error) => return fail(error),
    };
    let url = artifact.url;

    // --- 재개 판단: 남은 tmp 크기로 Range 시작점 계산 ---
    let mut resume_offset: u64 = 0;
    if let Ok(meta) = tokio::fs::metadata(&tmp_path).await {
        resume_offset = meta.len();
        if resume_offset >= artifact.size {
            // tmp 가 이미 기대 크기 이상이면 이어받기 불가 — 처음부터.
            resume_offset = 0;
        }
    }

    let mut request = client.get(&url);
    if resume_offset > 0 {
        request = request.header("Range", format!("bytes={}-", resume_offset));
    }

    let response = match request.send().await {
        Ok(res) => res,
        Err(e) => return fail(format!("Download request failed: {}", e)),
    };

    if !response.status().is_success() {
        return fail(format!(
            "HuggingFace returned status {} for {}",
            response.status(),
            url
        ));
    }

    // 206(Partial Content)이면 이어받기 성공 — 그 외 2xx는 서버가 Range
    // 를 무시하고 전체를 보낸 것이므로 처음부터 받는다.
    let resuming = resume_offset > 0 && response.status() == reqwest::StatusCode::PARTIAL_CONTENT;
    let (file, start_offset): (std::fs::File, u64) = if resuming {
        let file = tokio::fs::OpenOptions::new()
            .append(true)
            .open(&tmp_path)
            .await;
        match file {
            Ok(f) => (f.into_std().await, resume_offset),
            Err(e) => return fail(format!("Failed to open temp file for resume: {}", e)),
        }
    } else {
        resume_offset = 0;
        match tokio::fs::File::create(&tmp_path).await {
            Ok(f) => (f.into_std().await, 0),
            Err(e) => return fail(format!("Failed to create temp file: {}", e)),
        }
    };
    let _ = resume_offset;

    let total_bytes = artifact.size;
    let mut bytes_received: u64 = start_offset;
    let mut file = tokio::fs::File::from_std(file);

    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut hasher = Sha256::new();
    if resuming {
        let mut prefix = match tokio::fs::File::open(&tmp_path).await {
            Ok(prefix) => prefix,
            Err(error) => {
                return fail(format!("Failed to hash resumed download: {error}"));
            }
        };
        let mut buffer = vec![0_u8; 1024 * 1024];
        loop {
            let read = match prefix.read(&mut buffer).await {
                Ok(read) => read,
                Err(error) => {
                    return fail(format!("Failed to hash resumed download: {error}"));
                }
            };
            if read == 0 {
                break;
            }
            hasher.update(&buffer[..read]);
        }
    }

    let mut stream = response.bytes_stream();

    // 진행 이벤트 쓰로틀: 청크마다 emit하면 수 GB GGUF에서 웹뷰 이벤트가
    // 폭주한다. 100ms 미만이면서 1% 미만 변화는 건너뛴다.
    let mut last_emit = std::time::Instant::now()
        .checked_sub(std::time::Duration::from_millis(1000))
        .unwrap_or_else(std::time::Instant::now);
    let mut last_percentage = -1.0_f64;

    while let Some(chunk_result) = stream.next().await {
        // 사용자 취소 — chunk 사이에 플래그 조회
        if is_cancelled(&model_id) {
            return fail("Download cancelled by user".to_string());
        }

        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => return fail(format!("Download stream error: {}", e)),
        };

        let chunk_len = chunk.len() as u64;

        if let Err(e) = file.write_all(&chunk).await {
            return fail(format!("File write error: {}", e));
        }
        hasher.update(&chunk);

        bytes_received += chunk_len;

        let percentage = if total_bytes > 0 {
            (bytes_received as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        let now = std::time::Instant::now();
        let elapsed_ok = now.duration_since(last_emit).as_millis() >= 100;
        let delta_ok = percentage - last_percentage >= 1.0;
        if elapsed_ok && delta_ok {
            glimpse_bridge::emit_model_download_progress(
                &model_id,
                bytes_received,
                total_bytes,
                percentage,
            );
            last_emit = now;
            last_percentage = percentage;
        }
    }

    if let Err(e) = file.flush().await {
        return fail(format!("File flush error: {}", e));
    }
    drop(file);

    // --- 최종 크기 검증: 서버 조기 종료로 짧게 끝난 스트림 차단 ---
    if (bytes_received as i64 - artifact.size as i64).abs() > 1024 {
        return fail(format!(
            "Size mismatch: received {} of {} bytes",
            bytes_received, artifact.size
        ));
    }

    let actual_sha256 = format!("{:x}", hasher.finalize());
    if actual_sha256 != artifact.sha256.to_lowercase() {
        return fail(format!(
            "SHA-256 mismatch: expected {}, received {}",
            artifact.sha256, actual_sha256
        ));
    }

    // Rename temp file to final destination
    if let Err(e) = tokio::fs::rename(&tmp_path, &dest_path).await {
        return fail(format!("Failed to rename temp file: {}", e));
    }

    // 마지막 진행 상태(100%)와 완료 이벤트를 보장
    glimpse_bridge::emit_model_download_progress(
        &model_id,
        bytes_received.max(total_bytes),
        bytes_received.max(total_bytes),
        100.0,
    );

    // Emit done via rustra event sink
    glimpse_bridge::emit_model_download_done(&model.id, &dest_path.to_string_lossy());

    Ok(dest_path)
}

/// 부팅 시 models_dir 에 남은 stale `*.gguf.tmp` 를 정리한다.
///
/// 다운로드 중 앱이 강제 종료되면 tmp 파일이 남는다 — 이를 완성본으로
/// 오인하는 일은 없지만(최종 .gguf 가 아니므로) 디스크 공간을 잡아
/// 두고 다음 다운로드의 overwrite 대상이 되므로 시작 시 제거한다.
pub fn cleanup_stale_tmp_files() {
    let dir = models_dir();
    if !dir.is_dir() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("tmp"))
            {
                let _ = std::fs::remove_file(&path);
            }
        }
    }
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
            } else if path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("gguf"))
            {
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
pub fn sync_download_status(models: &mut [ManagedModelRecord]) {
    let available_files = scan_available_model_files();
    let primary_dir = models_dir();

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
            // 우리 다운로드 산출물(primary dir)은 기대 크기를 알고
            // 있으므로 크기 검증으로 ready 판정 — 과거 부분 파일이나
            // 외부 도구의 미완성 파일이 로드 실패로 이어지는 것을 막는다.
            // 외부 dir(LM Studio 등)은 기대 크기를 특정할 수 없어
            // 존재만으로 판정한다.
            let is_primary = found_path.starts_with(&primary_dir);
            if is_primary && model.size > 0 {
                if let Ok(meta) = std::fs::metadata(found_path) {
                    let actual = meta.len();
                    let expected = model.size;
                    let tolerance = expected / 100; // 1%
                    if actual + tolerance < expected {
                        continue; // 크기 미달 — not_downloaded 유지
                    }
                }
            }

            if model.status == "not_downloaded" {
                model.status = "ready".into();
            }
            if model.path.is_none() {
                model.path = Some(found_path.to_string_lossy().to_string());
            }
        }
    }
}
