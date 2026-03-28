import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";

/**
 * Orchestrates automatic navigation to /capture when a share intent arrives.
 *
 * This component must be rendered inside ShareIntentProvider to access the context.
 * It handles:
 * - Cold launch from share (waits for isReady)
 * - App in background (navigates on foreground)
 * - Already on capture screen (skips navigation)
 * - Multiple rapid shares (guard prevents double navigation)
 */
export function ShareIntentNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasShareIntent, isReady } = useShareIntentContext();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Reset guard when intent is cleared (ready for next share)
    if (!hasShareIntent) {
      hasNavigatedRef.current = false;
      return;
    }

    // Skip if not ready, no intent, or already on capture screen
    if (!isReady || pathname === "/capture") {
      return;
    }

    // Skip if already navigating for this intent
    if (hasNavigatedRef.current) {
      return;
    }

    // Navigate to capture screen (will present as modal per _layout.tsx config)
    hasNavigatedRef.current = true;
    router.push("/capture");
  }, [hasShareIntent, isReady, pathname, router]);

  // This component doesn't render anything
  return null;
}
