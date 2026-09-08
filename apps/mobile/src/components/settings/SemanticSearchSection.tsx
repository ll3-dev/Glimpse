import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Check, Download, Sparkles, Trash2 } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';
import {
  useOnDeviceEmbedding,
} from '@/src/features/search/on-device-embedding-model';

/**
 * Semantic search opt-in section.
 *
 * 기본 OFF. ON + 기기 내 nomic 모델 다운로드 완료 시 온디바이스로만
 * 재정렬한다 — 외부 전송 경로는 없다(2026-09-08 완전 로컬 전환).
 */

type SemanticSearchSectionProps = {
  embedded?: boolean;
};

export function SemanticSearchSection({ embedded = false }: SemanticSearchSectionProps) {
  const [enabled, setEnabled] = useSemanticRerankEnabled();
  const appMuted = useSemanticColor('appMuted');
  const appText = useSemanticColor('appText');
  const appAccent = useSemanticColor('appAccent');
  const {
    modelInfo,
    modelPath,
    downloading,
    progressPercentage,
    error: downloadError,
    refresh,
    download,
    remove,
  } = useOnDeviceEmbedding();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const content = (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-sm font-semibold text-app-text">스마트 의미 검색</Text>
          <Text className="text-xs text-app-muted mt-0.5">
            단어가 달라도 문맥과 의미 유사도로 검색합니다
          </Text>
        </View>
        <Switch
          accessibilityLabel="의미 재정렬 사용"
          checked={enabled}
          onCheckedChange={(value) => setEnabled(value)}
        />
      </View>

      {/* 온디바이스 임베딩 모델 — 기기 내 처리를 위한 유일한 임베딩 경로 */}
      {modelInfo && (
        <View className="bg-app-bg/50 mt-2.5 rounded-lg p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-app-text text-sm font-semibold">
                기기 내 임베딩 모델
              </Text>
              <Text className="text-app-muted mt-0.5 text-xs">
                {modelInfo.name}
                {modelInfo.displaySize ? ` · ${modelInfo.displaySize}` : ''}
              </Text>
            </View>
            {downloading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={appText} />
                <Text className="text-app-muted text-xs">
                  {progressPercentage != null ? `${progressPercentage}%` : ''}
                </Text>
              </View>
            ) : modelPath ? (
              <Pressable
                accessibilityLabel="기기 내 임베딩 모델 삭제"
                onPress={() => void remove()}
                className="p-2"
              >
                <Trash2 size={18} color={appAccent} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="기기 내 임베딩 모델 다운로드"
                onPress={() => void download()}
                className="p-2"
              >
                <Download size={18} color={appText} />
              </Pressable>
            )}
          </View>
          {!downloading && !modelPath && (
            <Text className="text-app-muted mt-2 text-[11px]">
              다운로드하면 검색어와 항목 내용이 외부로 전송되지 않고 기기에서만
              처리됩니다.
            </Text>
          )}
          {modelPath && (
            <View className="flex-row items-center gap-1 mt-2">
              <Check size={12} color={appText} />
              <Text className="text-app-muted text-[11px]">
                준비됨 — 이 모델로 기기 내부에서 재정렬합니다
              </Text>
            </View>
          )}
          {downloadError && (
            <Text className="text-app-accent mt-2 text-[11px]">
              {downloadError}
            </Text>
          )}
        </View>
      )}

      {/* 프라이버시 문구 — 옵트인 상태와 무관하게 항상 노출 */}
      <View className="mt-3">
        <Text className="text-[11px] text-app-muted leading-4">
          모든 임베딩은 기기 내부에서만 처리되며 외부로 전송되지 않습니다.
        </Text>
      </View>
    </View>
  );

  if (embedded) {
    return content;
  }

  return (
    <SettingsSection
      title="의미 검색"
      icon={<Sparkles size={18} color={appMuted} />}
      footer={enabled && !modelPath ? '기기 내 임베딩 모델을 다운로드해주세요.' : undefined}
    >
      {content}
    </SettingsSection>
  );
}
