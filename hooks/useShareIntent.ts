import { useEffect, useState } from "react";
import { useShareIntent as useExpoShareIntent } from "expo-share-intent";
import { Paths, copyAsync } from "expo-file-system";
import { db } from "@/db";
import { glintTable } from "@/db/schema";

export interface SharedFile {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface ShareIntentData {
  text?: string;
  url?: string;
  type?: string;
  files?: SharedFile[];
}

export function useShareIntent() {
  const { shareIntent: rawShareIntent, hasShareIntent, resetShareIntent } = useExpoShareIntent();
  const [shareIntent, setShareIntent] = useState<ShareIntentData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!hasShareIntent || !rawShareIntent) {
      setShareIntent(null);
      return;
    }

    const processShareIntent = async () => {
      try {
        // Process files - copy to app documents directory for persistent access
        let processedFiles: SharedFile[] | undefined;

        if (rawShareIntent.files && rawShareIntent.files.length > 0) {
          processedFiles = [];

          for (const file of rawShareIntent.files) {
            try {
              // Create a persistent copy in app's document directory
              const fileName = file.fileName || `shared_${Date.now()}`;
              const destPath = `${Paths.document}${fileName}`;

              await copyAsync({
                from: file.path,
                to: destPath,
              });

              processedFiles.push({
                filePath: destPath,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.size ?? 0,
              });
            } catch (copyErr) {
              console.error("Failed to copy file:", copyErr);
              // Keep original path if copy fails
              processedFiles.push({
                filePath: file.path,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.size ?? 0,
              });
            }
          }
        }

        setShareIntent({
          text: rawShareIntent.text ?? undefined,
          url: rawShareIntent.webUrl ?? undefined,
          type: rawShareIntent.type ?? undefined,
          files: processedFiles,
        });

        // Clear the intent after processing
        resetShareIntent(true);
      } catch (err) {
        console.error("ShareIntent error:", err);
        setError(err as Error);
      }
    };

    processShareIntent();
  }, [rawShareIntent, hasShareIntent, resetShareIntent]);

  const saveSharedContent = async (title: string) => {
    if (!shareIntent) return null;

    try {
      // Build content from text, URL, and file references
      const contentParts: string[] = [];

      if (shareIntent.text) {
        contentParts.push(shareIntent.text);
      }

      if (shareIntent.url) {
        contentParts.push(shareIntent.url);
      }

      // Add file references as JSON string
      if (shareIntent.files && shareIntent.files.length > 0) {
        const fileData = shareIntent.files.map((f) => ({
          path: f.filePath,
          name: f.fileName,
          type: f.mimeType,
        }));
        contentParts.push(`FILES:${JSON.stringify(fileData)}`);
      }

      const content = contentParts.join("\n") || "";
      const [newGlint] = await db
        .insert(glintTable)
        .values({
          title: title || getDefaultTitle(shareIntent),
          content,
        })
        .returning();

      setShareIntent(null);
      return newGlint;
    } catch (err) {
      console.error("Failed to save shared content:", err);
      throw err;
    }
  };

  const dismiss = () => {
    setShareIntent(null);
    setError(null);
  };

  return {
    shareIntent,
    hasShareIntent: !!shareIntent,
    error,
    saveSharedContent,
    dismiss,
  };
}

function getDefaultTitle(data: ShareIntentData): string {
  if (data.files && data.files.length > 0) {
    if (data.files.length === 1) {
      return data.files[0].fileName;
    }
    return `${data.files.length} files shared`;
  }
  if (data.url) {
    try {
      const url = new URL(data.url);
      return url.hostname;
    } catch {
      return "Shared Link";
    }
  }
  if (data.text) {
    return data.text.slice(0, 50);
  }
  return "Shared from...";
}
