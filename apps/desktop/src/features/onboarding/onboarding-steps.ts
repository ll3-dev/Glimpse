import type { DesktopSettings } from '@/lib/settings-storage';
import type { DesktopLLMOverview } from '@/features/local-llm/desktop-llm-service';

/**
 * 첫 실행 온보딩 판정 순수 로직. "앱을 열면 모델부터 받아야 AI가 동작한다"
 * 구조가 된 완전 로컬 전환 이후, 첫 가치(모델·캡처)가 설정 화면에만 묶이지
 * 않게 랜딩 화면에서 무엇이 남았는지 알려준다.
 */

export interface OnboardingStep {
  id: 'model' | 'capture';
  title: string;
  /** done 상태와 미완 상태에서 각각 보여줄 문구 */
  description: string;
  done: boolean;
  actionLabel: string;
}

export interface OnboardingInput {
  settings: DesktopSettings;
  modelOverview: DesktopLLMOverview | undefined;
  itemCount: number | undefined;
}

/** 프로바이더별 "AI가 지금 쓸 수 있다" 판정 — 챗·라벨링·요약의 전제다. */
export function isModelReady(
  settings: DesktopSettings,
  overview: DesktopLLMOverview | undefined,
): boolean {
  if (settings.aiProvider === 'rules') return true;
  if (settings.aiProvider === 'local-server') {
    return settings.localServer.baseUrl.trim().length > 0;
  }
  return (overview?.models ?? []).some(
    (model) => model.status === 'ready' || model.status === 'active',
  );
}

export function buildOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  const modelDone = isModelReady(input.settings, input.modelOverview);
  const captureDone = (input.itemCount ?? 0) > 0;

  return [
    {
      id: 'model',
      title: 'AI 모델 준비',
      description: modelDone
        ? '사용할 모델이 준비되어 있습니다.'
        : '설정에서 모델을 받거나 LM Studio·Ollama 같은 로컬 서버를 연결하면 챗·자동 라벨링·요약이 동작합니다.',
      done: modelDone,
      actionLabel: '모델 관리',
    },
    {
      id: 'capture',
      title: '첫 지식 캡처',
      description: captureDone
        ? '보관함에 지식이 있습니다. ⌘N으로 언제든 추가하세요.'
        : '⌘N 단축키나 캡처 화면으로 첫 노트를 저장해 보세요.',
      done: captureDone,
      actionLabel: '캡처하기',
    },
  ];
}

export function onboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.every((step) => step.done);
}
