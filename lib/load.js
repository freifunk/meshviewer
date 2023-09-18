import { config as defaultConfig } from "./config_default";
import { main } from "./main";

export const load = async () => {
  const configResponse = await fetch("config.json");
  const config = await configResponse.json();
  globalThis.config = Object.assign(defaultConfig, config);
  main();
};
