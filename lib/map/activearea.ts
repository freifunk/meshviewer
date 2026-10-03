/**
 * https://github.com/Mappy/Leaflet-active-area
 * Apache 2.0 license https://www.apache.org/licenses/LICENSE-2.0
 */
import L from "leaflet";
import { getLayerMaxZoom } from "../utils/mapUtils.js";

declare module "leaflet" {
  interface Map {
    _viewport?: HTMLElement;
    _zoom?: number;
    _limitZoom(zoom: number): number;
    getViewport(): HTMLElement | undefined;
    getViewportBounds(): L.Bounds;
    getViewportLatLngBounds(): L.LatLngBounds;
    getOffset(): L.Point;
    setActiveArea(css: string | Record<string, string | number>, keepCenter?: boolean, animate?: boolean): this;
    getCenter(withoutViewport?: boolean | unknown): L.LatLng;
  }
}

const previousMethods = {
  getCenter: L.Map.prototype.getCenter,
  setView: L.Map.prototype.setView,
  setZoomAround: (L.Map.prototype as unknown as { setZoomAround: typeof L.Map.prototype.setZoomAround }).setZoomAround,
  getBoundsZoom: L.Map.prototype.getBoundsZoom,
  RendererUpdate: (L.Renderer.prototype as unknown as { _update: () => void })._update,
};

(L.Map as unknown as { include: (methods: Record<string, unknown>) => void }).include({
  getBounds: function (this: L.Map) {
    if (this._viewport) {
      return this.getViewportLatLngBounds();
    }
    const bounds = this.getPixelBounds();
    const sw = this.unproject(bounds.getBottomLeft());
    const ne = this.unproject(bounds.getTopRight());

    return new L.LatLngBounds(sw, ne);
  },

  getViewport: function (this: L.Map) {
    return this._viewport;
  },

  getViewportBounds: function (this: L.Map) {
    let viewport = this._viewport;
    if (!viewport) {
      viewport = this.getContainer();
    }
    let topleft = viewport ? L.point(viewport.offsetLeft, viewport.offsetTop) : L.point(0, 0);
    let vpsize = viewport ? L.point(viewport.clientWidth, viewport.clientHeight) : L.point(0, 0);

    if (vpsize.x === 0 || vpsize.y === 0) {
      // Our own viewport has no good size - so we fall back to the container size:
      viewport = this.getContainer();
      if (viewport) {
        topleft = L.point(0, 0);
        vpsize = L.point(viewport.clientWidth, viewport.clientHeight);
      }
    }

    return L.bounds(topleft, topleft.add(vpsize));
  },

  getViewportLatLngBounds: function (this: L.Map) {
    const bounds = this.getViewportBounds();
    const min = bounds.min ?? L.point(0, 0);
    const max = bounds.max ?? L.point(0, 0);
    return L.latLngBounds(this.containerPointToLatLng(min), this.containerPointToLatLng(max));
  },

  getOffset: function (this: L.Map) {
    const mCenter = this.getSize().divideBy(2);
    const vCenter = this.getViewportBounds().getCenter();

    return mCenter.subtract(vCenter);
  },

  getCenter: function (this: L.Map, withoutViewport?: boolean) {
    let center = previousMethods.getCenter.call(this);

    if (this.getViewport() && !withoutViewport) {
      const zoom = this.getZoom();
      let point = this.project(center, zoom);
      point = point.subtract(this.getOffset());

      center = this.unproject(point, zoom);
    }

    return center;
  },

  setView: function (this: L.Map, center: L.LatLngExpression, zoom?: number, options?: L.ZoomPanOptions) {
    center = L.latLng(center);
    zoom = zoom === undefined ? this.getZoom() : this._limitZoom(zoom);

    if (this.getViewport()) {
      let point = this.project(center, this._limitZoom(zoom));
      point = point.add(this.getOffset());
      center = this.unproject(point, this._limitZoom(zoom));
    }

    return previousMethods.setView.call(this, center, zoom, options);
  },

  setZoomAround: function (this: L.Map, latlng: L.LatLngExpression | L.Point, zoom: number, options?: L.ZoomOptions) {
    const viewport = this.getViewport();

    if (viewport) {
      const scale = this.getZoomScale(zoom);
      const viewHalf = this.getViewportBounds().getCenter();
      const containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng);

      const centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale);
      const newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

      return this.setView(newCenter, zoom, { zoom: options } as L.ZoomPanOptions);
    }
    return previousMethods.setZoomAround.call(this, latlng, zoom, options);
  },

  getBoundsZoom: function (
    this: L.Map,
    bounds: L.LatLngBoundsExpression,
    inside?: boolean,
    padding?: L.PointExpression,
  ) {
    bounds = L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    padding = L.point(padding || [0, 0]);

    let zoom = this.getZoom() || 0;
    const min = this.getMinZoom();
    const max = this.getMaxZoom();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();
    const viewport = this.getViewport();
    const size = (viewport ? L.point(viewport.clientWidth, viewport.clientHeight) : this.getSize()).subtract(padding);
    const boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom));
    const snap = L.Browser.any3d ? this.options.zoomSnap : 1;

    const scale = Math.min(size.x / boundsSize.x, size.y / boundsSize.y);

    zoom = this.getScaleZoom(scale, zoom);

    if (snap) {
      zoom = Math.round(zoom / (snap / 100)) * (snap / 100);
      zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
    }

    return Math.max(min, Math.min(max, zoom));
  },

  setActiveArea: function (
    this: L.Map,
    css: string | Record<string, string | number>,
    keepCenter?: boolean,
    animate?: boolean,
  ) {
    let center;
    if (keepCenter && this.getZoom()) {
      center = this.getCenter();
    }

    if (!this._viewport) {
      const container = this.getContainer();
      this._viewport = L.DomUtil.create("div", "");
      container.insertBefore(this._viewport, container.firstChild);
    }

    if (typeof css === "string") {
      this._viewport.className = css;
    } else {
      L.extend(this._viewport.style, css);
    }

    if (center) {
      this.setView(center, this.getZoom(), { animate: !!animate });
    }
    return this;
  },
});

