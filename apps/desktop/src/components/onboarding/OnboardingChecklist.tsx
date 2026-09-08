import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useKnowledgeItemsQuery } from '@glimpse/hooks';
import { Check, ChevronRight, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadSettings } from '@/lib/settings-storage';
import { useDesktopLLMOverview } from '@/features/local-llm/use-desktop-llm-overview';
import {
  buildOnboardingSteps,
  onboardingComplete,
} from '@/features/onboarding/onboarding-steps';

const ONBOARDING_DISMISSED_KEY = 'glimpse_onboarding_dismissed_v1';

/**
 * 랜딩(보관함) 상단의 첫 실행 체크리스트. 남은 첫 가치(AI 모델·첫 캡처)를
 * 알려주고 완료되면 스스로 사라진다. 닫기는 한 번만 확인한다(다시 열지 않음).
 */
export function OnboardingChecklist() {
  const navigate = useNavigate();
  // localStorage 플래그를 렌더 초기화에서 읽는다(loadSettings와 같은 패턴 —
  // 이 앱은 클라이언트 전용이라 안전하다).
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1';
    } catch {
      // localStorage 부재 — 다시 보지 않기 없이 동작한다.
      return false;
    }
  });
  const { data: overview } = useDesktopLLMOverview();
  const { data: items, isLoading } = useKnowledgeItemsQuery();

  const settings = useMemo(() => loadSettings(), []);
  const steps = useMemo(
    () =>
      buildOnboardingSteps({
        settings,
        modelOverview: overview,
        itemCount: items?.length,
      }),
    [settings, overview, items],
  );

  if (dismissed || isLoading || onboardingComplete(steps)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1');
    } catch {
      // 저장 실패 — 이 세션만 닫힌다.
    }
    setDismissed(true);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">시작하기</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            모든 처리는 기기 안에서 일어납니다. 두 가지만 하면 준비 끝입니다.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="시작하기 닫기"
          onClick={dismiss}
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3">
            {step.done ? (
              <Check className="h-4 w-4 shrink-0 text-app-primary" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  step.done
                    ? 'text-sm text-muted-foreground line-through decoration-border'
                    : 'text-sm font-medium text-card-foreground'
                }
              >
                {step.title}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
            {!step.done && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  navigate({ to: step.id === 'model' ? '/settings' : '/capture' })
                }
              >
                {step.actionLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
