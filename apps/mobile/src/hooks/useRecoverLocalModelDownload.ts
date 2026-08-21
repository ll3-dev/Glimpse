import { useEffect } from "react";
import { AppState } from "react-native";
import { recoverLocalModelDownload } from "@/src/features/settings/local-llm.download-recovery";
import { logger } from "@/src/utils/logger";
import { useTimeoutScheduler } from './useTimeoutScheduler';

const RECOVERY_POLL_MS = 3000;

export function useRecoverLocalModelDownload(): void {
  const { schedule, cancel } = useTimeoutScheduler();

  useEffect(() => {
    let disposed = false;
    let reconciling = false;

    const reconcile = async () => {
      if (disposed || reconciling) return;
      reconciling = true;
      try {
        const result = await recoverLocalModelDownload();
        if (!disposed && result === "pending") {
          schedule(() => void reconcile(), RECOVERY_POLL_MS);
        }
      } catch (error) {
        logger.error("Failed to recover local model download", error);
      } finally {
        reconciling = false;
      }
    };

    void reconcile();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        cancel();
        void reconcile();
      }
    });

    return () => {
      disposed = true;
      cancel();
      subscription.remove();
    };
  }, [cancel, schedule]);
}
