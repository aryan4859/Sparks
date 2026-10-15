export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sparks-theme";

/**
 * Runs before first paint (raw HTML in the root layout): resolve the saved
 * choice — or the OS setting — to <html data-theme="light|dark">.
 */
export const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;
