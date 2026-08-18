/**
 * Model Downloader Service
 *
 * Handles downloading GGUF models from HuggingFace with progress tracking.
 * Uses react-native-blob-util for file operations.
 */

import RNBlobUtil from 'react-native-blob-util';
import { HuggingFaceAPI } from './huggingface-api';
import type { ModelInfo } from './model-list';

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Bytes written so far */
  written: number;
  /** Total bytes to download */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Download state for tracking active downloads
 */
export type DownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; progress: DownloadProgress }
  | { status: 'completed'; path: string }
  | { status: 'error'; error: string };

/**
 * Callback for download progress updates
 */
export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Model downloader class
 *
 * Manages downloading, storing, and deleting GGUF model files.
 */
export class ModelDownloader {
  private static MODELS_DIR = `${RNBlobUtil.fs.dirs.DocumentDir}/models/`;
  /** 다운로드 중 임시 확장자 — 최종 파일과 구분해 부분 파일이 완성본으로 취급되지 않게 한다 */
  private static readonly PART_SUFFIX = '.part';
  private activeTask: { cancel?: () => Promise<unknown> | unknown } | null = null;
  private activeFilename: string | null = null;
  private cancelledFilenames = new Set<string>();

  /**
   * Ensure the models directory exists
   */
  private static async ensureModelsDir(): Promise<void> {
    const exists = await RNBlobUtil.fs.isDir(this.MODELS_DIR);
    if (!exists) {
      await RNBlobUtil.fs.mkdir(this.MODELS_DIR);
    }
  }

  /**
   * Get the local path for a model file
   */
  static getModelPath(filename: string): string {
    return `${this.MODELS_DIR}${filename}`;
  }

