import { h, VNode } from "snabbdom";
import moment, { Moment } from "moment";
import { _ } from "./language.js";
import * as helper from "./helper.js";

export type LinkId = string;

export interface Link {
  type: string; // wifi, vpn etc
  id: LinkId;
  distance: number;
  source: Node;
  target: Node;
  source_addr: string;
  target_addr: string;
  source_mac?: string; // Same as _addr
  target_mac?: string; // Same as _addr
  source_tq: number;
  target_tq: number;
}

export interface Neighbour {
  node: Node;
  link: Link;
}

export interface Firmware {
  release: string;
  base: string;
}

export type IPAddress = string;

export interface Autoupdater {
  enabled: boolean;
  branch: string;
}

export type NodeId = string;

export interface Node {
  node_id: NodeId;
  hostname: string;
  domain?: string;
  firstseen: Moment;
  lastseen: Moment;
  is_online: boolean;
  location: LatLon;
  neighbours: Neighbour[];
  firmware: Firmware;
  uptime: number;
  nproc: number;
  loadavg: number;
  memory_usage: number;
  model?: string;
  clients: number;
  clients_wifi24: number;
  clients_wifi5: number;
  clients_other: number;
  is_gateway: boolean;
  addresses: IPAddress[];
  gateway_nexthop: NodeId;
  gateway: NodeId;
  gateway6: string; // mac address for some reason
  autoupdater: Autoupdater;
}

function showBar(value: string, width: number, warning: boolean) {
  return h("span", { props: { className: "bar" + (warning ? " warning" : "") } }, [
    h("span", {
      style: { width: width * 100 + "%" },
    }),
    h("label", value),
  ]);
}

const self = {
  showStatus(node: Node) {
    return h(
      "td",
      { props: { className: node.is_online ? "online" : "offline" } },
      _.t(node.is_online ? "node.lastOnline" : "node.lastOffline", {
        time: node.lastseen.fromNow(),
        date: node.lastseen.format("DD.MM.YYYY, H:mm:ss"),
      }),
    );
  },

  showGeoURI(data: Node) {
    if (!helper.hasLocation(data)) {
      return undefined;
    }

    return h(
      "td",
      h(
        "a",
        { props: { href: "geo:" + data.location.latitude + "," + data.location.longitude } },
        Number(data.location.latitude.toFixed(6)) + ", " + Number(data.location.longitude.toFixed(6)),
      ),
    );
  },

  showGateway(node: Node) {
    return node.is_gateway ? _.t("yes") : undefined;
  },

  showFirmware(node: Node) {
    return (
      [helper.dictGet(node, ["firmware", "release"]), helper.dictGet(node, ["firmware", "base"])]
        .filter(function (value) {
          return value !== null;
        })
        .join(" / ") || undefined
    );
  },

  showUptime(node: Node) {
    return moment.utc(node.uptime).local().fromNow(true);
  },

  showFirstSeen(node: Node) {
    return moment.utc(node.firstseen).local().fromNow();
  },

  showLoad(node: Node) {
    return showBar(node.loadavg.toFixed(2), node.loadavg / (node.nproc || 1), node.loadavg >= node.nproc);
  },

  showRAM(node: Node) {
    return showBar(Math.round(node.memory_usage * 100) + " %", node.memory_usage, node.memory_usage >= 0.8);
  },

  showDomain(node: Node) {
    let domainTitle = node.domain;
    const config = window.config;
    if (config.domainNames) {
      config.domainNames.some(function (domain) {
        if (domainTitle === domain.domain) {
          domainTitle = domain.name;
          return true;
        }
        return false;
      });
    }
    return domainTitle;
  },

  countLocalClients(node: Node, visited: Record<string, number> = {}) {
    if (node.node_id in visited) return 0;
    visited[node.node_id] = 1;
    let count = node.clients || 0;
    node.neighbours.forEach(function (neighbour) {
      if (neighbour.link.type === "vpn") return;
      count += self.countLocalClients(neighbour.node, visited);
    });
    return count;
  },

  showClients(node: Node) {
    if (!node.is_online) {
      return undefined;
    }
    const localClients = self.countLocalClients(node);

    const clients = [
      h("span", [
        node.clients > 0 ? node.clients : _.t("none"),
        h("br"),
        h("i", { props: { className: "ion-people", title: _.t("node.clients") } }),
      ]),
      h("span", { props: { className: "legend-24ghz" } }, [
        node.clients_wifi24,
        h("br"),
        h("span", { props: { className: "symbol", title: "2,4 GHz" } }),
      ]),
      h("span", { props: { className: "legend-5ghz" } }, [
        node.clients_wifi5,
        h("br"),
        h("span", { props: { className: "symbol", title: "5 GHz" } }),
      ]),
      h("span", { props: { className: "legend-others" } }, [
        node.clients_other,
        h("br"),
        h("span", { props: { className: "symbol", title: _.t("others") } }),
      ]),
      h("span", [
        localClients > 0 ? localClients : _.t("none"),
        h("br"),
        h("i", { props: { className: "ion-share-alt", title: _.t("node.localClients") } }),
      ]),
    ];
    return h("td", { props: { className: "clients" } }, clients);
  },

  showIPs(node: Node) {
    const parts: (VNode | string)[] = [];
    const ips = node.addresses;
    ips.sort();
    ips.forEach(function (ip, i) {
      if (i > 0) {
        parts.push(h("br"));
      }

      if (ip.indexOf("fe80:") !== 0) {
        parts.push(h("a", { props: { href: "http://[" + ip + "]/", target: "_blank" } }, ip));
      } else {
        parts.push(ip);
      }
    });
    return h("td", parts);
  },

  showAutoupdate(node: Node) {
    return node.autoupdater.enabled
      ? _.t("node.activated", { branch: node.autoupdater.branch })
      : _.t("node.deactivated");
  },
};

export default self;
