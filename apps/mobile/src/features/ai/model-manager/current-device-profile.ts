import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  totalMemoryBytesToRamGb,
  type MobileDevicePlatform,
  type MobileDeviceProfile,
} from "./device-compatibility";

function getMobilePlatform(): MobileDevicePlatform {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }
  return "other";
}

export function getCurrentDeviceProfile(): MobileDeviceProfile {
  return {
    platform: getMobilePlatform(),
    modelName: Device.modelName,
    ramGb: totalMemoryBytesToRamGb(Device.totalMemory),
  };
}
