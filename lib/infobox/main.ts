import { _ } from "../utils/language";
import { Link } from "./link";
import { Node } from "./node";
import { location } from "./location";
import { Link as LinkData, Node as NodeData, NodeId } from "../utils/node";
import { Sidebar } from "../sidebar";
import { TargetLocation } from "../utils/router";
import { ObjectsLinksAndNodes } from "../datadistributor";

export const Main = function (sidebar: ReturnType<typeof Sidebar>, linkScale: (t: any) => any) {
  const self = {
    resetView: undefined,
    gotoNode: undefined,
    gotoLink: undefined,
    gotoLocation: undefined,
    setData: undefined,
  };
  let el: HTMLDivElement;
  let node: ReturnType<typeof Node>;
  let link: ReturnType<typeof Link>;

  function destroy() {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      node = link = el = undefined;
      sidebar.reveal();
    }
  }

  function create() {
    destroy();
    sidebar.ensureVisible();
    sidebar.hide();

    el = document.createElement("div");
    sidebar.container.children[1].appendChild(el);

    el.scrollIntoView(false);
    el.classList.add("infobox");
    // @ts-ignore
    el.destroy = destroy;

    let router = window.router;
    let closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.classList.add("ion-close");
    closeButton.setAttribute("aria-label", _.t("close"));
    closeButton.onclick = function () {
      router.fullUrl();
    };
    el.appendChild(closeButton);
  }

  self.resetView = destroy;

  self.gotoNode = function gotoNode(nodeData: NodeData, nodeDict: { [k: NodeId]: NodeData }) {
    create();
    node = Node(el, nodeData, linkScale, nodeDict);
    node.render();
  };

  self.gotoLink = function gotoLink(linkData: LinkData[]) {
    create();
    link = Link(el, linkData, linkScale);
    link.render();
  };

  self.gotoLocation = function gotoLocation(locationData: TargetLocation) {
    create();
    location(el, locationData);
  };

  self.setData = function setData(nodeOrLinkData: ObjectsLinksAndNodes) {
    if (typeof node === "object") {
      node.setData(nodeOrLinkData);
    }
    if (typeof link === "object") {
      link.setData(nodeOrLinkData);
    }
  };

  return self;
};
