import V from "snabbdom/dist/snabbdom-patch";

import * as helper from "../utils/helper";

function showStatImg(img, linkInfo, link, time) {
  var subst = {
    "{SOURCE_ID}": link.source.node_id,
    "{SOURCE_NAME}": link.source.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{SOURCE_ADDR}": link.source_addr,
    "{SOURCE_MAC}": link.source_mac ? link.source_mac : link.source_addr,
    "{TARGET_ID}": link.target.node_id,
    "{TARGET_NAME}": link.target.hostname.replace(/[^a-z0-9\-]/gi, "_"),
    "{TARGET_ADDR}": link.target_addr,
    "{TARGET_MAC}": link.target_mac ? link.target_mac : link.target_addr,
    "{TYPE}": link.type,
    "{TIME}": time,
    "{LOCALE}": _.locale(),
  };

  img.push(V.h("h4", helper.listReplace(linkInfo.name, subst)));
  img.push(helper.showStat(V, linkInfo, subst));
}

export const Link = function (el, linkData, linkScale) {
  var self = this;
  var header = document.createElement("div");
  var table = document.createElement("table");
  var images = document.createElement("div");
  el.appendChild(header);
  el.appendChild(table);
  el.appendChild(images);

  self.render = function render() {
    var children = [];
    var img = [];
    var time = linkData[0].target.lastseen.format("DDMMYYYYHmmss");

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

    var elNew = V.h("table", children);
    table = V.patch(table, elNew);
    table.elm.classList.add("attributes");
    images = V.patch(images, V.h("div", img));
  };

  self.setData = function setData(data) {
    linkData = data.links.filter(function (link) {
      return link.id === linkData[0].id;
    });
    self.render();
  };
  return self;
};
