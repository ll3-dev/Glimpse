import { NitroModules } from "react-native-nitro-modules"
import type { GlimpseBridges } from "../../src/specs/GlimpseBridges.nitro"

// Create singleton instances
const glimpseBridges = NitroModules.createHybridObject<GlimpseBridges>("GlimpseBridges")

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
