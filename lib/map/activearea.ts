/**
 * https://github.com/Mappy/Leaflet-active-area
 * Apache 2.0 license https://www.apache.org/licenses/LICENSE-2.0
 */
import L from "leaflet";

let previousMethods = {
  getCenter: L.Map.prototype.getCenter,
  setView: L.Map.prototype.setView,
  setZoomAround: (L.Map.prototype as any).setZoomAround,
  getBoundsZoom: L.Map.prototype.getBoundsZoom,
  RendererUpdate: (L.Renderer.prototype as any)._update,
};

(L.Map as any).include({
  getBounds: function (this: any) {
    if (this._viewport) {
      return this.getViewportLatLngBounds();
    }
    let bounds = this.getPixelBounds();
    let sw = this.unproject(bounds.getBottomLeft());
    let ne = this.unproject(bounds.getTopRight());

    return new L.LatLngBounds(sw, ne);
  },

  getViewport: function (this: any) {
    return this._viewport;
  },

  getViewportBounds: function (this: any) {
    let viewport = this._viewport;
    let topleft = L.point(viewport.offsetLeft, viewport.offsetTop);
    let vpsize = L.point(viewport.clientWidth, viewport.clientHeight);

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

  getViewportLatLngBounds: function (this: any) {
    let bounds = this.getViewportBounds();
    return L.latLngBounds(this.containerPointToLatLng(bounds.min), this.containerPointToLatLng(bounds.max));
  },

  getOffset: function (this: any) {
    let mCenter = this.getSize().divideBy(2);
    let vCenter = this.getViewportBounds().getCenter();

    return mCenter.subtract(vCenter);
  },

  getCenter: function (this: any, withoutViewport?: boolean) {
    let center = previousMethods.getCenter.call(this);

    if (this.getViewport() && !withoutViewport) {
      let zoom = this.getZoom();
      let point = this.project(center, zoom);
      point = point.subtract(this.getOffset());

      center = this.unproject(point, zoom);
    }

    return center;
  },

  setView: function (this: any, center: L.LatLngExpression, zoom?: number, options?: L.ZoomPanOptions) {
    center = L.latLng(center);
    zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);

    if (this.getViewport()) {
      let point = this.project(center, this._limitZoom(zoom));
      point = point.add(this.getOffset());
      center = this.unproject(point, this._limitZoom(zoom));
    }

    return previousMethods.setView.call(this, center, zoom, options);
  },

  setZoomAround: function (this: any, latlng: L.LatLngExpression | L.Point, zoom: number, options?: L.ZoomOptions) {
    let viewport = this.getViewport();

    if (viewport) {
      let scale = this.getZoomScale(zoom);
      let viewHalf = this.getViewportBounds().getCenter();
      let containerPoint =
        latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng as L.LatLngExpression);

      let centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale);
      let newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

      return this.setView(newCenter, zoom, { zoom: options } as any);
    }
    return previousMethods.setZoomAround.call(this, latlng, zoom, options);
  },

  getBoundsZoom: function (this: any, bounds: L.LatLngBoundsExpression, inside?: boolean, padding?: L.PointExpression) {
    bounds = L.latLngBounds(bounds as any);
    padding = L.point(padding || [0, 0]);

    let zoom = this.getZoom() || 0;
    let min = this.getMinZoom();
    let max = this.getMaxZoom();
    let nw = bounds.getNorthWest();
    let se = bounds.getSouthEast();
    let viewport = this.getViewport();
    let size = (viewport ? L.point(viewport.clientWidth, viewport.clientHeight) : this.getSize()).subtract(padding);
    let boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom));
    let snap = L.Browser.any3d ? this.options.zoomSnap : 1;

    let scale = Math.min(size.x / boundsSize.x, size.y / boundsSize.y);

    zoom = this.getScaleZoom(scale, zoom);

    if (snap) {
      zoom = Math.round(zoom / (snap / 100)) * (snap / 100);
      zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
    }

    return Math.max(min, Math.min(max, zoom));
  },
});

(L.Map as any).include({
  setActiveArea: function (this: any, css: string | Record<string, any>, keepCenter?: boolean, animate?: boolean) {
    let center;
    if (keepCenter && this._zoom) {
      center = this.getCenter();
    }

    if (!this._viewport) {
      let container = this.getContainer();
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

(L.Renderer as any).include({
  _onZoom: function (this: any) {
    this._updateTransform(this._map.getCenter(true), this._map.getZoom());
  },

  _update: function (this: any) {
    previousMethods.RendererUpdate.call(this);
    this._center = this._map.getCenter(true);
  },
});

(L.GridLayer as any).include({
  _updateLevels: function (this: any) {
    let zoom = this._tileZoom;
    let maxZoom = this.options.maxZoom;

    if (zoom === undefined) {
      return undefined;
    }

    for (let zoomLevel in this._levels) {
      if (this._levels[zoomLevel].el.children.length || zoomLevel === zoom) {
        this._levels[zoomLevel].el.style.zIndex = maxZoom - Math.abs(zoom - Number(zoomLevel));
      } else {
        L.DomUtil.remove(this._levels[zoomLevel].el);
        this._removeTilesAtZoom(zoomLevel);
        delete this._levels[zoomLevel];
      }
    }

    let level = this._levels[zoom];
    let map = this._map;

    if (!level) {
      level = this._levels[zoom] = {};

      level.el = L.DomUtil.create("div", "leaflet-tile-container leaflet-zoom-animated", this._container);
      level.el.style.zIndex = maxZoom;

      level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
      level.zoom = zoom;

      this._setZoomTransform(level, map.getCenter(true), map.getZoom());

      void level.el.offsetWidth;
    }

    this._level = level;

    return level;
  },

  _resetView: function (this: any, e: any) {
    let animating = e && (e.pinch || e.flyTo);
    this._setView(this._map.getCenter(true), this._map.getZoom(), animating, animating);
  },

  _update: function (this: any, center?: L.LatLng) {
    let map = this._map;
    if (!map) {
      return;
    }
    let zoom = map.getZoom();

    if (center === undefined) {
      center = map.getCenter(this);
    }
    if (this._tileZoom === undefined) {
      return;
    }

    let pixelBounds = this._getTiledPixelBounds(center);
    let tileRange = this._pxBoundsToTileRange(pixelBounds);
    let tileCenter = tileRange.getCenter();
    let queue: L.Point[] = [];

    for (let key in this._tiles) {
      this._tiles[key].current = false;
    }

    if (Math.abs(zoom - this._tileZoom) > 1) {
      this._setView(center, zoom);
      return;
    }

    for (let j = tileRange.min.y; j <= tileRange.max.y; j++) {
      for (let i = tileRange.min.x; i <= tileRange.max.x; i++) {
        let coords: any = new L.Point(i, j);
        coords.z = this._tileZoom;

        if (!this._isValidTile(coords)) {
          continue;
        }

        let tile = this._tiles[this._tileCoordsToKey(coords)];
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

      let fragment = document.createDocumentFragment();

      for (let i = 0; i < queue.length; i++) {
        this._addTile(queue[i], fragment);
      }

      this._level.el.appendChild(fragment);
    }
  },
});
