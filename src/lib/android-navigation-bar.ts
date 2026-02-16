import * as NavigationBar from "expo-navigation-bar";
import { Effect } from "effect";
import { Platform } from "react-native";
import { NAV_THEME } from "@/src/lib/constants";
import { appError, tryPromise } from "@/src/lib/effect-result";

export async function setAndroidNavigationBar(theme: "light" | "dark") {
  if (Platform.OS !== "android") return;

  const program = Effect.gen(function* () {
    yield* tryPromise(
      () => NavigationBar.setButtonStyleAsync(theme === "dark" ? "light" : "dark"),
      (error) => appError("UNKNOWN_ERROR", "Failed to set navigation bar button style", error),
    );

    yield* tryPromise(
      () =>
        NavigationBar.setBackgroundColorAsync(
          theme === "dark" ? NAV_THEME.dark.background : NAV_THEME.light.background,
        ),
      (error) => appError("UNKNOWN_ERROR", "Failed to set navigation bar color", error),
    );
  });

  await Effect.runPromise(program);
}
