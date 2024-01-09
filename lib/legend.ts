import { _ } from "./utils/language";
import * as helper from "./utils/helper";
import { Language } from "./utils/language";
import { ObjectsLinksAndNodes } from "./datadistributor";

export const Legend = function (language: ReturnType<typeof Language>) {
  const self = {
    setData: undefined,
    render: undefined,
  };
  let stats = document.createTextNode("");
  let timestamp = document.createTextNode("");

  self.setData = function setData(data: ObjectsLinksAndNodes) {
    let totalNodes = Object.keys(data.nodeDict).length;
    let totalOnlineNodes = data.nodes.online.length;
    let totalClients = helper.sum(
      data.nodes.online.map(function (node) {
        return node.clients;
      }),
    );
    let totalGateways = helper.sum(
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

    timestamp.textContent = _.t("sidebar.lastUpdate") + " " + data.timestamp.fromNow();
  };

  self.render = function render(el: HTMLElement) {
    let config = window.config;
    let h1 = document.createElement("h1");
    h1.textContent = config.siteName;
    el.appendChild(h1);

    language.languageSelect(el);

    let p = document.createElement("p");
    p.classList.add("legend");

    p.appendChild(stats);
    p.appendChild(document.createElement("br"));
    p.appendChild(timestamp);

    if (config.linkList) {
      p.appendChild(document.createElement("br"));
      config.linkList.forEach(function (link) {
        let a = document.createElement("a");
        a.innerText = link.title;
        a.href = link.href;
        p.appendChild(a);
      });
    }

    el.appendChild(p);
  };

  return self;
};
