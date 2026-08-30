import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react-native";
import { Card, ScreenHeader } from "@glimpse/ui/primitives";
import { useSemanticColor } from "@glimpse/ui";
import { LocalModelCatalog } from "@/src/components/settings/LocalModelCatalog";
import { AlternativeRuntimeModels } from "@/src/components/settings/AlternativeRuntimeModels";
import { ALTERNATIVE_RUNTIME_MODELS } from "@/src/components/settings/alternative-runtime-models";
import { RECOMMENDED_MODELS } from "@/src/features/ai/model-manager";
import { useSettingsScreenState } from "@/src/hooks";

const LATEST_MODEL_COUNT = RECOMMENDED_MODELS.filter((model) =>
  model.releasedAt?.startsWith("2026"),
).length;

export default function LocalModelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useSettingsScreenState();
  const appText = useSemanticColor("appText");
  const appMuted = useSemanticColor("appMuted");
  const selectedModel = state.localLLMModels.find(
    (model) => model.id === state.localLLMSelectedModelId,
  );

  const handleToggleLocalLLM = (value: boolean) => {
    const feedback = actions.toggleLocalLLM(value);
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="로컬 AI 모델"
        leftElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
          >
            <ArrowLeft size={20} color={appText} />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
      >
        <Card className="mb-7 p-4">
          <View className="flex-row items-start gap-3">
            <View className="bg-app-bg border border-app-border h-10 w-10 items-center justify-center rounded-xl">
              <Smartphone size={20} color={appMuted} />
            </View>
            <View className="flex-1">
              <Text className="text-app-text text-base font-semibold tracking-tight">
                기기별 모바일 GGUF {RECOMMENDED_MODELS.length}개
              </Text>
              <Text className="text-app-muted mt-1 text-xs leading-5">
                2026년 최신 모델 {LATEST_MODEL_COUNT}개와 1.58-bit Qwen을
                포함했습니다. 별도 엔진이 필요한 후보{" "}
                {ALTERNATIVE_RUNTIME_MODELS.length}개도 아래에서 확인할 수
                있습니다.
              </Text>
            </View>
          </View>

          <View className="border-app-border mt-4 flex-row items-center gap-2 border-t pt-3">
            <ShieldCheck size={15} color={appMuted} />
            <Text className="text-app-muted flex-1 text-xs">
              {selectedModel
                ? `현재 사용: ${selectedModel.name}`
                : "다운로드 후 선택하면 로컬 AI가 자동으로 켜집니다"}
            </Text>
          </View>
          <Text className="text-app-subtle mt-2 text-[11px] leading-4">
            다운로드는 다른 화면으로 이동하거나 화면을 꺼도 기기의 백그라운드
            전송으로 계속됩니다.
          </Text>
        </Card>

        <LocalModelCatalog
          enabled={state.localLLMEnabled}
          models={state.localLLMModels}
          selectedModelId={state.localLLMSelectedModelId}
          onToggle={handleToggleLocalLLM}
          onSelectModel={actions.selectLocalModel}
        />

        <AlternativeRuntimeModels />

        <Text className="text-app-subtle mt-8 text-center text-[10px] leading-4">
          Wi-Fi에서 다운로드하는 것을 권장합니다. 실제 속도와 메모리 사용량은
          기기 상태와 입력 길이에 따라 달라집니다. 큰 모델은 기기 RAM에 따라
          자동으로 제한합니다.
        </Text>
        <View style={{ height: insets.bottom + 48 }} />
      </ScrollView>
    </View>
  );
}
