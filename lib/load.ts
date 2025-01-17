import { config as defaultConfig } from "./config_default.js";
import { main } from "./main.js";

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
  globalThis.config = Object.assign(defaultConfig, config);
  main();
};
