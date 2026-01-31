import { useEffect, useState } from "react";
import {
  getClipboardString,
  setClipboardString,
  startClipboardMonitoring,
  stopClipboardMonitoring,
  isClipboardMonitoring,
  type ClipboardItem,
} from "@/modules/nitro-bridges";

export interface ClipboardContent {
  text: string;
  hasContent: boolean;
}

export type { ClipboardItem };

export function useClipboard() {
  const [currentContent, setCurrentContent] = useState<string>("");

  const getClipboard = async (): Promise<ClipboardContent> => {
    try {
      const text = await getClipboardString();
      return {
        text,
        hasContent: text.length > 0,
      };
    } catch (error) {
      console.error("Failed to get clipboard:", error);
      return { text: "", hasContent: false };
    }
  };

  const setClipboard = async (content: string): Promise<void> => {
    try {
      await setClipboardString(content);
    } catch (error) {
      console.error("Failed to set clipboard:", error);
      throw error;
    }
  };

  const startMonitoring = async () => {
    try {
      await startClipboardMonitoring((item: ClipboardItem) => {
        console.log("Clipboard changed:", item);
        setCurrentContent(item.content);
      });
    } catch (error) {
      console.error("Failed to start clipboard monitoring:", error);
    }
  };

  const stopMonitoringLocal = async () => {
    try {
      await stopClipboardMonitoring();
    } catch (error) {
      console.error("Failed to stop clipboard monitoring:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isClipboardMonitoring()) {
        stopClipboardMonitoring().catch(console.error);
      }
    };
  }, []);

  return {
    getClipboard,
    setClipboard,
    startMonitoring,
    stopMonitoring: stopMonitoringLocal,
    isMonitoring: isClipboardMonitoring(),
    currentContent,
  };
}
