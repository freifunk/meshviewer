import "../scss/main.scss";
import { registerSW } from "virtual:pwa-register";
import { load } from "./load.js";

// Pulls in the autoUpdate register template; without this import only a bare
// register() is emitted and updates arrive one reload late.
registerSW({ immediate: true });

load();
