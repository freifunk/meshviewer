export interface LinkWithEndpointIds<TNode> {
  source: string | TNode;
  target: string | TNode;
}

export function resolveValidLinks<TNode extends { node_id: string }, TLink extends LinkWithEndpointIds<TNode>>(
  links: TLink[],
  nodeDict: Record<string, TNode>,
): Array<TLink & { source: TNode; target: TNode }> {
  let validLinks: Array<TLink & { source: TNode; target: TNode }> = [];

  links.forEach(function (link) {
    const sourceId = typeof link.source === "string" ? link.source : link.source.node_id;
    const targetId = typeof link.target === "string" ? link.target : link.target.node_id;
    const source = nodeDict[sourceId];
    const target = nodeDict[targetId];

    if (!source || !target) {
      return;
    }

    const resolvedLink = link as TLink & { source: TNode; target: TNode };
    resolvedLink.source = source;
    resolvedLink.target = target;
    validLinks.push(resolvedLink);
  });

  return validLinks;
}
