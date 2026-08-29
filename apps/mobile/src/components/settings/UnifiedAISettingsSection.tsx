import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Bot, ChevronDown, ChevronRight, ChevronUp, Cpu, Sparkles } from 'lucide-react-native';
import { Card, Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useAppLocale } from '@/src/localization';
import { SettingsSection } from './SettingsSection';
import { AIModeSelector, type AIMode } from './AIModeSelector';
import { AITargetPicker } from './AITargetPicker';
import { BYOKSectionContainer } from './BYOKSectionContainer';
import { SemanticSearchSection } from './SemanticSearchSection';
import {
  useAppleIntelligenceConfig,
  useLocalLLMEnabled,
  useLocalLLMReady,
  useSelectedLocalModel,
  useBYOKConfig,
  useBYOKReady,
  enableAppleIntelligence,
  disableAppleIntelligence,
  enableLocalLLM,
  disableLocalLLM,
} from '@/src/features/settings';
import type { AIFeature, AITargetDescriptor } from '@/src/features/ai/targets';

type UnifiedAISettingsSectionProps = {
  defaultTargetId: string;
  metadataTargetId: string | null;
  labelingTargetId: string;
  chatTargetId: string | null;
  defaultOptions: AITargetDescriptor[];
  metadataOptions: AITargetDescriptor[];
  labelingOptions: AITargetDescriptor[];
  chatOptions: AITargetDescriptor[];
  onSelectDefaultTarget: (targetId: string) => void;
  onSelectFeatureTarget: (feature: Exclude<AIFeature, 'labeling'>, targetId: string | null) => void;
  onSelectLabelingTarget: (targetId: string) => void;
};

