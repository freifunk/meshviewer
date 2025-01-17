import { Link, Node } from "./utils/node.js";

export const Title = function () {
  const self = {
    resetView: undefined,
    gotoNode: undefined,
    gotoLink: undefined,
    gotoLocation: undefined,
    destroy: undefined,
  };

  function setTitle(addedTitle?: string) {
    let config = window.config;
    let title = [config.siteName];

    if (addedTitle !== undefined) {
      title.unshift(addedTitle);
    }

    document.title = title.join(" - ");
  }

  self.resetView = function resetView() {
    setTitle();
  };

  self.gotoNode = function gotoNode(node: Node) {
    setTitle(node.hostname);
  };

  self.gotoLink = function gotoLink(link: Link[]) {
    setTitle(link[0].source.hostname + " \u21D4 " + link[0].target.hostname);
  };

  self.gotoLocation = function gotoLocation() {
    // ignore
  };

  self.destroy = function destroy() {};

  return self;
};
