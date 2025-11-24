import { _ } from "./utils/language.js";
import { CanRender } from "./container.js";

export const About = function (picturesSource: string, picturesLicense: string): CanRender {
  function render(d: HTMLElement) {
    d.innerHTML =
      _.t("sidebar.aboutInfo") +
      "<h4>" +
      _.t("node.nodes") +
      "</h4>" +
      '<p class="legend">' +
      '<span class="legend-new"><span class="symbol"></span> ' +
      _.t("sidebar.nodeNew") +
      "</span>" +
      '<span class="legend-online"><span class="symbol"></span> ' +
      _.t("sidebar.nodeOnline") +
      "</span>" +
      '<span class="legend-offline"><span class="symbol"></span> ' +
      _.t("sidebar.nodeOffline") +
      "</span>" +
      '<span class="legend-uplink"><span class="symbol"></span> ' +
      _.t("sidebar.nodeUplink") +
      "</span>" +
      "</p>" +
      "<h4>" +
      _.t("node.clients") +
      "</h4>" +
      '<p class="legend">' +
      '<span class="legend-24ghz"><span class="symbol"></span> 2.4 GHz</span>' +
      '<span class="legend-5ghz"><span class="symbol"></span> 5 GHz</span>' +
      '<span class="legend-others"><span class="symbol"></span> ' +
      _.t("others") +
      "</span>" +
      "</p>" +
      (picturesSource
        ? _.t("sidebar.devicePicturesAttribution", {
            pictures_source: picturesSource,
            pictures_license: picturesLicense,
          })
        : "") +
      "<h3>Feel free to contribute!</h3>" +
      "<p>Please support the meshviewer by opening issues or sending pull requests!</p>" +
      '<p><a href="https://github.com/freifunk/meshviewer">' +
      "https://github.com/freifunk/meshviewer</a></p>" +
      "<p>Version: " +
      __APP_VERSION__ +
      "</p>" +
      "<h3>AGPL 3</h3>" +
      "<p>Copyright (C) Milan Pässler</p>" +
      "<p>Copyright (C) Nils Schneider</p>" +
      "<p>This program is free software: you can redistribute it and/or " +
      "modify it under the terms of the GNU Affero General Public " +
      "License as published by the Free Software Foundation, either " +
      "version 3 of the License, or (at your option) any later version.</p>" +
      "<p>This program is distributed in the hope that it will be useful, " +
      "but WITHOUT ANY WARRANTY; without even the implied warranty of " +
      "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the " +
      "GNU Affero General Public License for more details.</p>" +
      "<p>You should have received a copy of the GNU Affero General " +
      "Public License along with this program. If not, see " +
      '<a href="https://www.gnu.org/licenses/">' +
      "https://www.gnu.org/licenses/</a>.</p>" +
      "<p>The source code is available at " +
      '<a href="https://github.com/freifunk/meshviewer">' +
      "https://github.com/freifunk/meshviewer</a>.</p>";
    // Apply runtime colors from config if available so the legend matches the map
    const cfg: any = (window as any).config || {};
    const icon = cfg.icon || {};

    const applyIconToSymbol = (selector: string, keys: string[]) => {
      const el = d.querySelector(selector) as HTMLElement | null;
      if (!el) return;

      // find the first matching icon config object for the provided keys
      let cfgIcon: any = null;
      for (const k of keys) {
        if (icon?.[k]) {
          cfgIcon = icon[k];
          break;
        }
      }
      if (!cfgIcon) return;

      // Use fillColor only for background and color only for border.
      // Do not fall back from one to the other — they represent different semantic values.
      const fill = cfgIcon.fillColor;
      const stroke = cfgIcon.color;

      if (fill) {
        el.style.backgroundColor = fill;
      }
      if (stroke) {
        el.style.borderColor = stroke;
        el.style.borderStyle = "solid";
      }

      // special handling for uplink-style small symbols (match _legend.scss)
      if (keys.includes("online.uplink") || keys.includes("new.uplink")) {
        el.style.height = "0.47em";
        el.style.width = "0.47em";
        el.style.borderWidth = "0.27em";
      }
    };

    // node colors: prefer specific dot-keys (e.g. "new", "online", "offline")
    applyIconToSymbol(".legend-new .symbol", ["new"]);
    applyIconToSymbol(".legend-online .symbol", ["online"]);
    applyIconToSymbol(".legend-offline .symbol", ["offline"]);
    // uplink uses the more specific online.uplink if present, otherwise fallback to online
    applyIconToSymbol(".legend-uplink .symbol", ["online.uplink", "online"]);
  }

  return {
    render,
  };
};
