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
   * Check if a model is already downloaded
   */
  static async isModelDownloaded(filename: string): Promise<boolean> {
    const path = this.getModelPath(filename);
    try {
      const exists = await RNBlobUtil.fs.exists(path);
      return exists;
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

    // Check if already downloaded
    const alreadyDownloaded = await ModelDownloader.isModelDownloaded(model.filename);
    if (alreadyDownloaded) {
      return localPath;
    }

    // Get expected file size for progress calculation
    const expectedSize = await HuggingFaceAPI.getFileSize(model.repo, model.filename);

    return new Promise((resolve, reject) => {
      RNBlobUtil.config({
        path: localPath,
        indicator: true,
        overwrite: true,
      })
        .fetch('GET', downloadUrl, {
          Accept: 'application/octet-stream',
        })
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
          const path = res.path();
          resolve(path);
        })
        .catch((error) => {
          // Clean up partial download
          RNBlobUtil.fs.unlink(localPath).catch(() => {});
          reject(new Error(`다운로드 실패: ${error.message || '알 수 없는 오류'}`));
        });
    });
  }

  /**
   * Cancel an active download
   *
   * Note: react-native-blob-util doesn't have a direct cancel method,
   * so we track active downloads and mark them for cancellation.
   */
  activeDownloads: Map<string, boolean> = new Map();

  cancelDownload(filename: string): void {
    this.activeDownloads.set(filename, false);
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
    let total = 0;

    for (const file of files) {
      const size = await this.getModelSize(file);
      if (size) {
        total += size;
      }
    }

    return total;
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
