export interface MeshviewerRouteData {
  lang?: string;
  view?: string;
  node?: string;
  link?: string;
  zoom?: string;
  lat?: string;
  lng?: string;
}

const NODE_ID_ROUTE_PART = "[A-Za-z\\d.]+";
const LINK_ID_ROUTE_PART = `${NODE_ID_ROUTE_PART}-${NODE_ID_ROUTE_PART}`;

export const MESHVIEWER_ROUTE_PATTERN = new RegExp(
  `^\\/?(\\w{2})?\\/?(map|graph)?(?:\\/(?:(${NODE_ID_ROUTE_PART})|(${LINK_ID_ROUTE_PART})|(?:(\\d+)\\/(-?[\\d.]+)\\/(-?[\\d.]+))))?\\/?(?:\\?.*)?$`,
);

export function matchMeshviewerRoute(path: string): MeshviewerRouteData | null {
  const match = path.match(MESHVIEWER_ROUTE_PATTERN);

  if (!match) {
    return null;
  }

  return {
    lang: match[1],
    view: match[2],
    node: match[3],
    link: match[4],
    zoom: match[5],
    lat: match[6],
    lng: match[7],
  };
}
