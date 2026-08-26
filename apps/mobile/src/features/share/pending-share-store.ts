/**
 * Partial-update operations on the pending share store.
 *
 * The store itself is owned by the native AppGroupModule (App Group
 * UserDefaults). The native module exposes two partial-removal methods
 * alongside the pre-existing full clear:
 *
 * - `clearPendingShareText`: removes the text record only
 * - `replacePendingShareUrls(urls)`: rewrites the URL record with the given
 *   entries (JSON-encoded WebUrl array, same format the Share Extension
 *   writes)
 *
 * Key format is unchanged: text under `ll3.krShareKey` (String array), URLs
 * under `ll3.krShareUrlKey` falling back to `ll3.krShareKey` (JSON data).
 */

import { NativeModules, Platform } from "react-native";

const { AppGroupModule } = NativeModules;

export interface PendingShareUrlEntry {
  url: string;
  meta: string;
}

/**
 * Drops the pending text entry while keeping every URL entry pending.
 */
export async function clearPendingShareText(): Promise<void> {
  if (Platform.OS !== "ios") {
    return;
  }
  try {
    await AppGroupModule.clearPendingShareText();
  } catch (error) {
    console.error("Failed to clear pending share text:", error);
  }
}

/**
 * Removes saved URL entries from the pending batch by value; failed ones
 * stay pending.
 */
export async function removePendingShareUrls(
  urls: string[],
): Promise<void> {
  if (Platform.OS !== "ios" || urls.length === 0) {
    return;
  }
  try {
    const data = await AppGroupModule.getPendingShareData();
    const pendingUrls: PendingShareUrlEntry[] = data?.webUrl ?? [];
    const saved = new Set(urls);
    const remaining = pendingUrls.filter((entry) => !saved.has(entry.url));

    if (
      remaining.length === pendingUrls.length &&
      pendingUrls.length > 0
    ) {
      return; // none of the saved urls are still pending
    }
    await AppGroupModule.replacePendingShareUrls(remaining);
  } catch (error) {
    console.error("Failed to remove pending share urls:", error);
  }
}
