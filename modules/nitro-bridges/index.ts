import { NitroModules } from "react-native-nitro-modules"
import type {
  GlimpseBridges,
  ClipboardMonitor,
  ClipboardItem as ClipboardItemType,
} from "../../src/specs/GlimpseBridges.nitro"

export type { ClipboardItemType as ClipboardItem }

// Create singleton instances
const glimpseBridges = NitroModules.createHybridObject<GlimpseBridges>("GlimpseBridges")
const clipboardMonitor = NitroModules.createHybridObject<ClipboardMonitor>("ClipboardMonitor")

// GlimpseBridges methods
export function setWidgetData(key: string, value: string, suite?: string): void {
  glimpseBridges.set(key, value, suite)
}

export async function getClipboardString(): Promise<string> {
  return glimpseBridges.getClipboardString()
}

export async function setClipboardString(content: string): Promise<void> {
  return glimpseBridges.setClipboardString(content)
}

export async function hasClipboard(): Promise<boolean> {
  return glimpseBridges.hasClipboard()
}

// ClipboardMonitor methods
let currentListener: ((item: ClipboardItemType) => void) | null = null

export async function startClipboardMonitoring(
  onChange: (item: ClipboardItemType) => void
): Promise<void> {
  currentListener = onChange
  return clipboardMonitor.startMonitoring((item) => {
    currentListener?.(item)
  })
}

export async function stopClipboardMonitoring(): Promise<void> {
  currentListener = null
  return clipboardMonitor.stopMonitoring()
}

export function isClipboardMonitoring(): boolean {
  return clipboardMonitor.isMonitoring()
}
