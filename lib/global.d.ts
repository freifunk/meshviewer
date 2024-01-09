import { Config } from "./config_default";
import Polyglot from "node-polyglot";
import { Router } from "./utils/router";

export {};

declare global {
  interface Window {
    config: Config;
    router: ReturnType<typeof Router>;
  }
}
