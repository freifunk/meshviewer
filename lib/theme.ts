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

const SVG_OPEN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">';
const SVG_CLOSE = "</svg>";

const SUN_RAYS =
  '<rect x="11" y="1" width="2" height="3" rx="1"/>' +
  '<rect x="11" y="20" width="2" height="3" rx="1"/>' +
  '<rect x="1" y="11" width="3" height="2" rx="1"/>' +
  '<rect x="20" y="11" width="3" height="2" rx="1"/>';

const SUN =
  SVG_OPEN +
  '<circle cx="12" cy="12" r="5"/>' +
  "<g>" +
  SUN_RAYS +
  "</g>" +
  '<g transform="rotate(45 12 12)">' +
  SUN_RAYS +
  "</g>" +
  SVG_CLOSE;

const MOON = SVG_OPEN + '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>' + SVG_CLOSE;

const AUTO =
  SVG_OPEN +
  '<path d="M12 4a8 8 0 000 16V4z"/>' +
  '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
  SVG_CLOSE;

export function themeIconSVG(theme: Theme): string {
  if (theme === "dark") {
    return MOON;
  }
  if (theme === "auto") {
    return AUTO;
  }
  return SUN;
}
