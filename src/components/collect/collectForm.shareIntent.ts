import type { SharedContent } from "./ShareForm";

export type ShareIntentPayload = {
  sharedContent: SharedContent;
  shareText?: string;
  shareUrl?: string;
};

type IncomingShareIntent = {
  text?: string | null;
  webUrl?: string | null;
  files?: { path: string }[] | null;
};

export function parseShareIntent(
  shareIntent: IncomingShareIntent,
): ShareIntentPayload {
  const sharedContent: SharedContent = {};
  let shareText: string | undefined;
  let shareUrl: string | undefined;

  if (shareIntent.text) {
    sharedContent.text = shareIntent.text;
    shareText = shareIntent.text;
  }

  if (shareIntent.webUrl) {
    sharedContent.url = shareIntent.webUrl;
    shareUrl = shareIntent.webUrl;
  }

  if (shareIntent.files && shareIntent.files.length > 0) {
    sharedContent.imageUri = shareIntent.files[0]?.path;
  }

  return { sharedContent, shareText, shareUrl };
}
