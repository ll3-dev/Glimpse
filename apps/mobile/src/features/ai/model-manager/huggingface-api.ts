/**
 * HuggingFace Hub API utilities
 *
 * Provides functions to interact with HuggingFace model repositories
 * for downloading GGUF models.
 */

import type { ModelInfo } from './model-list';

const HF_API_BASE = 'https://huggingface.co/api';
const HF_FILE_BASE = 'https://huggingface.co';

/**
 * File information from HuggingFace
 */
export interface HFFileInfo {
  /** File path/filename */
  path: string;
  /** File size in bytes */
  size: number;
  /** SHA256 hash */
  sha256?: string;
  /** LFS pointer info */
  lfs?: {
    sha256: string;
    size: number;
  };
}

/**
 * Repository information from HuggingFace
 */
export interface HFRepoInfo {
  /** Repository ID (e.g., "Qwen/Qwen2.5-1.5B-Instruct-GGUF") */
  id: string;
  /** Model ID */
  modelId: string;
  /** Available files */
  siblings: { rfilename: string }[];
}

/**
 * HuggingFace API class for model operations
 */
export class HuggingFaceAPI {
  /**
   * Get the download URL for a model file
   */
  static getModelDownloadUrl(repo: string, filename: string): string {
    // Resolve subdirectory if filename contains /
    const encodedFilename = filename.split('/').map(encodeURIComponent).join('/');
    return `${HF_FILE_BASE}/${repo}/resolve/main/${encodedFilename}`;
  }

  /**
   * Get the URL for split file part
   */
  static getSplitFileUrl(repo: string, filename: string, partIndex: number): string {
    const baseFilename = filename.replace('.gguf', '');
    return `${HF_FILE_BASE}/${repo}/resolve/main/${baseFilename}-${partIndex.toString().padStart(5, '0')}-of-?????.gguf`;
  }

  /**
   * Fetch repository information
   */
  static async fetchRepoInfo(repo: string): Promise<HFRepoInfo | null> {
    try {
      const response = await fetch(`${HF_API_BASE}/models/${repo}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Check if a file exists in the repository
   */
  static async checkFileExists(repo: string, filename: string): Promise<boolean> {
    try {
      const url = this.getModelDownloadUrl(repo, filename);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get file size from HEAD request
   */
  static async getFileSize(repo: string, filename: string): Promise<number | null> {
    try {
      const url = this.getModelDownloadUrl(repo, filename);
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate that a model exists on HuggingFace
   */
  static async validateModel(model: ModelInfo): Promise<{ valid: boolean; error?: string }> {
    const repoInfo = await this.fetchRepoInfo(model.repo);
    if (!repoInfo) {
      return { valid: false, error: `저장소를 찾을 수 없습니다: ${model.repo}` };
    }

    const fileExists = repoInfo.siblings.some((s) => s.rfilename === model.filename);
    if (!fileExists) {
      return { valid: false, error: `파일을 찾을 수 없습니다: ${model.filename}` };
    }

    return { valid: true };
  }
}
