import { type HybridObject } from "react-native-nitro-modules"

export type ClipboardItemType = "text" | "image" | "url" | "file"

export interface ClipboardItem {
  type: ClipboardItemType
  content: string
  timestamp: number
}

// Widget data storage (original function)
export interface GlimpseBridges extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  set(key: string, value: string, suite?: string): void

  // Clipboard methods
  getClipboardString(): Promise<string>
  setClipboardString(content: string): Promise<void>
  hasClipboard(): Promise<boolean>
}

// Clipboard monitoring with events
export interface ClipboardMonitor extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  startMonitoring(onChange: (item: ClipboardItem) => void): Promise<void>
  stopMonitoring(): Promise<void>

  isMonitoring(): boolean
}
