/**
 * Theme is tri-state: "system" (the default — follow the OS), or an explicit
 * "light"/"dark" the visitor picked, which always wins and persists.
 *
 * Only an explicit choice is stored, and only an explicit choice stamps
 * `data-theme` on <html>. The absence of both is what "system" means, so the
 * stylesheet's `prefers-color-scheme` block can do the work with no JS.
 */
export const THEME_STORAGE_KEY = "mjfird:theme";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_ORDER: ThemeChoice[] = ["system", "light", "dark"];

export function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // storage unavailable (private mode) — fall back to following the OS
    return "system";
  }
}

export function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;

  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }

  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // storage unavailable — the attribute still applies for this page
  }
}

export function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}
