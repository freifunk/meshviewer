import L from "leaflet";
import { escape } from "../utils/escape.js";

// Small dismissable banner shown on the map for non-fatal problems such as a
// geo layer that could not be loaded. Messages are appended, one line each.
export const Notice = function (map: L.Map) {
  let control: L.Control | undefined;
  let container: HTMLElement | undefined;

  function ensure(): HTMLElement {
    if (container) {
      return container;
    }
    const div = L.DomUtil.create("div", "map-notice");
    L.DomEvent.disableClickPropagation(div);
    const close = L.DomUtil.create("button", "map-notice-close", div);
    close.type = "button";
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", "Dismiss");
    close.addEventListener("click", clear);

    control = new L.Control({ position: "bottomleft" });
    control.onAdd = () => div;
    control.addTo(map);
    container = div;
    return div;
  }

  function show(message: string) {
    const line = document.createElement("p");
    line.innerHTML = escape(message);
    ensure().appendChild(line);
  }

  function clear() {
    if (control) {
      control.remove();
    }
    control = undefined;
    container = undefined;
  }

  return { show, clear };
};