export function UnifiedAISettingsSection({
  defaultTargetId,
  metadataTargetId,
  labelingTargetId,
  chatTargetId,
  defaultOptions,
  metadataOptions,
  labelingOptions,
  chatOptions,
  onSelectDefaultTarget,
  onSelectFeatureTarget,
  onSelectLabelingTarget,
}: UnifiedAISettingsSectionProps) {
  const router = useRouter();
  const { messages } = useAppLocale();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedModeOverride, setSelectedModeOverride] = useState<AIMode | null>(null);

  const appleConfig = useAppleIntelligenceConfig();
  const localLLMEnabled = useLocalLLMEnabled();
  const localLLMReady = useLocalLLMReady();
  const selectedLocalModel = useSelectedLocalModel();
  const byokConfig = useBYOKConfig((config) => config);
  const byokReady = useBYOKReady();

  const appMuted = useSemanticColor('appMuted');
  const appPrimary = useSemanticColor('appPrimary');

  // Derive active high-level mode
  const derivedMode: AIMode = byokConfig.enabled && byokReady
    ? 'cloud'
    : localLLMEnabled || (appleConfig.enabled && appleConfig.isAvailable)
      ? 'on-device'
      : 'auto';

  const activeMode = selectedModeOverride ?? derivedMode;

  const handleSelectMode = (mode: AIMode) => {
    setSelectedModeOverride(mode);
    if (mode === 'auto') {
      if (appleConfig.isAvailable) {
        enableAppleIntelligence();
      }
      disableLocalLLM();
    } else if (mode === 'on-device') {
      if (appleConfig.isAvailable) {
        enableAppleIntelligence();
      }
      if (selectedLocalModel?.isReady) {
        enableLocalLLM();
      }
    }
  };

  return (
    <SettingsSection
      title={messages.settings.sectionAi}
      icon={<Sparkles size={18} color={appPrimary} />}
      footer={messages.settings.secureStorageNote}
    >
      {/* 3 High-Level Mode Cards */}
      <AIModeSelector selectedMode={activeMode} onSelectMode={handleSelectMode} />

      {/* Sub-configuration based on active mode */}
      {activeMode === 'on-device' && (
        <View className="mb-4 pt-2 border-t border-app-border/60 gap-2.5">
          {appleConfig.isAvailable && (
            <View className="flex-row items-center justify-between p-3 rounded-lg bg-app-bg/50">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-1.5">
                  <Cpu size={16} color={appPrimary} />
                  <Text className="text-sm font-semibold text-app-text">Apple Intelligence</Text>
                </View>
                <Text className="text-xs text-app-muted mt-0.5">
                  iOS 시스템 Foundation Model 사용
                </Text>
              </View>
              <Switch
                accessibilityLabel="Apple Intelligence 사용"
                checked={appleConfig.enabled}
                onCheckedChange={(val) => {
                  if (val) enableAppleIntelligence();
                  else disableAppleIntelligence();
                }}
              />
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.settings.manageLocalModels}
            onPress={() => router.push('/local-models')}
            className="flex-row items-center justify-between p-3 rounded-lg bg-app-bg/50 active:opacity-70"
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5">
                <Bot size={16} color={appPrimary} />
                <Text className="text-sm font-semibold text-app-text">
                  {selectedLocalModel ? selectedLocalModel.name : messages.settings.manageLocalModels}
                </Text>
              </View>
              <Text className="text-xs text-app-muted mt-0.5">
                {selectedLocalModel
                  ? localLLMReady ? '기기 내에서 오프라인으로 실행 가능' : '다운로드 확인 필요'
                  : '오프라인 전용 AI 모델 다운로드 및 관리'}
              </Text>
            </View>
            <ChevronRight size={18} color={appMuted} />
          </Pressable>
        </View>
      )}

      {activeMode === 'cloud' && (
        <View className="mb-4 pt-2 border-t border-app-border/60">
          <BYOKSectionContainer />
        </View>
      )}

      {/* Semantic Search Subsection */}
      <View className="pt-3 border-t border-app-border/60">
        <SemanticSearchSection embedded />
      </View>

      {/* Collapsible Advanced Feature Routing */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.settings.advancedAiTitle}
        accessibilityState={{ expanded: showAdvanced }}
        onPress={() => setShowAdvanced((prev) => !prev)}
        className="mt-3 min-h-11 flex-row items-center justify-between py-2 border-t border-app-border/60 active:opacity-70"
      >
        <Text className="text-xs font-semibold text-app-muted">
          {messages.settings.advancedAiTitle}
        </Text>
        {showAdvanced ? (
          <ChevronUp size={14} color={appMuted} />
        ) : (
          <ChevronDown size={14} color={appMuted} />
        )}
      </Pressable>

      {showAdvanced && (
        <View className="mt-3 pt-2">
          <AITargetPicker
            title="기본 엔진 (Default Engine)"
            selectedId={defaultTargetId}
            options={defaultOptions}
            onSelect={(targetId) => {
              if (targetId) onSelectDefaultTarget(targetId);
            }}
          />

          <AITargetPicker
            title="메타데이터 요약"
            selectedId={metadataTargetId ?? defaultTargetId}
            inheritsDefault={metadataTargetId === null}
            allowUseDefault
            options={metadataOptions}
            onSelect={(targetId) => onSelectFeatureTarget('metadata', targetId)}
          />

          <AITargetPicker
            title="자동 라벨링"
            selectedId={labelingTargetId}
            options={labelingOptions}
            onSelect={(targetId) => {
              if (targetId) {
                onSelectLabelingTarget(targetId);
              }
            }}
          />

          <AITargetPicker
            title="채팅 대화"
            selectedId={chatTargetId ?? defaultTargetId}
            inheritsDefault={chatTargetId === null}
            allowUseDefault
            options={chatOptions}
            onSelect={(targetId) => onSelectFeatureTarget('chat', targetId)}
          />

          <Card variant="muted" className="border-0 p-3 mt-2">
            <Text className="text-[11px] leading-4 text-app-muted">
              {messages.settings.advancedAiNote}
            </Text>
          </Card>
        </View>
      )}
    </SettingsSection>
  );
}
