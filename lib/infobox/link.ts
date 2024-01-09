import { snabbdomBundle as V } from "snabbdom/snabbdom.bundle";
import { _ } from "../utils/language";
import * as helper from "../utils/helper";
import { LinkInfo } from "../config_default";
import { Link as LinkData } from "../utils/node";

function showStatImg(images: HTMLElement[], linkInfo: LinkInfo, link: LinkData, time: string) {
  let subst: ReplaceMapping = {
    "{SOURCE_ID}": link.source.node_id,
    "{SOURCE_NAME}": link.source.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{SOURCE_ADDR}": link.source_addr,
    "{SOURCE_MAC}": link.source_mac ? link.source_mac : link.source_addr,
    "{TARGET_ID}": link.target.node_id,
    "{TARGET_NAME}": link.target.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{TARGET_ADDR}": link.target_addr,
    "{TARGET_MAC}": link.target_mac ? link.target_mac : link.target_addr,
    "{TYPE}": link.type,
    "{TIME}": time, // numeric datetime
    "{LOCALE}": _.locale(),
  };

  images.push(V.h("h4", helper.listReplace(linkInfo.name, subst)));
  images.push(helper.showStat(V, linkInfo, subst));
}

export const Link = function (el: HTMLElement, linkData: LinkData[], linkScale: (t: any) => any) {
  const self = {
    render: undefined,
    setData: undefined,
  };
  let header = document.createElement("div");
  let table = document.createElement("table");
  let images = document.createElement("div");
  el.appendChild(header);
  el.appendChild(table);
  el.appendChild(images);

  self.render = function render() {
    let config = window.config;
    let router = window.router;
    let children = [];
    let img = [];
    let time = linkData[0].target.lastseen.format("DDMMYYYYHmmss");

    header = V.patch(
      header,
      V.h(
        "div",
        V.h("h2", [
          V.h(
            "a",
            {
              props: { href: router.generateLink({ node: linkData[0].source.node_id }) },
            },
            linkData[0].source.hostname,
          ),
          V.h("span", " - "),
          V.h(
            "a",
            {
              props: { href: router.generateLink({ node: linkData[0].target.node_id }) },
            },
            linkData[0].target.hostname,
          ),
        ]),
      ),
    );

    helper.attributeEntry(
      V,
      children,
      "node.hardware",
      (linkData[0].source.model ? linkData[0].source.model + " – " : "") +
        (linkData[0].target.model ? linkData[0].target.model : ""),
    );
    helper.attributeEntry(V, children, "node.distance", helper.showDistance(linkData[0]));

    linkData.forEach(function (link) {
      children.push(
        V.h("tr", { props: { className: "header" } }, [V.h("th", _.t("node.connectionType")), V.h("th", link.type)]),
      );
      helper.attributeEntry(
        V,
        children,
        "node.tq",
        V.h(
          "span",
          { style: { color: linkScale((link.source_tq + link.target_tq) / 2) } },
          helper.showTq(link.source_tq) + " - " + helper.showTq(link.target_tq),
        ),
      );

      if (config.linkTypeInfos) {
        config.linkTypeInfos.forEach(function (linkTypeInfo) {
          showStatImg(img, linkTypeInfo, link, time);
        });
      }
    });

    if (config.linkInfos) {
      config.linkInfos.forEach(function (linkInfo) {
        showStatImg(img, linkInfo, linkData[0], time);
      });
    }

    let elNew = V.h("table", children);
    let pTable = (table = V.patch(table, elNew));
    pTable.elm.classList.add("attributes");
    images = V.patch(images, V.h("div", img));
  };

  self.setData = function setData(data: { links: LinkData[] }) {
    linkData = data.links.filter(function (link) {
      return link.id === linkData[0].id;
    });
    self.render();
  };
  return self;
};
