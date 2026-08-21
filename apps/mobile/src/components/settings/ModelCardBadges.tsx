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
  if (status === "recommended") return "mint" as const;
  if (status === "blocked") return "rose" as const;
  return "peach" as const;
}

export function ModelCardBadges({
  model,
  compatibility,
  isSelected,
  isCompleted,
}: ModelCardBadgesProps) {
  return (
    <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
      {model.mobileProfile.recommended && (
        <Badge variant="peach">
          <BadgeText>추천</BadgeText>
        </Badge>
      )}
      <Badge variant={getCompatibilityVariant(compatibility.status)}>
        <BadgeText>{compatibility.label}</BadgeText>
      </Badge>
      {model.mobileProfile.experimental && (
        <Badge variant="lavender">
          <BadgeText>실험적</BadgeText>
        </Badge>
      )}
      <Badge variant="secondary">
        <BadgeText>{TIER_LABELS[model.mobileProfile.tier]}</BadgeText>
      </Badge>
      {model.releasedAt && (
        <Badge
          variant={model.releasedAt.startsWith("2026") ? "sky" : "neutral"}
        >
          <BadgeText>{model.releasedAt}</BadgeText>
        </Badge>
      )}
      {model.ggufSource && (
        <Badge variant={model.ggufSource === "publisher" ? "mint" : "lavender"}>
          <BadgeText>
            {model.ggufSource === "publisher" ? "공식 GGUF" : "커뮤니티 GGUF"}
          </BadgeText>
        </Badge>
      )}
      {isSelected && (
        <Badge variant="neutral">
          <BadgeText>사용 중</BadgeText>
        </Badge>
      )}
      {isCompleted && !isSelected && (
        <Badge variant="mint">
          <BadgeText>다운로드됨</BadgeText>
        </Badge>
      )}
    </View>
  );
}
