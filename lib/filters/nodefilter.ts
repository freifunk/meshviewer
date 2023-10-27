import { FilterMethod, ObjectsLinksAndNodes } from "../datadistributor";

export const NodeFilter = function (filter: FilterMethod) {
  return function (data: ObjectsLinksAndNodes) {
    let node: ObjectsLinksAndNodes = Object.create(data);
    node.nodes = { all: [], lost: [], new: [], offline: [], online: [] };

    for (let key in data.nodes) {
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
