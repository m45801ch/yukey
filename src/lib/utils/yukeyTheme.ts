/** Shared resolver for yukey's three branded skins plus "follow system". */
export const SYSTEM_THEME = "system";

export const YUKEY_THEMES = [
  "theme-premium-light",
  "theme-dark-tech",
  "theme-zen-natural",
] as const;

export type YukeyTheme = (typeof YUKEY_THEMES)[number];
export type ThemeSelection = YukeyTheme | typeof SYSTEM_THEME;

const isYukeyTheme = (value: string): value is YukeyTheme =>
  (YUKEY_THEMES as readonly string[]).includes(value);

export function readThemeSelection(): ThemeSelection {
  const stored = localStorage.getItem("yukey_app_theme");
  if (stored === SYSTEM_THEME || (stored && isYukeyTheme(stored))) {
    return stored as ThemeSelection;
  }
  return "theme-zen-natural";
}

/** Resolve "system" to a real skin via the OS colour-scheme preference. */
export function resolveYukeyTheme(selection: ThemeSelection): YukeyTheme {
  if (selection === SYSTEM_THEME) {
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return dark ? "theme-dark-tech" : "theme-zen-natural";
  }
  return selection;
}

/** Apply the resolved skin to <html> and return the class that was applied. */
export function applyYukeyTheme(): YukeyTheme {
  const resolved = resolveYukeyTheme(readThemeSelection());
  const root = document.documentElement;
  root.classList.remove(...YUKEY_THEMES);
  root.classList.add(resolved);
  root.style.colorScheme = resolved === "theme-dark-tech" ? "dark" : "light";
  return resolved;
}

/** Re-apply whenever the OS switches between light and dark. */
export function watchSystemTheme(onChange: (resolved: YukeyTheme) => void): () => void {
  const query = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!query) return () => {};
  const handler = () => onChange(applyYukeyTheme());
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}
