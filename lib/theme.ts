export type Theme = "light" | "dark" | "auto";

// Keep STORAGE_KEY and DARK_CLASS in sync with the pre-paint inline script in index.html.
const STORAGE_KEY = "meshviewer.theme";
const DARK_CLASS = "theme_night";
const THEMES: Theme[] = ["light", "dark", "auto"];

let inMemory: Theme = "auto";

const darkQuery =
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "auto";
}

function read(): Theme {
  try {
    let v = localStorage.getItem(STORAGE_KEY);
    if (isTheme(v)) {
      return v;
    }
  } catch (e) {
    /* localStorage inaccessible (private mode, sandboxed iframe, file://) */
  }
  return inMemory;
}

function write(value: Theme): void {
  inMemory = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (e) {
    /* keep in-memory only */
  }
}

export function resolveTheme(): "light" | "dark" {
  let current = read();
  if (current === "dark") {
    return "dark";
  }
  if (current === "auto" && darkQuery && darkQuery.matches) {
    return "dark";
  }
  return "light";
}

function apply(): void {
  let dark = resolveTheme() === "dark";
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  document.documentElement.dispatchEvent(new CustomEvent("themechange"));
}

export function getTheme(): Theme {
  return read();
}

export function cycleTheme(): Theme {
  let next = THEMES[(THEMES.indexOf(read()) + 1) % THEMES.length];
  write(next);
  apply();
  return next;
}

export function initTheme(): void {
  inMemory = read();
  apply();
  if (darkQuery) {
    darkQuery.addEventListener("change", function () {
      if (read() === "auto") {
        apply();
      }
    });
  }
}
