import { useUniwind } from "uniwind";

export function useColorScheme() {
  const { theme } = useUniwind();

  // Uniwind handles theme through CSS, theme reflects current theme
  const colorScheme = theme === "dark" ? "dark" : "light";

  return {
    colorScheme,
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme: (scheme: "light" | "dark") => {
      // Theme is controlled by CSS .dark class on root
      // For manual switching, you'd need to add/remove .dark class
      // This requires additional implementation with AsyncStorage
    },
    toggleColorScheme: () => {
      // Toggle requires additional implementation
    },
  };
}
