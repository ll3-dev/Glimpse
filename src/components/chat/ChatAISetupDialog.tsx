import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { LocalModel } from '@/src/features/settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/ui/primitives';

type ChatAISetupDialogProps = {
  open: boolean;
  isCheckingOptions: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  isDownloading?: boolean;
  downloadProgress?: number | null;
  onSelectModel: (modelId: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onBack: () => void;
};

export function ChatAISetupDialog({
  open,
  isCheckingOptions,
  models,
  selectedModelId,
  isDownloading = false,
  downloadProgress = null,
  onSelectModel,
  onOpenSettings,
  onBack,
}: ChatAISetupDialogProps) {
  const readyModels = models.filter((model) => model.isReady);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>AI 준비가 필요합니다</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>
              현재 채팅은 로컬 LLM으로 동작합니다. 이전에 쓰던 모델이 있으면 바로 활성화하고,
              아니면 아래에서 선택할 수 있습니다.
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isCheckingOptions ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#37352f" />
            <Text className="mt-3 text-sm text-gray-600">사용 가능한 모델을 확인하는 중...</Text>
          </View>
        ) : readyModels.length > 0 ? (
          <View className="gap-2">
            {readyModels.map((model) => {
              const isSelected = model.id === selectedModelId;

              return (
                <TouchableOpacity
                  key={model.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    isSelected ? 'border-black bg-black' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => onSelectModel(model.id)}
                >
                  <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {model.name}
                  </Text>
                  <Text className={`mt-1 text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                    {isSelected ? '현재 선택된 모델' : '이 모델로 채팅 시작'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : isDownloading ? (
          <View className="rounded-2xl bg-gray-50 px-4 py-3">
            <Text className="text-sm text-gray-700">
              모델 다운로드가 진행 중입니다.
              {typeof downloadProgress === 'number' ? ` ${downloadProgress}%` : ''} 앱은 계속 사용할 수 있고,
              완료되면 바로 채팅에 사용할 수 있습니다.
            </Text>
          </View>
        ) : (
          <View className="rounded-2xl bg-gray-50 px-4 py-3">
            <Text className="text-sm text-gray-700">
              사용할 수 있는 로컬 모델이 없습니다. 설정에서 모델을 다운로드한 뒤 다시 선택하세요.
            </Text>
          </View>
        )}

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onPress={onBack}>
            <Text>뒤로가기</Text>
          </AlertDialogCancel>
          <AlertDialogAction onPress={onOpenSettings}>
            <Text>설정 열기</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
