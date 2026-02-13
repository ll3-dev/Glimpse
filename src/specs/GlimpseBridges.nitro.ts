import { type HybridObject } from "react-native-nitro-modules"

// Widget data storage (original function)
export interface GlimpseBridges extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  set(key: string, value: string, suite?: string): void

  // Clipboard methods
  getClipboardString(): Promise<string>
  setClipboardString(content: string): Promise<void>
  hasClipboard(): Promise<boolean>
}
