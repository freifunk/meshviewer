import { FilterMethod, ObjectsLinksAndNodes } from "../datadistributor.js";

export const NodeFilter = function (filter: FilterMethod) {
  return function (data: ObjectsLinksAndNodes) {
    let node: ObjectsLinksAndNodes = Object.create(data);
    node.nodes = { all: [], lost: [], new: [], offline: [], online: [] };

    const nodeKeys: (keyof import("../datadistributor.js").NodesByState)[] = [
      "all",
      "lost",
      "new",
      "offline",
      "online",
    ];
    for (const key of nodeKeys) {
      node.nodes[key] = data.nodes[key].filter(filter);
    }

    node.links = data.links.filter(function (d) {
      return filter(d.source) && filter(d.target);
    });

    return node;
  };
};
