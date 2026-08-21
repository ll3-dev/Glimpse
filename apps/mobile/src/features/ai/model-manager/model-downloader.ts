/**
 * Model Downloader Service
 *
 * Handles downloading GGUF models from HuggingFace with progress tracking.
 * Uses react-native-blob-util for file operations.
 */

import RNBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import { HuggingFaceAPI } from './huggingface-api';
import type { ModelInfo } from './model-list';
import {
  deleteModel,
  ensureModelDownloadDirectories,
  getModelPath,
  getModelSize,
  getPartialModelPath,
  isModelDownloaded,
  listDownloadedModels,
  movePartialModelToFinal,
  recoverModelDownload,
  type RecoveredModelDownload,
} from './model-download-storage';

export interface DownloadProgress {
  written: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export class ModelDownloader {
  private activeTask: { cancel?: () => Promise<unknown> | unknown } | null = null;
  private activeFilename: string | null = null;
  private cancelledFilenames = new Set<string>();

  static getModelPath(filename: string): string {
    return getModelPath(filename);
  }

  static async isModelDownloaded(
    filename: string,
    expectedSize?: number,
    expectedSha256?: string,
  ): Promise<boolean> {
    return isModelDownloaded(filename, expectedSize, expectedSha256);
  }

  static async getModelSize(filename: string): Promise<number | null> {
    return getModelSize(filename);
  }

  static async deleteModel(filename: string): Promise<void> {
    return deleteModel(filename);
  }

  static async recoverDownload(
    model: ModelInfo,
  ): Promise<RecoveredModelDownload> {
    const fileInfo = await HuggingFaceAPI.getFileInfo(model.repo, model.filename);
    return recoverModelDownload(
      model.filename,
      fileInfo?.size || model.sizeBytes,
      fileInfo?.lfs?.sha256 ?? fileInfo?.sha256,
    );
  }

  isDownloadActive(filename: string): boolean {
    return this.activeFilename === filename && this.activeTask !== null;
  }

  async downloadModel(model: ModelInfo, onProgress?: ProgressCallback): Promise<string> {
    await ensureModelDownloadDirectories();

    const localPath = ModelDownloader.getModelPath(model.filename);
    const partPath = getPartialModelPath(model.filename);
    const fileInfo = await HuggingFaceAPI.getFileInfo(model.repo, model.filename);
    const expectedSize = fileInfo?.lfs?.size ?? fileInfo?.size;
    const expectedSha256 = fileInfo?.lfs?.sha256 ?? fileInfo?.sha256;
    const revision = fileInfo?.revision;
    if (!expectedSize || !expectedSha256 || !revision) {
      throw new Error(
        '다운로드 검증 실패: 고정된 모델 버전 또는 SHA-256 메타데이터를 확인할 수 없습니다.',
      );
    }
    const downloadUrl = HuggingFaceAPI.getModelDownloadUrl(
      model.repo,
      model.filename,
      revision,
    );

    const alreadyDownloaded = await ModelDownloader.isModelDownloaded(
      model.filename,
      expectedSize,
      expectedSha256,
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
        indicator: Platform.OS === 'ios',
        overwrite: true,
        IOSBackgroundTask: Platform.OS === 'ios',
        addAndroidDownloads:
          Platform.OS === 'android'
            ? {
                useDownloadManager: true,
                path: partPath,
                title: model.name,
                description: 'Glimpse 로컬 AI 모델 다운로드',
                mime: 'application/octet-stream',
                notification: true,
                mediaScannable: false,
              }
            : undefined,
      }).fetch('GET', downloadUrl, {
        Accept: 'application/octet-stream',
      });

      this.activeTask = task as { cancel?: () => Promise<unknown> | unknown };
      this.activeFilename = model.filename;

      task
        .progress({ count: 100 }, (received: number, total: number) => {
          const effectiveTotal = expectedSize || total;
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
          if (writtenPath !== partPath && (await RNBlobUtil.fs.exists(writtenPath))) {
            await RNBlobUtil.fs.mv(writtenPath, partPath);
          }
          resolve(
            await movePartialModelToFinal(
              model.filename,
              expectedSize,
              expectedSha256,
            ),
          );
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

  async cancelDownload(filename: string): Promise<void> {
    this.cancelledFilenames.add(filename);

    if (this.activeFilename === filename && this.activeTask?.cancel) {
      await Promise.resolve(this.activeTask.cancel());
    }
  }

  static async listDownloadedModels(): Promise<string[]> {
    return listDownloadedModels();
  }

  static async getTotalStorageUsed(): Promise<number> {
    const files = await this.listDownloadedModels();
    const sizes = await Promise.all(files.map((file) => this.getModelSize(file)));
    return sizes.reduce((total, size) => total + (size ?? 0), 0);
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
  }
}

export const modelDownloader = new ModelDownloader();
