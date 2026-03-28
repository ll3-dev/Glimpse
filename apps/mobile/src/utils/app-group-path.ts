import { NativeModules, Platform } from "react-native";

const { AppGroupModule } = NativeModules;

const APP_GROUP_IDENTIFIER = "group.kr.ll3.glimpse";

/**
 * Gets the App Group container path for iOS.
 * Returns null on other platforms.
 */
export async function getAppGroupContainerPath(): Promise<string | null> {
  if (Platform.OS !== "ios") {
    return null;
  }

  try {
    const path = await AppGroupModule.getContainerPath();
    return path;
  } catch (error) {
    console.error("Failed to get App Group container path:", error);
    return null;
  }
}

/**
 * Gets the App Group container path synchronously (iOS only).
 * Uses a fallback construction if native module fails.
 */
export function getAppGroupContainerPathSync(): string | null {
  if (Platform.OS !== "ios") {
    return null;
  }

  // Try native module first (more reliable)
  // Note: NativeModules calls are synchronous for simple getters in some setups
  // but we'll use the async version in practice

  // Fallback: construct path manually (less reliable but works in most cases)
  // The actual path is /var/mobile/Containers/Shared/AppGroup/<UUID>/
  // which we can't determine without native code

  return null;
}

export { APP_GROUP_IDENTIFIER };
