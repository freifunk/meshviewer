export const NodeFilter = function (filter) {
  return function (data) {
    var node = Object.create(data);
    node.nodes = {};

    for (var key in data.nodes) {
      if (data.nodes.hasOwnProperty(key)) {
        node.nodes[key] = data.nodes[key].filter(filter);
      }
    }

    node.links = data.links.filter(function (d) {
      return filter(d.source) && filter(d.target);
    });

    return node;
  };
};
