import { Config } from "./config_default.js";
import { Router } from "./utils/router.js";

export {};

declare global {
  const __APP_VERSION__: string;

  interface Window {
    config: Config;
    router: ReturnType<typeof Router>;
  }
}
