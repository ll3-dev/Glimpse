import { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
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
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-tight text-app-muted">
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <SettingsSection
      title="기본 AI 엔진"
      icon={<Sparkles size={18} color="#787774" />}
      footer="앱 전반(요약, 태그, 대화)에서 기본으로 사용할 AI를 선택합니다."
    >
      <TargetPicker
        title="기본 엔진"
        selectedId={defaultTargetId}
        options={defaultOptions}
        onSelect={(targetId) => {
          if (targetId) {
            onSelectDefaultTarget(targetId);
          }
        }}
      />

      {/* Collapsible Advanced Feature Routing */}
      <TouchableOpacity
        onPress={() => setShowAdvanced((prev) => !prev)}
        className="mt-1 flex-row items-center justify-between py-2 border-t border-app-border/60 active:opacity-70"
      >
        <Text className="text-xs font-medium text-app-muted">
          기능별 세부 라우팅 (고급)
        </Text>
        {showAdvanced ? (
          <ChevronUp size={14} color="#787774" />
        ) : (
          <ChevronDown size={14} color="#787774" />
        )}
      </TouchableOpacity>

      {showAdvanced && (
        <View className="mt-3 pt-2">
          <TargetPicker
            title="메타데이터 요약"
            selectedId={metadataTargetId ?? defaultTargetId}
            inheritsDefault={metadataTargetId === null}
            allowUseDefault
            options={metadataOptions}
            onSelect={(targetId) => onSelectFeatureTarget('metadata', targetId)}
          />

          <TargetPicker
            title="자동 라벨링"
            selectedId={labelingTargetId}
            options={labelingOptions}
            onSelect={(targetId) => {
              if (targetId) {
                onSelectLabelingTarget(targetId);
              }
            }}
          />

          <TargetPicker
            title="채팅 대화"
            selectedId={chatTargetId ?? defaultTargetId}
            inheritsDefault={chatTargetId === null}
            allowUseDefault
            options={chatOptions}
            onSelect={(targetId) => onSelectFeatureTarget('chat', targetId)}
          />

          <Card variant="muted" className="border-0 p-3 mt-2">
            <Text className="text-[11px] leading-4 text-app-muted">
              기본 설정만으로도 앱이 알맞게 동작합니다. 특정 기능만 다른 모델로 처리하고 싶을 때만 위 항목을 변경하세요.
            </Text>
          </Card>
        </View>
      )}
    </SettingsSection>
  );
}
