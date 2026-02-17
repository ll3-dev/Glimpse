/**
 * AI Metadata Provider Contract Types
 *
 * Shared types for provider/ router/usecase communication.
 * All providers (Apple, Local, BYOK) implement MetadataProvider interface.
 */

import type { Result } from '@/src/lib/effect-result';

/**
 * AI 메타데이터 생성 결과
 */
export interface MetadataOutput {
  summary: string;
  tags: string[];
}

/**
 * 메타데이터 생성 입력
 */
export interface MetadataInput {
  /** 원본 콘텐츠 (note body, link description, etc.) */
  content: string;
  /** 선택적 제목 (링크 타이틀 등) */
  title?: string;
  /** 콘텐츠 타입 (note, link, highlight, etc.) */
  type?: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
}

/**
 * AI Provider 에러 코드
 */
export type AIProviderErrorCode =
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_INVALID_RESPONSE'
  | 'AI_PROVIDER_NETWORK_ERROR'
  | 'AI_PROVIDER_INTERNAL_ERROR';

/**
 * AI Provider 에러
 */
export interface AIProviderError {
  readonly _tag: 'AI_PROVIDER_ERROR';
  readonly code: AIProviderErrorCode;
  readonly provider: string; // 'apple' | 'local' | 'byok' | 'stub'
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * AI Provider 공통 인터페이스
 *
 * 모든 provider (Apple, Local, BYOK, Stub)가 구현해야 하는 계약
 */
export interface MetadataProvider {
  /** Provider 식별자 */
  readonly name: string;

  /**
   * 현재 환경에서 provider 사용 가능 여부 확인
   * - Apple: iOS 버전 + 토글 ON 확인
   * - Local: 모델 다운로드 완료 확인
   * - BYOK: API key 설정 확인
   */
  isAvailable(): Promise<boolean>;

  /**
   * 메타데이터 생성
   * @param input - 생성할 콘텐츠 정보
   * @returns 생성 결과 또는 에러
   */
  generate(input: MetadataInput): Promise<Result<MetadataOutput>>;
}

/**
 * 메타데이터 서비스 인터페이스
 *
 * saveKnowledgeItem이 의존하는 단일 인터페이스
 */
export interface AiMetadataService {
  /**
   * 라우팅 정책에 따라 적절한 provider 선택 후 메타데이터 생성
   * 실패 시 자동 폴백 (Apple -> Local -> BYOK -> Stub)
   */
  generate(input: MetadataInput): Promise<Result<MetadataOutput>>;
}

// ============================================================================
// 에러 생성 헬퍼 함수
// ============================================================================

export function aiProviderError(
  code: AIProviderErrorCode,
  provider: string,
  message: string,
  cause?: unknown
): AIProviderError {
  return {
    _tag: 'AI_PROVIDER_ERROR',
    code,
    provider,
    message,
    cause,
  };
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybe = error as Partial<AIProviderError>;
  return maybe._tag === 'AI_PROVIDER_ERROR';
}
