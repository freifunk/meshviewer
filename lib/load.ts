import { config as defaultConfig } from "./config_default.js";
import { main } from "./main.js";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Recursively overlay the user-supplied config.json onto the built-in defaults.
// config.json is entirely user-controlled, so we cannot rely on it to be
// complete: any key it omits must keep its default. Nested objects merge key by
// key; arrays and primitives replace outright.
const deepMerge = <T>(defaults: T, overrides: unknown): T => {
  if (!isPlainObject(defaults) || !isPlainObject(overrides)) {
    return overrides === undefined ? defaults : (overrides as T);
  }
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(overrides)) {
    result[key] = deepMerge(defaults[key], overrides[key]);
  }
  return result as T;
};

const showLoaderError = (message: string, hint = "") => {
  document.querySelector(".loader")!.innerHTML =
    message +
    "<br><br>" +
    '<button onclick="location.reload(true)" class="btn text" aria-label="Try to reload">' +
    "Try to reload" +
    "</button><br>" +
    hint;
};

export const load = async () => {
  let configResponse: Response;
  try {
    configResponse = await fetch("config.json");
  } catch {
    // When offline, the service worker still loads the app shell, but this fetch()
    // throws a network error instead of returning a non-ok response.
    showLoaderError("No connection available.");
    return;
  }
  if (!configResponse.ok) {
    showLoaderError("config.json can not be loaded:<br>" + configResponse.statusText, "or report to your community");
    return;
  }
  const config = await configResponse.json();
  window.config = deepMerge(defaultConfig, config);
  main();
};
