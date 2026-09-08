import { View, Text, Pressable } from 'react-native';
import { CalendarDays, RefreshCw } from 'lucide-react-native';
import type { TodaySummary } from '@glimpse/features';
import { Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { getTypeConfig } from '@/src/components/library/knowledge-type-config';

type TodaySummaryCardProps = {
  summary: TodaySummary;
  onPressEntry?: (itemId: string) => void;
  /** 오늘 요약 AI 내러티브 — null이면 증강 문단을 표시하지 않는다. */
  narrative?: string | null;
  isGeneratingNarrative?: boolean;
  onRegenerateNarrative?: () => void;
};

/**
 * 다이제스트 상단의 "오늘" 카드 — 오늘 저장한 기록과 새로 발견된 연결을
 * 모아 하루 회고의 재방문 앵커로 쓴다. AI 내러티브는 규칙 기반 카드 위의
 * 증강 계층이다(2026-09-08 digest-ai-narrative).
 */
export function TodaySummaryCard({
  summary,
  onPressEntry,
  narrative,
  isGeneratingNarrative,
  onRegenerateNarrative,
}: TodaySummaryCardProps) {
  const appMuted = useSemanticColor('appMuted');
  const appAccent = useSemanticColor('appAccent');
  const isEmpty = summary.captureCount === 0 && summary.newConnectionCount === 0;

  return (
    <Card className="mb-5 rounded-2xl border border-app-border bg-app-surface p-4 shadow-xs">
      <View className="mb-3 flex-row items-center gap-2">
        <CalendarDays size={15} color={appMuted} />
        <Text className="text-sm font-semibold text-app-text">오늘</Text>
        {!isEmpty && (
          <Text className="ml-auto text-xs font-medium text-app-muted">
            기록 {summary.captureCount} · 새 연결 {summary.newConnectionCount}
          </Text>
        )}
      </View>

      {isEmpty ? (
        <Text className="text-sm leading-5 text-app-muted">
          아직 오늘 남긴 기록이 없어요. 공유 시트, 카메라, 퀵 노트로 몇 초 만에
          남겨볼 수 있어요.
        </Text>
      ) : (
        <View className="gap-2.5">
          {(narrative || isGeneratingNarrative) && (
            <View className="rounded-lg bg-app-bg/50 p-3">
              {isGeneratingNarrative && !narrative ? (
                <Text className="text-sm text-app-muted">오늘의 회고를 쓰는 중…</Text>
              ) : (
                <View className="gap-2">
                  <Text className="text-sm leading-5 text-app-text">{narrative}</Text>
                  <Pressable
                    onPress={onRegenerateNarrative}
                    disabled={isGeneratingNarrative}
                    accessibilityRole="button"
                    accessibilityLabel="오늘 회고 다시 쓰기"
                    className="flex-row items-center gap-1 active:opacity-60"
                  >
                    <RefreshCw size={12} color={appAccent} />
                    <Text className="text-xs font-medium text-app-accent">
                      {isGeneratingNarrative ? '다시 쓰는 중…' : '다시 쓰기'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          {summary.captures.map((entry) => {
            const { Icon } = getTypeConfig(entry.type);
            const label = entry.title?.trim() || entry.preview || '제목 없음';
            return (
              <Pressable
                key={entry.id}
                onPress={() => onPressEntry?.(entry.id)}
                className="flex-row items-center gap-2.5 active:opacity-60"
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <Icon size={14} color={appMuted} />
                <Text className="flex-1 text-sm text-app-text" numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
          {summary.captureCount > summary.captures.length && (
            <Text className="text-xs text-app-muted">
              외 {summary.captureCount - summary.captures.length}개 기록 · 새 연결{' '}
              {summary.newConnectionCount}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}