(L.Renderer as unknown as { include: (methods: Record<string, unknown>) => void }).include({
  _onZoom: function (this: any) {
    this._updateTransform(this._map.getCenter(true), this._map.getZoom());
  },

  _update: function (this: any) {
    previousMethods.RendererUpdate.call(this);
    this._center = this._map.getCenter(true);
  },
});

(L.GridLayer as unknown as { include: (methods: Record<string, unknown>) => void }).include({
  _updateLevels: function (this: any) {
    const zoom = this._tileZoom;
    const maxZoom = getLayerMaxZoom(this, this._map);

    if (zoom === undefined) {
      return undefined;
    }

    for (const zoomLevel in this._levels) {
      const levelObj = this._levels[zoomLevel];
      if (levelObj?.el && (levelObj.el.children.length || zoomLevel === String(zoom))) {
        levelObj.el.style.zIndex = String(maxZoom - Math.abs(zoom - Number(zoomLevel)));
      } else if (levelObj?.el) {
        L.DomUtil.remove(levelObj.el);
        this._removeTilesAtZoom(zoomLevel);
        delete this._levels[zoomLevel];
      }
    }

    let level = this._levels[zoom];
    const map = this._map;

    if (!level) {
      level = this._levels[zoom] = {
        el: L.DomUtil.create("div", "leaflet-tile-container leaflet-zoom-animated", this._container),
      };

      level.el.style.zIndex = String(maxZoom);
      level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
      level.zoom = zoom;

      this._setZoomTransform(level, map.getCenter(true), map.getZoom());

      void level.el.offsetWidth;
    }

    this._level = level;

    return level;
  },

  _resetView: function (this: any, e: { pinch?: boolean; flyTo?: boolean }) {
    const animating = e && (e.pinch || e.flyTo);
    this._setView(this._map.getCenter(true), this._map.getZoom(), animating, animating);
  },

  _update: function (this: any, center?: L.LatLng) {
    const map = this._map;
    if (!map) {
      return;
    }
    const zoom = map.getZoom();

    if (center === undefined) {
      center = map.getCenter(this);
    }
    if (this._tileZoom === undefined) {
      return;
    }

    const pixelBounds = this._getTiledPixelBounds(center);
    const tileRange = this._pxBoundsToTileRange(pixelBounds);
    if (!tileRange.min || !tileRange.max) {
      return;
    }
    const tileCenter = tileRange.getCenter();
    const queue: L.Coords[] = [];

    for (const key in this._tiles) {
      if (this._tiles[key]) {
        this._tiles[key].current = false;
      }
    }

    if (Math.abs(zoom - this._tileZoom) > 1) {
      this._setView(center, zoom);
      return;
    }

    for (let j = tileRange.min.y; j <= tileRange.max.y; j++) {
      for (let i = tileRange.min.x; i <= tileRange.max.x; i++) {
        const coords = new L.Point(i, j) as L.Coords;
        coords.z = this._tileZoom;

        if (!this._isValidTile(coords)) {
          continue;
        }

        const tile = this._tiles[this._tileCoordsToKey(coords)];
        if (tile) {
          tile.current = true;
        } else {
          queue.push(coords);
        }
      }
    }

    queue.sort(function (a, b) {
      return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
    });

    if (queue.length !== 0) {
      if (!this._loading) {
        this._loading = true;
        this.fire("loading");
      }

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < queue.length; i++) {
        this._addTile(queue[i]!, fragment);
      }

      this._level.el.appendChild(fragment);
    }
  },
});
