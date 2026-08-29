import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Check, Download, Sparkles, Trash2 } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import {
  providerSupportsEmbedding,
} from '@/src/features/search/byok-embedding-client';
import { useBYOKConfig, useBYOKCredentialsConfigured } from '@/src/features/settings/byok.selectors';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';
import {
  useOnDeviceEmbedding,
} from '@/src/features/search/on-device-embedding-model';

/**
 * Semantic search opt-in section.
 *
 * 기본 OFF. ON이면 (1) BYOK embedding API 또는 (2) 온디바이스 nomic 모델로
 * 재정렬한다. 프라이버시 문구는 접히지 않는 본문에 항상 노출된다.
 */

export function SemanticSearchSection() {
  const [enabled, setEnabled] = useSemanticRerankEnabled();
  const provider = useBYOKConfig((config) => config.provider);
  const credentialsConfigured = useBYOKCredentialsConfigured();
  const appMuted = useSemanticColor('appMuted');
  const appAccent = useSemanticColor('appAccent');
  const tagRoseText = useSemanticColor('tagRoseText');
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

  const byokEligible =
    credentialsConfigured && providerSupportsEmbedding(provider);
  const disabledReason = byokEligible
    ? undefined
    : !credentialsConfigured
      ? 'BYOK API 키 또는 기기 내 임베딩 모델을 준비해주세요.'
      : '현재 Provider는 embedding을 지원하지 않습니다. OpenAI 계열 키를 사용하거나 기기 내 모델을 다운로드해주세요.';
  const modeLabel = modelPath
    ? byokEligible
      ? 'BYOK 우선 · 대기: 기기 내 처리'
      : '기기 내 처리 · 외부 전송 없음'
    : undefined;

  return (
    <SettingsSection
      title="의미 검색"
      icon={<Sparkles size={18} color={appMuted} />}
      footer={enabled && disabledReason ? disabledReason : undefined}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-app-text">의미 재정렬</Text>
          <Text className="text-xs text-app-muted mt-0.5">
            검색 결과를 의미 유사도로 다시 정렬합니다
          </Text>
        </View>
        <Switch
          accessibilityLabel="의미 재정렬 사용"
          checked={enabled}
          onCheckedChange={(value) => setEnabled(value)}
        />
      </View>

      {/* 온디바이스 임베딩 모델 — BYOK 없이 기기 내 처리를 위한 최소 진입점 */}
      {modelInfo && (
        <View className="border-app-border bg-app-card mt-3 rounded-xl border p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-app-text text-sm font-semibold">
                기기 내 임베딩 모델
              </Text>
              <Text className="text-app-muted mt-0.5 text-xs">
                {modelInfo.name}
                {modelInfo.displaySize ? ` · ${modelInfo.displaySize}` : ''}
                {modeLabel ? `\n${modeLabel}` : ''}
              </Text>
            </View>
            {downloading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={appAccent} />
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
                <Trash2 size={18} color={tagRoseText} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="기기 내 임베딩 모델 다운로드"
                onPress={() => void download()}
                className="p-2"
              >
                <Download size={18} color={appAccent} />
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
              <Check size={12} color={appAccent} />
              <Text className="text-app-muted text-[11px]">
                준비됨 — BYOK이 없으면 이 모델로 재정렬합니다
              </Text>
            </View>
          )}
          {downloadError && (
            <Text className="text-tag-rose-text mt-2 text-[11px]">
              {downloadError}
            </Text>
          )}
        </View>
      )}

      {/* 프라이버시 문구 — 옵트인 상태와 무관하게 항상 노출 */}
      <View className="mt-3">
        <Text className="text-xs text-app-muted leading-5">
          {modelPath
            ? '온디바이스 모드에서는 모든 임베딩이 기기 내부에서 처리되며 외부로 전송되지 않습니다. '
            : ''}
          BYOK 임베딩을 켜면 검색어와 검색 중인 항목의 내용(제목·요약·본문 일부)이
          설정한 외부 임베딩 API(OpenAI 호환)로 전송됩니다. 기본값은 꺼짐입니다.
        </Text>
      </View>
    </SettingsSection>
  );
}
