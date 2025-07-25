import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";
import { useEffect, useInsertionEffect, useLayoutEffect } from "react";
import { Appearance, Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { useGlimpseStore } from "@/store/useGlimpseStore";
import { getGlints } from "@/hooks/db/useGlintQuery";

export const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: useDefaultSetup,
});

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
  }, []);
}

function useSetAndroidNavigationBar() {
  useLayoutEffect(() => {
    setAndroidNavigationBar(Appearance.getColorScheme() ?? "light");
  }, []);
}

const BACKGROUND_TASK_IDENTIFIER = "background-task";

TaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
  try {
    const glintTitles = (await getGlints()).map((glint) => glint.title);
    useGlimpseStore.getState().actions.setGlimpse(JSON.stringify(glintTitles));
  } catch (error) {
    console.error("Failed to execute the background task:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
  return BackgroundTask.BackgroundTaskResult.Success;
});

function useDefaultSetup() {
  useInsertionEffect(() => {
    TaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
      const status = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_TASK_IDENTIFIER
      );
      if (!status) {
        BackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER);
      }
    });
  }, []);
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? useEffect
    : useLayoutEffect;
