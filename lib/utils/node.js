import V from "snabbdom/dist/snabbdom-patch";
import moment from "moment";

import * as helper from "./helper";

var self = {};

function showBar(value, width, warning) {
  return V.h("span", { props: { className: "bar" + (warning ? " warning" : "") } }, [
    V.h("span", {
      style: { width: width * 100 + "%" },
    }),
    V.h("label", value),
  ]);
}

self.showStatus = function showStatus(node) {
  return V.h(
    "td",
    { props: { className: node.is_online ? "online" : "offline" } },
    _.t(node.is_online ? "node.lastOnline" : "node.lastOffline", {
      time: node.lastseen.fromNow(),
      date: node.lastseen.format("DD.MM.YYYY, H:mm:ss"),
    }),
  );
};

self.showGeoURI = function showGeoURI(data) {
  if (!helper.hasLocation(data)) {
    return undefined;
  }

  return V.h(
    "td",
    V.h(
      "a",
      { props: { href: "geo:" + data.location.latitude + "," + data.location.longitude } },
      Number(data.location.latitude.toFixed(6)) + ", " + Number(data.location.longitude.toFixed(6)),
    ),
  );
};

self.showGateway = function showGateway(node) {
  return node.is_gateway ? _.t("yes") : undefined;
};

self.showFirmware = function showFirmware(node) {
  return (
    [helper.dictGet(node, ["firmware", "release"]), helper.dictGet(node, ["firmware", "base"])]
      .filter(function (value) {
        return value !== null;
      })
      .join(" / ") || undefined
  );
};

self.showUptime = function showUptime(node) {
  return moment.utc(node.uptime).local().fromNow(true);
};

self.showFirstSeen = function showFirstSeen(node) {
  return node.firstseen.fromNow(true);
};

self.showLoad = function showLoad(node) {
  return showBar(node.loadavg.toFixed(2), node.loadavg / (node.nproc || 1), node.loadavg >= node.nproc);
};

self.showRAM = function showRAM(node) {
  return showBar(Math.round(node.memory_usage * 100) + " %", node.memory_usage, node.memory_usage >= 0.8);
};

self.showDomain = function showDomain(node) {
  var domainTitle = node.domain;
  if (config.domainNames) {
    config.domainNames.some(function (domain) {
      if (domainTitle === domain.domain) {
        domainTitle = domain.name;
        return true;
      }
    });
  }
  return domainTitle;
};

self.countLocalClients = function countLocalClients(node, visited = {}) {
  if (node.node_id in visited) return 0;
  visited[node.node_id] = 1;

  var count = node.clients || 0;
  node.neighbours.forEach(function (neighbour) {
    if (neighbour.link.type === "vpn") return;
    count += self.countLocalClients(neighbour.node, visited);
  });
  return count;
};

self.showClients = function showClients(node) {
  if (!node.is_online) {
    return undefined;
  }
  var localClients = self.countLocalClients(node);

  var clients = [
    V.h("span", [
      node.clients > 0 ? node.clients : _.t("none"),
      V.h("br"),
      V.h("i", { props: { className: "ion-people", title: _.t("node.clients") } }),
    ]),
    V.h("span", { props: { className: "legend-24ghz" } }, [
      node.clients_wifi24,
      V.h("br"),
      V.h("span", { props: { className: "symbol", title: "2,4 GHz" } }),
    ]),
    V.h("span", { props: { className: "legend-5ghz" } }, [
      node.clients_wifi5,
      V.h("br"),
      V.h("span", { props: { className: "symbol", title: "5 GHz" } }),
    ]),
    V.h("span", { props: { className: "legend-others" } }, [
      node.clients_other,
      V.h("br"),
      V.h("span", { props: { className: "symbol", title: _.t("others") } }),
    ]),
    V.h("span", [
      localClients > 0 ? localClients : _.t("none"),
      V.h("br"),
      V.h("i", { props: { className: "ion-share-alt", title: _.t("node.localClients") } }),
    ]),
  ];
  return V.h("td", { props: { className: "clients" } }, clients);
};

self.showIPs = function showIPs(node) {
  var string = [];
  var ips = node.addresses;
  ips.sort();
  ips.forEach(function (ip, i) {
    if (i > 0) {
      string.push(V.h("br"));
    }

    if (ip.indexOf("fe80:") !== 0) {
      string.push(V.h("a", { props: { href: "http://[" + ip + "]/", target: "_blank" } }, ip));
    } else {
      string.push(ip);
    }
  });
  return V.h("td", string);
};

self.showAutoupdate = function showAutoupdate(node) {
  return node.autoupdater.enabled
    ? _.t("node.activated", { branch: node.autoupdater.branch })
    : _.t("node.deactivated");
};

export default self;
