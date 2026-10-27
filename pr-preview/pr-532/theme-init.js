// Applies the dark theme before the first paint, so the page does not flash light.
// Keep storage key ("meshviewer.theme") and class name ("theme_dark") in sync with lib/theme.ts.
try {
  const t = localStorage.getItem("meshviewer.theme");
  if (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("theme_dark");
  }
} catch {
  try {
    if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("theme_dark");
    }
  } catch {
    /* matchMedia unavailable; accept a light paint */
  }
}
