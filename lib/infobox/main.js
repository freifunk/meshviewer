import { Link } from "./link";
import { Node } from "./node";
import { location } from "./location";

export const Main = function (sidebar, linkScale) {
  var self = this;
  var el;
  var node;
  var link;

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
    el.destroy = destroy;

    var closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.classList.add("ion-close");
    closeButton.setAttribute("aria-label", _.t("close"));
    closeButton.onclick = function () {
      router.fullUrl();
    };
    el.appendChild(closeButton);
  }

  self.resetView = destroy;

  self.gotoNode = function gotoNode(nodeData, nodeDict) {
    create();
    node = new Node(el, nodeData, linkScale, nodeDict);
    node.render();
  };

  self.gotoLink = function gotoLink(linkData) {
    create();
    link = new Link(el, linkData, linkScale);
    link.render();
  };

  self.gotoLocation = function gotoLocation(locationData) {
    create();
    location(el, locationData);
  };

  self.setData = function setData(nodeOrLinkData) {
    if (typeof node === "object") {
      node.setData(nodeOrLinkData);
    }
    if (typeof link === "object") {
      link.setData(nodeOrLinkData);
    }
  };

  return self;
};
