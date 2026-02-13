import { getClipboardString, setClipboardString } from "@/modules/nitro-bridges";

export interface ClipboardContent {
  text: string;
  hasContent: boolean;
}

export function useClipboard() {
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

  return {
    getClipboard,
    setClipboard,
  };
}
