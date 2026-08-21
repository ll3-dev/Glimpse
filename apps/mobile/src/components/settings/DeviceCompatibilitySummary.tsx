import { Cpu, Smartphone } from "lucide-react-native";
import { Text, View } from "react-native";
import type { MobileDeviceProfile } from "@/src/features/ai/model-manager/device-compatibility";
import { useSemanticColor } from "@glimpse/ui";

type DeviceCompatibilitySummaryProps = {
  device: MobileDeviceProfile;
  compatibleCount: number;
  totalCount: number;
};

export function DeviceCompatibilitySummary({
  device,
  compatibleCount,
  totalCount,
}: DeviceCompatibilitySummaryProps) {
  const mintText = useSemanticColor("tagMintText");
  const appMuted = useSemanticColor("appMuted");
  const deviceName = device.modelName ?? "현재 기기";
  const memoryLabel =
    device.ramGb === null ? "RAM 확인 불가" : `RAM 약 ${device.ramGb}GB`;

  return (
    <View className="border-app-border bg-app-card rounded-xl border p-4">
      <View className="flex-row items-center gap-3">
        <View className="bg-tag-mint-bg h-10 w-10 items-center justify-center rounded-xl">
          <Smartphone size={19} color={mintText} />
        </View>
        <View className="flex-1">
          <Text className="text-app-text text-sm font-semibold">
            {deviceName}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <Cpu size={13} color={appMuted} />
            <Text className="text-app-muted text-xs">
              {memoryLabel} · 실행 후보 {compatibleCount}/{totalCount}
            </Text>
          </View>
        </View>
      </View>
      <Text className="text-app-muted mt-3 text-[11px] leading-4">
        모델 파일 크기와 런타임 여유 메모리를 함께 계산한 보수적 기준입니다.
        최소 조건에 가까운 모델은 긴 입력에서 종료될 수 있어 주의로 표시합니다.
      </Text>
    </View>
  );
}
