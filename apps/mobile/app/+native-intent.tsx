/**
 * Expo Router native intent handler for iOS share extension deep links.
 *
 * The iOS share extension opens the app with URLs like:
 *   ll3.kr://dataUrl=<key>#<type>
 *
 * This format is not a valid route path and causes "unmatched route" errors.
 * We rewrite it to "/" and let expo-share-intent handle the URL internally
 * via its useLinkingURL() hook.
 */
const SHARE_INTENT_PATTERN = /dataUrl=/;

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial?: boolean;
}): string {
  if (SHARE_INTENT_PATTERN.test(path)) {
    return "/";
  }
  return path;
}
