import { useCallback } from 'react';
import { Alert, ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Bot, ChevronRight, Loader } from 'lucide-react-native';
import { Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import {
  canToggleLocalLLM,
  getLocalLLMToggleDisabledReason,
} from '@/src/features/settings';
import {
  useLocalLLMStoreConfig,
  type LocalModel,
} from '@/src/stores/settings/local-llm.store';

type LocalLLMSectionProps = {
  enabled: boolean;
  ready: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  onToggle: (value: boolean) => void;
  onManageModels: () => void;
};

export function LocalLLMSection({
  enabled,
  ready,
  models,
  selectedModelId,
  onToggle,
  onManageModels,
}: LocalLLMSectionProps) {
  const isLoading = useLocalLLMStoreConfig((config) => config.isLoading);
  const loadProgress = useLocalLLMStoreConfig((config) => config.loadProgress);
  const loadError = useLocalLLMStoreConfig((config) => config.loadError);
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const selectedModel = models.find((model) => model.id === selectedModelId);
  const canToggle = canToggleLocalLLM(enabled, selectedModelId, models);
  const disabledReason = getLocalLLMToggleDisabledReason(
    enabled,
    selectedModelId,
    models,
  );

  const handleTogglePress = useCallback(() => {
    if (!canToggle) {
      Alert.alert(
        '먼저 모델을 선택해 주세요',
        disabledReason || '모델 관리 화면에서 모델을 다운로드할 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '모델 보기', onPress: onManageModels },
        ],
      );
      return;
    }

    if (isLoading) {
      Alert.alert('모델 로딩 중', '모델 로딩이 끝난 뒤 다시 시도해 주세요.');
      return;
    }

    onToggle(!enabled);
  }, [canToggle, disabledReason, enabled, isLoading, onManageModels, onToggle]);

  return (
    <SettingsSection
      title="로컬 AI"
      icon={<Bot size={18} color={appMuted} />}
      footer="모델과 대화 내용은 이 기기 안에서 처리됩니다"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-app-text">로컬 모델 사용</Text>
            {isLoading && <Loader size={14} color={appMuted} />}
          </View>
          <Text className="mt-0.5 text-xs text-app-muted">
            인터넷 없이 기기에서 직접 실행
          </Text>
        </View>
        <Switch
          accessibilityLabel="로컬 모델 사용"
          accessibilityHint={disabledReason || undefined}
          checked={enabled}
          onCheckedChange={handleTogglePress}
          disabled={isLoading}
        />
      </View>

      {isLoading && (
        <View className="mt-4 flex-row items-center gap-2 rounded-lg border border-app-border bg-app-bg p-3">
          <ActivityIndicator size="small" color={appText} />
          <Text className="text-sm font-medium text-app-text">
            모델 준비 중 {loadProgress?.percentage ?? 0}%
          </Text>
        </View>
      )}

      {loadError && (
        <Text className="mt-3 rounded-lg bg-app-bg border border-app-border p-3 text-xs text-app-accent">
          {loadError}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedModel?.name ?? '모델 선택 및 다운로드'}
        accessibilityHint="로컬 모델 관리 화면을 엽니다"
        onPress={onManageModels}
        className="mt-4 min-h-11 flex-row items-center border-t border-app-border pt-4 active:opacity-70"
      >
        <View className="flex-1">
          <Text className="text-sm font-semibold text-app-text">
            {selectedModel?.name ?? '모델 선택 및 다운로드'}
          </Text>
          <Text className="mt-0.5 text-xs text-app-muted">
            {selectedModel
              ? ready
                ? '현재 선택된 모델'
                : '파일을 다시 확인해 주세요'
              : '휴대폰 성능에 맞는 모델을 골라보세요'}
          </Text>
        </View>
        <ChevronRight size={18} color={appMuted} />
      </Pressable>
    </SettingsSection>
  );
}
