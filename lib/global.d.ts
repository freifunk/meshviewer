import { Config } from "./config_default.js";
import { Router } from "./utils/router.js";

export {};

declare module "*.scss";
declare module "../scss/main.scss";

declare global {
  const __APP_VERSION__: string;

  interface Window {
    config: Config;
    router: Router;
  }

  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
    mozCancelFullScreen?: () => void;
  }

  interface HTMLElement {
    webkitRequestFullScreen?: () => void;
    mozRequestFullScreen?: () => void;
  }
}
