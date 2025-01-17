import { Config } from "./config_default.js";
import { Router } from "./utils/router.js";

export {};

declare global {
  interface Window {
    config: Config;
    router: ReturnType<typeof Router>;
  }
}
