import { Badge, Text as BadgeText } from "@glimpse/ui/primitives";
import type { MobileModelTier } from "@glimpse/shared";
import { View } from "react-native";
import type { ModelInfo } from "@/src/features/ai/model-manager";
import type { ModelCompatibility } from "@/src/features/ai/model-manager/device-compatibility";

type ModelCardBadgesProps = {
  model: ModelInfo;
  compatibility: ModelCompatibility;
  isSelected: boolean;
  isCompleted: boolean;
};

const TIER_LABELS: Record<MobileModelTier, string> = {
  compact: "가벼움",
  balanced: "균형",
  quality: "품질 우선",
};

function getCompatibilityVariant(status: ModelCompatibility["status"]) {
  if (status === "blocked") return "rose" as const;
  return "default" as const;
}

export function ModelCardBadges({
  model,
  compatibility,
  isSelected,
  isCompleted,
}: ModelCardBadgesProps) {
  return (
    <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
      {isSelected && (
        <Badge variant="outline" className="border-app-text bg-app-text">
          <BadgeText className="text-app-bg font-semibold">사용 중</BadgeText>
        </Badge>
      )}
      {isCompleted && !isSelected && (
        <Badge variant="secondary">
          <BadgeText>다운로드됨</BadgeText>
        </Badge>
      )}
      {model.mobileProfile.recommended && (
        <Badge variant="peach">
          <BadgeText>추천</BadgeText>
        </Badge>
      )}
      <Badge variant={getCompatibilityVariant(compatibility.status)}>
        <BadgeText>{compatibility.label}</BadgeText>
      </Badge>
      <Badge variant="secondary">
        <BadgeText>{TIER_LABELS[model.mobileProfile.tier]}</BadgeText>
      </Badge>
      {model.mobileProfile.experimental && (
        <Badge variant="neutral">
          <BadgeText>실험적</BadgeText>
        </Badge>
      )}
    </View>
  );
}
