import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import {
  providerSupportsEmbedding,
} from '@/src/features/search/byok-embedding-client';
import { useBYOKConfig, useBYOKCredentialsConfigured } from '@/src/features/settings/byok.selectors';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';

/**
 * Semantic search opt-in section.
 *
 * 기본 OFF. ON이면 검색어와 검색 결과 항목의 내용(제목·요약·본문 발췌)이
 * 사용자가 설정한 BYOK embedding API로 전송된다 — 프라이버시 문구는
 * 접히지 않는 본문에 항상 노출된다.
 */

export function SemanticSearchSection() {
  const [enabled, setEnabled] = useSemanticRerankEnabled();
  const provider = useBYOKConfig((config) => config.provider);
  const credentialsConfigured = useBYOKCredentialsConfigured();
  const appMuted = useSemanticColor('appMuted');

  const eligible =
    credentialsConfigured && providerSupportsEmbedding(provider);
  const disabledReason = !credentialsConfigured
    ? '먼저 BYOK에서 API 키를 저장해주세요.'
    : '현재 Provider는 embedding을 지원하지 않습니다. OpenAI 계열 키를 사용해주세요.';

  return (
    <SettingsSection
      title="의미 검색"
      icon={<Sparkles size={18} color={appMuted} />}
      footer={enabled && !eligible ? disabledReason : undefined}
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

      {/* 프라이버시 문구 — 옵트인 상태와 무관하게 항상 노출 */}
      <View className="mt-3">
        <Text className="text-xs text-app-muted leading-5">
          이 기능을 켜면 검색어와 검색 중인 항목의 내용(제목·요약·본문 일부)이
          설정한 외부 임베딩 API(OpenAI 호환)로 전송됩니다. 기본값은 꺼짐입니다.
        </Text>
        {!eligible && (
          <Text className="text-xs text-app-muted mt-2">{disabledReason}</Text>
        )}
      </View>
    </SettingsSection>
  );
}
