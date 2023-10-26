import { Config } from "./config_default";
import Polyglot from "node-polyglot";

export {};

declare global {
  interface Window {
    config: Config;
    _: Polyglot;
  }
}
