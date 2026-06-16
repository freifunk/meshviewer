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

export const load = async () => {
  const configResponse = await fetch("config.json");
  if (!configResponse.ok) {
    document.querySelector(".loader").innerHTML =
      "config.json can not be loaded:" +
      "<br>" +
      configResponse.statusText +
      "<br><br>" +
      '<button onclick="location.reload(true)" class="btn text" aria-label="Try to reload">' +
      "Try to reload" +
      "</button><br>" +
      "or report to your community";
    return;
  }
  const config = await configResponse.json();
  globalThis.config = deepMerge(defaultConfig, config);
  main();
};
