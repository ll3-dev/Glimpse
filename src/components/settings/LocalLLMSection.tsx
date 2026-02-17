import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Bot, Check } from 'lucide-react-native';
import { Card } from '@/src/ui/primitives';
import type { LocalModel } from '@/src/features/settings';

type LocalLLMSectionProps = {
  enabled: boolean;
  ready: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  onToggle: (value: boolean) => void;
  onSelectModel: (modelId: string) => void;
};

export function LocalLLMSection({
  enabled,
  ready,
  models,
  selectedModelId,
  onToggle,
  onSelectModel,
}: LocalLLMSectionProps) {
  const hasModels = models.length > 0;

  return (
    <View className="mb-8">
      <View className="flex-row items-center mb-3">
        <Bot size={18} color="#787774" />
        <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
          로컬 LLM
        </Text>
      </View>

      <Card className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-4">
            <Text className="text-base font-semibold text-app-text">로컬 모델 사용</Text>
            <Text className="text-xs text-app-muted mt-0.5">
              기기에서 직접 실행되는 AI 모델
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            disabled={!ready && !enabled}
            trackColor={{ false: '#e5e5e5', true: '#2383e2' }}
            thumbColor="#fff"
          />
        </View>

        {hasModels && (
          <View>
            <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
              모델 선택
            </Text>
            {models.map((model) => (
              <TouchableOpacity
                key={model.id}
                className={`flex-row items-center justify-between p-3 rounded-md border mb-2 ${
                  selectedModelId === model.id
                    ? 'bg-app-primary/10 border-app-primary'
                    : 'bg-white border-app-border'
                }`}
                onPress={() => onSelectModel(model.id)}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-app-text">{model.name}</Text>
                  {!model.isReady && (
                    <Text className="text-[10px] text-orange-500 mt-0.5">다운로드 필요</Text>
                  )}
                </View>
                {selectedModelId === model.id && <Check size={16} color="#2383e2" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasModels && (
          <View className="py-4 items-center">
            <Text className="text-xs text-app-muted">사용 가능한 모델이 없습니다</Text>
            <Text className="text-[10px] text-app-subtle mt-1">
              모델 다운로드 기능은 추후 지원 예정
            </Text>
          </View>
        )}
      </Card>

      <Text className="mt-2 text-[10px] text-app-subtle font-medium text-center">
        ⓘ Apple Silicon Mac 또는 iOS 18+에서 사용할 수 있습니다
      </Text>
    </View>
  );
}