  /**
   * Check if a model is already downloaded.
   *
   * 존재만 확인하지 않는다 — 앱 강제 종료 등으로 남은 부분 파일이
   * 완성본으로 취급되면 모델 로드 단계에서 깨지는 문제가 생긴다.
   * 크기 검증에 필요한 expectedSize를 받아, 불일치 파일은 삭제 후
   * false를 반환한다.
   */
  static async isModelDownloaded(filename: string, expectedSize?: number): Promise<boolean> {
    const path = this.getModelPath(filename);
    try {
      const exists = await RNBlobUtil.fs.exists(path);
      if (!exists) {
        return false;
      }
      if (typeof expectedSize === 'number' && expectedSize > 0) {
        const stat = await RNBlobUtil.fs.stat(path);
        // content-encoding 등으로 ±1KB 오차를 허용한다
        if (Math.abs(stat.size - expectedSize) > 1024) {
          await RNBlobUtil.fs.unlink(path).catch(() => {});
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the size of a downloaded model file
   */
  static async getModelSize(filename: string): Promise<number | null> {
    const path = this.getModelPath(filename);
    try {
      const exists = await RNBlobUtil.fs.exists(path);
      if (!exists) {
        return null;
      }
      const stat = await RNBlobUtil.fs.stat(path);
      return stat.size;
    } catch {
      return null;
    }
  }

  /**
   * Delete a downloaded model file
   */
  static async deleteModel(filename: string): Promise<void> {
    const path = this.getModelPath(filename);
    try {
      const exists = await RNBlobUtil.fs.exists(path);
      if (exists) {
        await RNBlobUtil.fs.unlink(path);
      }
    } catch (error) {
      throw new Error(
        `모델 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * Download a model from HuggingFace
   *
   * @param model - Model info containing repo and filename
   * @param onProgress - Optional callback for progress updates
   * @returns Local file path on success
   */
  async downloadModel(model: ModelInfo, onProgress?: ProgressCallback): Promise<string> {
    await ModelDownloader.ensureModelsDir();

    const downloadUrl = HuggingFaceAPI.getModelDownloadUrl(model.repo, model.filename);
    const localPath = ModelDownloader.getModelPath(model.filename);
    const partPath = `${localPath}${ModelDownloader.PART_SUFFIX}`;

    // Get expected file size for progress calculation & final verification
    const expectedSize = await HuggingFaceAPI.getFileSize(model.repo, model.filename);

    // Check if already downloaded (with size verification when known)
    const alreadyDownloaded = await ModelDownloader.isModelDownloaded(
      model.filename,
      expectedSize ?? undefined,
    );
    if (alreadyDownloaded) {
      return localPath;
    }

    // 이전 시도의 고아 .part 파일 정리
    await RNBlobUtil.fs.unlink(partPath).catch(() => {});

    return new Promise((resolve, reject) => {
      // .part 에 기록해 완료 검증 전까지 최종 경로를 오염시키지 않는다
      const task = RNBlobUtil.config({
        path: partPath,
        indicator: true,
        overwrite: true,
      }).fetch('GET', downloadUrl, {
        Accept: 'application/octet-stream',
      });

      this.activeTask = task as { cancel?: () => Promise<unknown> | unknown };
      this.activeFilename = model.filename;

      task
        .progress({ count: 100 }, (received: number, total: number) => {
          const effectiveTotal = expectedSize ?? total;
          const progress: DownloadProgress = {
            written: received,
            total: effectiveTotal,
            percentage:
              effectiveTotal > 0 ? Math.min(100, Math.round((received / effectiveTotal) * 100)) : 0,
          };
          onProgress?.(progress);
        })
        .then(async (res) => {
          const writtenPath = res.path();

          // 크기 검증: 알려진 expectedSize 와 다르면 부분 다운로드다
          if (typeof expectedSize === 'number' && expectedSize > 0) {
            const stat = await RNBlobUtil.fs.stat(writtenPath).catch(() => null);
            if (!stat || Math.abs(stat.size - expectedSize) > 1024) {
              await RNBlobUtil.fs.unlink(writtenPath).catch(() => {});
              reject(
                new Error(
                  `다운로드 검증 실패: 예상 ${expectedSize}바이트, 실제 ${stat?.size ?? 'unknown'}바이트`,
                ),
              );
              return;
            }
          }

          // 검증 통과 — 최종 경로로 이동
          const moved = await RNBlobUtil.fs
            .mv(writtenPath, localPath)
            .catch(() => false);
          if (!moved) {
            await RNBlobUtil.fs.unlink(writtenPath).catch(() => {});
            reject(new Error('다운로드 완료 처리 실패: 최종 파일 이동 불가'));
            return;
          }
          resolve(localPath);
        })
        .catch((error) => {
          // Clean up partial download
          RNBlobUtil.fs.unlink(partPath).catch(() => {});
          if (this.cancelledFilenames.has(model.filename)) {
            reject(new Error('다운로드가 취소되었습니다.'));
            return;
          }

          reject(new Error(`다운로드 실패: ${error.message || '알 수 없는 오류'}`));
        })
        .finally(() => {
          if (this.activeFilename === model.filename) {
            this.activeTask = null;
            this.activeFilename = null;
          }
          this.cancelledFilenames.delete(model.filename);
        });
    });
  }

  /**
   * Cancel an active download
   *
   * Note: react-native-blob-util doesn't have a direct cancel method,
   * so we track active downloads and mark them for cancellation.
   */
  async cancelDownload(filename: string): Promise<void> {
    this.cancelledFilenames.add(filename);

    if (this.activeFilename === filename && this.activeTask?.cancel) {
      await Promise.resolve(this.activeTask.cancel());
    }
  }

  /**
   * List all downloaded models
   */
  static async listDownloadedModels(): Promise<string[]> {
    await this.ensureModelsDir();

    try {
      const files = await RNBlobUtil.fs.ls(this.MODELS_DIR);
      return files.filter((f) => f.endsWith('.gguf'));
    } catch {
      return [];
    }
  }

  /**
   * Get total storage used by downloaded models
   */
  static async getTotalStorageUsed(): Promise<number> {
    const files = await this.listDownloadedModels();
    const sizes = await Promise.all(files.map((file) => this.getModelSize(file)));
    return sizes.reduce((total, size) => total + (size ?? 0), 0);
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
  }
}

/**
 * Default downloader instance
 */
export const modelDownloader = new ModelDownloader();
