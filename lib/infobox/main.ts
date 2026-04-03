import { _ } from "../utils/language.js";
import { Link as LinkView } from "./link.js";
import { Node as NodeView } from "./node.js";
import { location } from "./location.js";
import { Link as LinkData, Node as NodeData, NodeId } from "../utils/node.js";
import { Sidebar } from "../sidebar.js";
import { TargetLocation } from "../utils/router.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";
import { Target } from "../utils/router.js";

type InfoboxPanel = {
  render: () => void;
  setData: (data: ObjectsLinksAndNodes) => void;
};

export const Main = function (
  sidebar: ReturnType<typeof Sidebar>,
  linkScale: (t: any) => any,
): Target & { setData: (nodeOrLinkData: ObjectsLinksAndNodes) => void } {
  let el: HTMLDivElement | undefined;
  let node: InfoboxPanel | undefined;
  let link: InfoboxPanel | undefined;

  function destroy() {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      node = undefined;
      link = undefined;
      el = undefined;
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
    // @ts-expect-error destroy hook for legacy code
    el.destroy = destroy;

    const router = window.router;
    const closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.classList.add("ion-close");
    closeButton.setAttribute("aria-label", _.t("close"));
    closeButton.onclick = function () {
      router.fullUrl();
    };
    el.appendChild(closeButton);
  }

  return {
    resetView: destroy,

    gotoNode(nodeData: NodeData, nodeDict: { [k: NodeId]: NodeData }) {
      create();
      node = NodeView(el!, nodeData, linkScale, nodeDict) as unknown as InfoboxPanel;
      node.render();
    },

    gotoLink(linkData: LinkData[]) {
      create();
      link = LinkView(el!, linkData, linkScale) as unknown as InfoboxPanel;
      link.render();
    },

    gotoLocation(locationData: TargetLocation) {
      create();
      location(el!, locationData);
    },

    setData(nodeOrLinkData: ObjectsLinksAndNodes) {
      if (node) {
        node.setData(nodeOrLinkData);
      }
      if (link) {
        link.setData(nodeOrLinkData);
      }
    },
  };
};
