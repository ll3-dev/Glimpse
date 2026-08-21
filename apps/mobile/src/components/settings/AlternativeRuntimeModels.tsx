import { Badge, Text as BadgeText } from "@glimpse/ui/primitives";
import { Cpu, ExternalLink } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";
import { ALTERNATIVE_RUNTIME_MODELS } from "./alternative-runtime-models";
import { useSemanticColor } from "@glimpse/ui";

export function AlternativeRuntimeModels() {
  const lavenderText = useSemanticColor("tagLavenderText");
  const appText = useSemanticColor("appText");

  return (
    <View className="mt-10">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="bg-tag-lavender-bg h-9 w-9 items-center justify-center rounded-xl">
          <Cpu size={18} color={lavenderText} />
        </View>
        <View className="flex-1">
          <Text className="text-app-text text-sm font-bold tracking-tight">
            별도 런타임 후보 {ALTERNATIVE_RUNTIME_MODELS.length}개
          </Text>
          <Text className="text-app-muted mt-0.5 text-xs leading-5">
            모바일 모델은 존재하지만 현재 Glimpse 엔진에서 바로 실행할 수 없는
            후보입니다.
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {ALTERNATIVE_RUNTIME_MODELS.map((model) => (
          <View
            key={model.id}
            className="border-app-border bg-app-card rounded-xl border p-4"
          >
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Badge variant="lavender">
                <BadgeText>{model.runtime}</BadgeText>
              </Badge>
              <Badge variant="neutral">
                <BadgeText>직접 선택 불가</BadgeText>
              </Badge>
            </View>
            <Text className="text-app-text mt-2 text-sm font-semibold">
              {model.name}
            </Text>
            <Text className="text-app-subtle mt-1 text-[11px]">
              {model.artifact}
            </Text>
            <Text className="text-app-muted mt-1 text-xs leading-5">
              {model.note}
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${model.name} 모델 정보`}
              onPress={() => void Linking.openURL(model.url)}
              className="border-app-border bg-app-surface mt-3 min-h-11 flex-row items-center gap-1.5 self-start rounded-lg border px-3 py-2 active:opacity-80"
            >
              <ExternalLink size={13} color={appText} />
              <Text className="text-app-text text-xs font-semibold">
                모델 정보
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
