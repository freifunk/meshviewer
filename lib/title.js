export const Title = function () {
  function setTitle(addedTitle) {
    var title = [config.siteName];

    if (addedTitle !== undefined) {
      title.unshift(addedTitle);
    }

    document.title = title.join(" - ");
  }

  this.resetView = function resetView() {
    setTitle();
  };

  this.gotoNode = function gotoNode(node) {
    setTitle(node.hostname);
  };

  this.gotoLink = function gotoLink(link) {
    setTitle(link[0].source.hostname + " \u21D4 " + link[0].target.hostname);
  };

  this.gotoLocation = function gotoLocation() {
    // ignore
  };

  this.destroy = function destroy() {};

  return this;
};
