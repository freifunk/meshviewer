import * as L from "leaflet";

import { ClientLayer } from "./map/clientlayer.js";
import { LabelLayer } from "./map/labellayer.js";
import { Button } from "./map/button.js";
import { loadMaplibreGL } from "./map/maplibre-layer.js";
import "./map/activearea.js";
import { Sidebar } from "./sidebar.js";
import { LatLng } from "leaflet";
import { Geo } from "./config_default.js";
import { Link, LinkId, Node, NodeId } from "./utils/node.js";
import { ObjectsLinksAndNodes } from "./datadistributor.js";

let options = {
  worldCopyJump: true,
  zoomControl: true,
  minZoom: 0,
};

export const Map = async function (
  linkScale: (t: any) => any,
  sidebar: ReturnType<typeof Sidebar>,
  buttons: HTMLElement,
) {
  const self: {
    setData: (data: ObjectsLinksAndNodes) => void;
    resetView: () => void;
    gotoNode: (node: Node, nodeDict: { [k: NodeId]: Node }) => void;
    gotoLink: (link: [Link, ...Link[]]) => void;
    gotoLocation: (destination: L.LatLngLiteral & { zoom: number }) => void;
    destroy: () => void;
    render: (d: HTMLElement) => void;
  } = {
    setData: () => {},
    resetView: () => {},
    gotoNode: (_n, _d) => {},
    gotoLink: () => {},
    gotoLocation: () => {},
    destroy: () => {},
    render: () => {},
  };
  let savedView: { center: LatLng; zoom: number } | undefined;
  let config = window.config;

  let map: L.Map & { setActiveArea?: any };
  let layerControl: L.Control.Layers;
  let baseLayers: Record<string, L.Layer> = {};

  function saveView() {
    savedView = {
      center: map.getCenter(),
      zoom: map.getZoom(),
    };
  }

  function contextMenuOpenLayerMenu() {
    document.querySelector(".leaflet-control-layers")!.classList.add("leaflet-control-layers-expanded");
  }

  function mapActiveArea() {
    map.setActiveArea({
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  }

  function setActiveArea() {
    setTimeout(mapActiveArea, 300);
  }

  let el = document.createElement("div");
  el.classList.add("map");

  map = L.map(el, options);
  mapActiveArea();

  let now = new Date();
  config.mapLayers.forEach(function (item, i) {
    if (
      (typeof item.config.start === "number" && item.config.start <= now.getHours()) ||
      (typeof item.config.end === "number" && item.config.end > now.getHours())
    ) {
      item.config.order = (typeof item.config.start === "number" ? item.config.start : (item.config.end ?? i)) * -1;
    } else {
      item.config.order = i;
    }
  });

  config.mapLayers = config.mapLayers.sort(function (a, b) {
    return a.config.order - b.config.order;
  });

  const maplibreGL = config.mapLayers.some((l) => l.type === "vector") ? await loadMaplibreGL() : undefined;

  let layers = config.mapLayers.map(function (layer) {
    return {
      name: layer.name,
      layer:
        layer.type == "vector"
          ? maplibreGL!({
              style: layer.url,
              attributionControl: { customAttribution: layer.config.attribution },
              maxZoom: layer.config.maxZoom,
            })
          : L.tileLayer(
              layer.url.replace(
                "{format}",
                document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0
                  ? "webp"
                  : "png",
              ),
              layer.config,
            ),
    };
  });

  const firstLayer = layers[0];
  if (!firstLayer) {
    throw new Error("config.mapLayers must contain at least one layer");
  }
  map.addLayer(firstLayer.layer);

  layers.forEach(function (layer) {
    baseLayers[layer.name] = layer.layer;
  });

  let button = Button(map, buttons);

  map.on("locationfound", button.locationFound);
  map.on("locationerror", button.locationError);
  map.on("dragend", saveView);
  map.on("contextmenu", contextMenuOpenLayerMenu);

  if (config.geo) {
    [].forEach.call(config.geo, function (geo?: Geo) {
      if (geo) {
        L.geoJSON(geo.json, geo.option).addTo(map);
      }
    });
  }

  button.init();

  layerControl = L.control.layers(baseLayers, undefined, { position: "bottomright" });
  layerControl.addTo(map);

  map.zoomControl.setPosition("topright");

  // @ts-ignore
  let clientLayer = new ClientLayer({ minZoom: config.clientZoom });
  clientLayer.addTo(map);
  clientLayer.setZIndex(5);

  // @ts-ignore
  let labelLayer = new LabelLayer({ minZoom: config.labelZoom });
  labelLayer.addTo(map);
  labelLayer.setZIndex(6);

  sidebar.button.addEventListener("visibility", setActiveArea);

  map.on("zoom", function () {
    clientLayer.redraw();
    labelLayer.redraw();
  });

  map.on("baselayerchange", function (e: any & { name: string }) {
    const selectedLayer = baseLayers[e.name] as L.TileLayer & { options: L.TileLayerOptions & { mode?: string } };
    if (selectedLayer && selectedLayer.options.maxZoom !== undefined) {
      const maxZoom = selectedLayer.options.maxZoom;
      map.options.maxZoom = maxZoom;
      clientLayer.options.maxZoom = maxZoom;
      labelLayer.options.maxZoom = maxZoom;

      if (map.getZoom() > maxZoom) {
        map.setZoom(maxZoom);
      }
    }
  });

  map.on("load", function () {
    let inputs = document.querySelectorAll(".leaflet-control-layers-selector");
    [].forEach.call(inputs, function (input: HTMLInputElement) {
      input.setAttribute("role", "radiogroup");
      // @ts-ignore
      input.setAttribute("aria-label", input.nextSibling.innerHTML.trim());
    });
  });

  let nodeDict: Record<
    string,
    {
      setStyle: (s: any) => void;
      getLatLng: () => L.LatLngExpression;
      getBounds?: () => L.LatLngBoundsExpression;
      resetStyle: () => void;
    }
  > = {};
  let linkDict: Record<
    string,
    {
      setStyle: (s: any) => void;
      getLatLng: () => L.LatLngExpression;
      getBounds?: () => L.LatLngBoundsExpression;
      resetStyle: () => void;
    }
  > = {};
  let highlight: { type: "node"; o: Node } | { type: "link"; o: Link } | undefined;

  function resetMarkerStyles(
    nodes: { [k: NodeId]: { resetStyle: () => any } },
    links: { [k: LinkId]: { resetStyle: () => any } },
  ) {
    Object.values(nodes).forEach(function (entry) {
      entry.resetStyle();
    });

    Object.values(links).forEach(function (entry) {
      entry.resetStyle();
    });
  }

  function setView(bounds: L.LatLngBoundsExpression, zoom?: number) {
    map.fitBounds(bounds, { maxZoom: zoom ? zoom : config.nodeZoom });
  }

  function goto(element: { getLatLng: () => L.LatLngExpression; getBounds?: () => L.LatLngBoundsExpression }) {
    let bounds: L.LatLngBoundsExpression;

    if ("getBounds" in element && typeof element.getBounds === "function") {
      bounds = element.getBounds()!;
    } else {
      bounds = L.latLngBounds([element.getLatLng()]);
    }

    setView(bounds);

    return element;
  }

  function updateView(nopanzoom?: boolean) {
    resetMarkerStyles(nodeDict, linkDict);
    let target:
      | { setStyle: any; getLatLng: () => L.LatLngExpression; getBounds?: () => L.LatLngBoundsExpression }
      | undefined;

    if (highlight !== undefined) {
      if (highlight.type === "node") {
        const candidate = nodeDict[highlight.o.node_id];
        if (candidate) {
          target = candidate;
          target.setStyle(config.map.highlightNode);
        }
      } else if (highlight.type === "link") {
        const candidate = linkDict[highlight.o.id];
        if (candidate) {
          target = candidate;
          target.setStyle(config.map.highlightLink);
        }
      }
    }

    if (!nopanzoom) {
      if (target) {
        goto(target);
      } else if (savedView) {
        map.setView(savedView.center, savedView.zoom);
      } else if (config.fixedCenter) {
        setView(config.fixedCenter);
      }
    }
  }

  self.setData = function setData(data: ObjectsLinksAndNodes) {
    nodeDict = {};
    linkDict = {};

    clientLayer.setData(data);
    labelLayer.setData(data, map, nodeDict, linkDict, linkScale);

    updateView(true);
  };

  self.resetView = function resetView() {
    button.disableTracking();
    highlight = undefined;
    updateView();
  };

  self.gotoNode = function gotoNode(node: Node, _nodeDict: { [k: NodeId]: Node }) {
    button.disableTracking();
    highlight = { type: "node", o: node };
    updateView();
  };

  self.gotoLink = function gotoLink(link: [Link, ...Link[]]) {
    button.disableTracking();
    highlight = { type: "link", o: link[0] };
    updateView();
  };

  self.gotoLocation = function gotoLocation(destination: L.LatLngLiteral & { zoom: number }) {
    button.disableTracking();
    map.setView([destination.lat, destination.lng], destination.zoom);
  };

  self.destroy = function destroy() {
    button.clearButtons();
    sidebar.button.removeEventListener("visibility", setActiveArea);
    map.remove();

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };

  self.render = function render(d: HTMLElement) {
    d.appendChild(el);
    map.invalidateSize();
  };

  return self;
};
