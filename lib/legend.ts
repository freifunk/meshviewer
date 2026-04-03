import { _ } from "./utils/language.js";
import * as helper from "./utils/helper.js";
import { Language } from "./utils/language.js";
import { ObjectsLinksAndNodes } from "./datadistributor.js";
import { CanSetData } from "./datadistributor.js";
import { CanRender } from "./container.js";

export const Legend = function (language: ReturnType<typeof Language>): CanSetData & CanRender {
  const stats = document.createTextNode("");
  const timestamp = document.createTextNode("");

  return {
    setData(data: ObjectsLinksAndNodes) {
      const nodeDict = data.nodeDict ?? {};
      const totalNodes = Object.keys(nodeDict).length;
      const totalOnlineNodes = data.nodes.online.length;
      const totalClients = helper.sum(
        data.nodes.online.map(function (node) {
          return node.clients;
        }),
      );
      const totalGateways = helper.sum(
        data.nodes.online
          .filter(function (node) {
            return node.is_gateway;
          })
          .map(helper.one),
      );

      stats.textContent =
        _.t("sidebar.nodes", { total: totalNodes, online: totalOnlineNodes }) +
        " " +
        _.t("sidebar.clients", { smart_count: totalClients }) +
        " " +
        _.t("sidebar.gateway", { smart_count: totalGateways });

      const ts = data.timestamp;
      timestamp.textContent = _.t("sidebar.lastUpdate") + " " + (ts ? ts.fromNow() : "");
    },

    render(el: HTMLElement) {
      const config = window.config;
      const h1 = document.createElement("h1");
      h1.textContent = config.siteName;
      el.appendChild(h1);

      language.languageSelect(el);

      const p = document.createElement("p");
      p.classList.add("legend");

      p.appendChild(stats);
      p.appendChild(document.createElement("br"));
      p.appendChild(timestamp);

      if (config.linkList) {
        p.appendChild(document.createElement("br"));
        config.linkList.forEach(function (link) {
          const a = document.createElement("a");
          a.innerText = link.title;
          a.href = link.href;
          p.appendChild(a);
        });
      }

      el.appendChild(p);
    },
  };
};
