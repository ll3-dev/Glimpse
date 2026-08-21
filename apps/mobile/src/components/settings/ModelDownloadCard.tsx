import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Download, Trash2, Check, AlertCircle, X } from "lucide-react-native";
import type { ModelInfo } from "@/src/features/ai/model-manager";
import type { ModelCompatibility } from "@/src/features/ai/model-manager/device-compatibility";
import { ModelCardBadges } from "./ModelCardBadges";
import { ModelDownloadProgress } from "./ModelDownloadProgress";
import { useSemanticColor } from "@glimpse/ui";

type DownloadStatus = "idle" | "downloading" | "completed" | "error";

type ModelDownloadCardProps = {
  model: ModelInfo;
  compatibility: ModelCompatibility;
  status: DownloadStatus;
  isSelected: boolean;
  downloadProgress?: {
    written: number;
    total: number;
    percentage: number;
  };
  errorMessage?: string;
  onDownload: () => void;
  onCancelDownload?: () => void;
  onDelete: () => void;
  onSelect: () => void;
  canDownload: boolean;
  canSelect: boolean;
};

export function ModelDownloadCard({
  model,
  compatibility,
  status,
  isSelected,
  downloadProgress,
  errorMessage,
  onDownload,
  onCancelDownload,
  onDelete,
  onSelect,
  canDownload,
  canSelect,
}: ModelDownloadCardProps) {
  const isDownloading = status === "downloading";
  const isCompleted = status === "completed";
  const hasError = status === "error";
  const appText = useSemanticColor("appText");
  const appMuted = useSemanticColor("appMuted");
  const appSubtle = useSemanticColor("appSubtle");
  const appAccent = useSemanticColor("appAccent");
  const foreground = useSemanticColor("primaryForeground");

  return (
    <View
      className={`bg-app-card rounded-xl border p-4 ${
        isSelected ? "border-app-text" : "border-app-border"
      }`}
    >
      <ModelCardBadges
        model={model}
        compatibility={compatibility}
        isSelected={isSelected}
        isCompleted={isCompleted}
      />

      <Text className="text-app-text text-base font-semibold tracking-tight">
        {model.name}
      </Text>
      {model.description && (
        <Text className="text-app-muted mt-1 text-sm leading-5">
          {model.description}
        </Text>
      )}

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {model.mobileProfile.strengths.map((strength) => (
          <View key={strength} className="bg-app-bg rounded-md px-2 py-1">
            <Text className="text-app-muted text-[10px] font-medium">
              {strength}
            </Text>
          </View>
        ))}
      </View>

      <Text className="text-app-subtle mt-3 text-[11px]">
        {model.size} · {model.quantization}
        {model.license ? ` · ${model.license}` : ""}
      </Text>
      <Text className="text-app-subtle mt-1 text-[11px] leading-4">
        모델 최대 컨텍스트 {model.contextLength.toLocaleString()} 토큰 · 모바일 실행은 메모리 보호를 위해 4,096 토큰부터 시작
      </Text>
      {model.mobileProfile.caveat && (
        <Text className="text-app-muted mt-1 text-[11px] leading-4">
          {model.mobileProfile.caveat}
        </Text>
      )}
      {compatibility.status !== "recommended" && (
        <Text
          className={`mt-1 text-[11px] leading-4 ${
            compatibility.status === "blocked"
              ? "text-tag-rose-text"
              : "text-app-muted"
          }`}
        >
          {compatibility.reason}
        </Text>
      )}

      {isDownloading && downloadProgress && (
        <ModelDownloadProgress
          written={downloadProgress.written}
          total={downloadProgress.total}
          percentage={downloadProgress.percentage}
          expectedSize={model.size}
        />
      )}

      {hasError && errorMessage && (
        <View className="bg-tag-rose-bg/60 mt-3 flex-row items-start gap-1.5 rounded-lg p-2.5">
          <AlertCircle size={14} color={appAccent} />
          <Text className="text-tag-rose-text flex-1 text-xs">
            {errorMessage}
          </Text>
        </View>
      )}

      <View className="mt-4 flex-row items-center justify-end gap-2">
        {!isCompleted && !isDownloading && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${model.name} 다운로드`}
            accessibilityHint={canDownload ? undefined : compatibility.reason}
            accessibilityState={{ disabled: !canDownload }}
            onPress={onDownload}
            disabled={!canDownload}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-lg px-3.5 py-2 active:opacity-80 ${
              canDownload ? "bg-app-text" : "border-app-border bg-app-bg border"
            }`}
          >
            <Download size={14} color={canDownload ? foreground : appSubtle} />
            <Text
              className={`text-xs font-semibold ${
                canDownload ? "text-white" : "text-app-subtle"
              }`}
            >
              {canDownload ? "다운로드" : "기기 제한"}
            </Text>
          </Pressable>
        )}

        {isDownloading && (
          <View className="mr-auto flex-row items-center gap-2">
            <ActivityIndicator size="small" color={appText} />
            <Text className="text-app-muted text-xs font-medium">
              다운로드 중
            </Text>
          </View>
        )}
        {isDownloading && onCancelDownload && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${model.name} 다운로드 중단`}
            onPress={onCancelDownload}
            className="border-app-border bg-app-surface min-h-11 flex-row items-center gap-1.5 rounded-lg border px-3 py-2 active:opacity-80"
          >
            <X size={14} color={appText} />
            <Text className="text-app-text text-xs font-semibold">중단</Text>
          </Pressable>
        )}

        {isCompleted && !isSelected && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${model.name} 사용`}
            accessibilityState={{ disabled: !canSelect }}
            onPress={onSelect}
            disabled={!canSelect}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-lg border px-3 py-2 active:opacity-80 ${
              canSelect
                ? "border-app-text bg-app-surface"
                : "border-app-border bg-app-bg"
            }`}
          >
            <Check size={14} color={canSelect ? appText : appSubtle} />
            <Text
              className={`text-xs font-semibold ${
                canSelect ? "text-app-text" : "text-app-subtle"
              }`}
            >
              이 모델 사용
            </Text>
          </Pressable>
        )}

        {isCompleted && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${model.name} 삭제`}
            onPress={onDelete}
            className="border-app-border bg-app-bg min-h-11 min-w-11 items-center justify-center rounded-lg border"
          >
            <Trash2 size={14} color={appMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
