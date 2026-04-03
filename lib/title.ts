import { Link, Node, NodeId } from "./utils/node.js";
import { Target } from "./utils/router.js";

export const Title = function (): Target & { destroy: () => void } {
  function setTitle(addedTitle?: string) {
    const config = window.config;
    const title = [config.siteName];

    if (addedTitle !== undefined) {
      title.unshift(addedTitle);
    }

    document.title = title.join(" - ");
  }

  return {
    resetView() {
      setTitle();
    },

    gotoNode(node: Node, _nodeDict: { [k: NodeId]: Node }) {
      setTitle(node.hostname);
    },

    gotoLink(link: Link[]) {
      setTitle(link[0].source.hostname + " \u21D4 " + link[0].target.hostname);
    },

    gotoLocation() {
      // ignore
    },

    destroy() {},
  };
};
