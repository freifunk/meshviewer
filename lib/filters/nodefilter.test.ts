import { describe, expect, it } from "vitest";
import moment from "moment";
import { NodeFilter } from "./nodefilter.js";
import { ObjectsLinksAndNodes } from "../datadistributor.js";
import { Node, Link } from "../utils/node.js";

describe("NodeFilter", () => {
  const createMockNode = (id: string, name: string): Node =>
    ({
      node_id: id,
      hostname: name,
    }) as any;

  const nodeA = createMockNode("a", "Router-A");
  const nodeB = createMockNode("b", "Router-B");
  const nodeC = createMockNode("c", "Switch-C");

  const linkAB: Link = {
    id: "ab",
    source: nodeA,
    target: nodeB,
    type: "wifi",
  } as any;

  const linkAC: Link = {
    id: "ac",
    source: nodeA,
    target: nodeC,
    type: "wifi",
  } as any;

  const mockData: ObjectsLinksAndNodes = {
    nodes: {
      all: [nodeA, nodeB, nodeC],
      online: [nodeA, nodeB],
      offline: [nodeC],
      new: [nodeA],
      lost: [],
    },
    links: [linkAB, linkAC],
    now: moment(),
  };

  it("filters all node groups using the filter predicate", () => {
    // Filter only routers starting with "Router"
    const filterFn = (n: Node) => n.hostname.startsWith("Router");
    const filter = NodeFilter(filterFn);

    const result = filter(mockData);

    expect(result.nodes.all).toEqual([nodeA, nodeB]);
    expect(result.nodes.online).toEqual([nodeA, nodeB]);
    expect(result.nodes.offline).toEqual([]);
    expect(result.nodes.new).toEqual([nodeA]);
    expect(result.nodes.lost).toEqual([]);
  });

  it("filters links requiring both source and target to match", () => {
    const filterFn = (n: Node) => n.hostname.startsWith("Router");
    const filter = NodeFilter(filterFn);

    const result = filter(mockData);

    // linkAB has both Router-A and Router-B -> kept
    // linkAC has Router-A and Switch-C -> dropped because Switch-C doesn't match
    expect(result.links).toEqual([linkAB]);
  });
});
