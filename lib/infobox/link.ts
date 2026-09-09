import { classModule, eventListenersModule, h, init, propsModule, styleModule, VNode } from "snabbdom";
import { _ } from "../utils/language.js";
import * as helper from "../utils/helper.js";
import { LinkInfo } from "../config_default.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";
import { Link as LinkData } from "../utils/node.js";
import { createChartVNode } from "./chart.js";

const patch = init([classModule, propsModule, styleModule, eventListenersModule]);

function showStatImg(images: VNode[], linkInfo: LinkInfo, link: LinkData, time: string) {
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

  images.push(h("h4", helper.listReplace(linkInfo.name, subst)));
  images.push(helper.showStat(linkInfo, subst));
}

export const Link = function (el: HTMLElement, linkData: [LinkData, ...LinkData[]], linkScale: (t: any) => any) {
  let container = document.createElement("div");
  el.appendChild(container);
  let containerVnode: VNode | undefined;

  const self = {
    render() {
      let config = window.config;
      let router = window.router;
      let children: VNode[] = [];
      let img: VNode[] = [];
      let time = linkData[0].target.lastseen.format("DDMMYYYYHmmss");

      helper.attributeEntry(
        children,
        "node.hardware",
        (linkData[0].source.model ? linkData[0].source.model + " – " : "") +
          (linkData[0].target.model ? linkData[0].target.model : ""),
      );
      helper.attributeEntry(children, "node.distance", helper.showDistance(linkData[0]));

      linkData.forEach(function (link) {
        children.push(
          h("tr", { props: { className: "header" } }, [h("th", _.t("node.connectionType")), h("th", link.type)]),
        );
        helper.attributeEntry(
          children,
          (link.source_tp ?? 0) > 0 || (link.target_tp ?? 0) > 0 ? "node.throughput" : "node.tq",
          h(
            "span",
            {
              style: {
                color: linkScale(
                  ((helper.linkMetric(link.source_tq, link.source_tp) ?? 0) +
                    (helper.linkMetric(link.target_tq, link.target_tp) ?? 0)) /
                    2,
                ),
              },
            },
            helper.showBiDiLinkMetric(link.source_tq, link.source_tp, link.target_tq, link.target_tp),
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

      let newContainer = h("div", [
        h(
          "div",
          h("h2", [
            h(
              "a",
              {
                props: { href: router.generateLink({ node: linkData[0].source.node_id }) },
              },
              linkData[0].source.hostname,
            ),
            h("span", " - "),
            h(
              "a",
              {
                props: { href: router.generateLink({ node: linkData[0].target.node_id }) },
              },
              linkData[0].target.hostname,
            ),
          ]),
        ),
        h("table", { props: { className: "attributes" } }, children),
        h("div", img),
      ]);

      // Charts
      if (config.linkCharts.length) {
        const charts = config.linkCharts.flatMap((chart) => [
          h("h4", chart.name),
          createChartVNode(chart, {
            source: linkData[0].source.node_id,
            target: linkData[0].target.node_id,
          }),
        ]);
        newContainer.children!.push(h("div", charts));
      }

      containerVnode = patch(containerVnode ?? container, newContainer);
    },

    setData(data: ObjectsLinksAndNodes) {
      const filtered = data.links.filter(function (link) {
        return link.id === linkData[0].id;
      });
      const [first, ...rest] = filtered;
      if (!first) {
        return;
      }
      linkData = [first, ...rest];
      self.render();
    },
  };

  return self;
};
