import { View, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Card, Text } from '@glimpse/ui/primitives';
import { SettingsSection } from './SettingsSection';
import type { AIFeature, AITargetDescriptor } from '@/src/features/ai/targets';

type TargetPickerProps = {
  title: string;
  selectedId: string;
  inheritsDefault?: boolean;
  allowUseDefault?: boolean;
  options: AITargetDescriptor[];
  onSelect: (targetId: string | null) => void;
};

function TargetPicker({
  title,
  selectedId,
  inheritsDefault = false,
  allowUseDefault = false,
  options,
  onSelect,
}: TargetPickerProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-tight text-app-muted">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {allowUseDefault ? (
          <TouchableOpacity
            className={`rounded-md border px-3 py-1.5 active:opacity-80 ${
              inheritsDefault ? 'border-app-text bg-app-text' : 'border-app-border bg-app-surface'
            }`}
            onPress={() => onSelect(null)}
          >
            <Text className={`text-xs font-semibold ${inheritsDefault ? 'text-white' : 'text-app-text'}`}>
              기본값 사용
            </Text>
          </TouchableOpacity>
        ) : null}
        {options.map((option) => {
          const selected = !inheritsDefault && selectedId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              className={`rounded-md border px-3 py-1.5 active:opacity-80 ${
                selected ? 'border-app-text bg-app-text' : 'border-app-border bg-app-surface'
              }`}
              onPress={() => onSelect(option.id)}
            >
              <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-app-text'}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type AITargetSettingsSectionProps = {
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

export function AITargetSettingsSection({
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
}: AITargetSettingsSectionProps) {
  return (
    <SettingsSection
      title="AI 대상 사용 방식"
      icon={<Sparkles size={18} color="#787774" />}
      footer="기능별로 사용할 AI target을 고를 수 있습니다."
    >
      <TargetPicker
        title="앱 기본값"
        selectedId={defaultTargetId}
        options={defaultOptions}
        onSelect={(targetId) => {
          if (targetId) {
            onSelectDefaultTarget(targetId);
          }
        }}
      />

      <TargetPicker
        title="메타데이터"
        selectedId={metadataTargetId ?? defaultTargetId}
        inheritsDefault={metadataTargetId === null}
        allowUseDefault
        options={metadataOptions}
        onSelect={(targetId) => onSelectFeatureTarget('metadata', targetId)}
      />

      <TargetPicker
        title="라벨링"
        selectedId={labelingTargetId}
        options={labelingOptions}
        onSelect={(targetId) => {
          if (targetId) {
            onSelectLabelingTarget(targetId);
          }
        }}
      />

      <TargetPicker
        title="채팅"
        selectedId={chatTargetId ?? defaultTargetId}
        inheritsDefault={chatTargetId === null}
        allowUseDefault
        options={chatOptions}
        onSelect={(targetId) => onSelectFeatureTarget('chat', targetId)}
      />

      <Card variant="muted" className="border-0 p-3">
        <Text className="text-xs leading-5 text-app-muted">
          Apple/Local/BYOK 섹션은 target 후보를 준비하는 관리 영역입니다. 위 설정은 그 후보들 중 어떤 대상을 실제 기능에서 쓸지 정합니다.
        </Text>
      </Card>
    </SettingsSection>
  );
}
