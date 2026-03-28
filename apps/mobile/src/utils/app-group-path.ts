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

/**
 * Pending share data saved by Share Extension in direct save mode
 */
export interface PendingShareData {
  text?: string[];
  webUrl?: { url: string; meta: string }[];
}

/**
 * Reads pending share data saved by Share Extension (direct save mode).
 * Returns null if no pending data or not on iOS.
 */
export async function getPendingShareData(): Promise<PendingShareData | null> {
  if (Platform.OS !== "ios") {
    return null;
  }

  try {
    const data = await AppGroupModule.getPendingShareData();
    return data;
  } catch (error) {
    console.error("Failed to get pending share data:", error);
    return null;
  }
}

/**
 * Clears pending share data after processing.
 */
export async function clearPendingShareData(): Promise<void> {
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    await AppGroupModule.clearPendingShareData();
  } catch (error) {
    console.error("Failed to clear pending share data:", error);
  }
}

export { APP_GROUP_IDENTIFIER };
