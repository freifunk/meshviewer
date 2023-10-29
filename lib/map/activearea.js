/**
 * https://github.com/Mappy/Leaflet-active-area
 * Apache 2.0 license https://www.apache.org/licenses/LICENSE-2.0
 */
import * as L from "leaflet";

let previousMethods = {
  getCenter: L.Map.prototype.getCenter,
  setView: L.Map.prototype.setView,
  setZoomAround: L.Map.prototype.setZoomAround,
  getBoundsZoom: L.Map.prototype.getBoundsZoom,
  RendererUpdate: L.Renderer.prototype._update,
};

L.Map.include({
  getBounds: function () {
    if (this._viewport) {
      return this.getViewportLatLngBounds();
    }
    let bounds = this.getPixelBounds();
    let sw = this.unproject(bounds.getBottomLeft());
    let ne = this.unproject(bounds.getTopRight());

    return new L.LatLngBounds(sw, ne);
  },

  getViewport: function () {
    return this._viewport;
  },

  getViewportBounds: function () {
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

  getViewportLatLngBounds: function () {
    let bounds = this.getViewportBounds();
    return L.latLngBounds(this.containerPointToLatLng(bounds.min), this.containerPointToLatLng(bounds.max));
  },

  getOffset: function () {
    let mCenter = this.getSize().divideBy(2);
    let vCenter = this.getViewportBounds().getCenter();

    return mCenter.subtract(vCenter);
  },

  getCenter: function (withoutViewport) {
    let center = previousMethods.getCenter.call(this);

    if (this.getViewport() && !withoutViewport) {
      let zoom = this.getZoom();
      let point = this.project(center, zoom);
      point = point.subtract(this.getOffset());

      center = this.unproject(point, zoom);
    }

    return center;
  },

  setView: function (center, zoom, options) {
    center = L.latLng(center);
    zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);

    if (this.getViewport()) {
      let point = this.project(center, this._limitZoom(zoom));
      point = point.add(this.getOffset());
      center = this.unproject(point, this._limitZoom(zoom));
    }

    return previousMethods.setView.call(this, center, zoom, options);
  },

  setZoomAround: function (latlng, zoom, options) {
    let viewport = this.getViewport();

    if (viewport) {
      let scale = this.getZoomScale(zoom);
      let viewHalf = this.getViewportBounds().getCenter();
      let containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng);

      let centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale);
      let newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

      return this.setView(newCenter, zoom, { zoom: options });
    }
    return previousMethods.setZoomAround.call(this, latlng, zoom, options);
  },

  getBoundsZoom: function (bounds, inside, padding) {
    // (LatLngBounds[, Boolean, Point]) -> Number
    bounds = L.latLngBounds(bounds);
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
      zoom = Math.round(zoom / (snap / 100)) * (snap / 100); // don't jump if within 1% of a snap level
      zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
    }

    return Math.max(min, Math.min(max, zoom));
  },
});

L.Map.include({
  setActiveArea: function (css, keepCenter, animate) {
    let center;
    if (keepCenter && this._zoom) {
      // save center if map is already initialized
      // and keepCenter is passed
      center = this.getCenter();
    }

    if (!this._viewport) {
      // Make viewport if not already made
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

L.Renderer.include({
  _onZoom: function () {
    this._updateTransform(this._map.getCenter(true), this._map.getZoom());
  },

  _update: function () {
    previousMethods.RendererUpdate.call(this);
    this._center = this._map.getCenter(true);
  },
});

L.GridLayer.include({
  _updateLevels: function () {
    let zoom = this._tileZoom;
    let maxZoom = this.options.maxZoom;

    if (zoom === undefined) {
      return undefined;
    }

    for (let zoomLevel in this._levels) {
      if (this._levels[zoomLevel].el.children.length || zoomLevel === zoom) {
        this._levels[zoomLevel].el.style.zIndex = maxZoom - Math.abs(zoom - zoomLevel);
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

      // force the browser to consider the newly added element for transition
      L.Util.falseFn(level.el.offsetWidth);
    }

    this._level = level;

    return level;
  },

  _resetView: function (e) {
    let animating = e && (e.pinch || e.flyTo);
    this._setView(this._map.getCenter(true), this._map.getZoom(), animating, animating);
  },

  _update: function (center) {
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
    } // if out of minzoom/maxzoom

    let pixelBounds = this._getTiledPixelBounds(center);
    let tileRange = this._pxBoundsToTileRange(pixelBounds);
    let tileCenter = tileRange.getCenter();
    let queue = [];

    for (let key in this._tiles) {
      this._tiles[key].current = false;
    }

    // _update just loads more tiles. If the tile zoom level differs too much
    // from the map's, let _setView reset levels and prune old tiles.
    if (Math.abs(zoom - this._tileZoom) > 1) {
      this._setView(center, zoom);
      return;
    }

    // create a queue of coordinates to load tiles from
    for (let j = tileRange.min.y; j <= tileRange.max.y; j++) {
      for (let i = tileRange.min.x; i <= tileRange.max.x; i++) {
        let coords = new L.Point(i, j);
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

    // sort tile queue to load tiles in order of their distance to center
    queue.sort(function (a, b) {
      return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
    });

    if (queue.length !== 0) {
      // if it's the first batch of tiles to load
      if (!this._loading) {
        this._loading = true;
        // @event loading: Event
        // Fired when the grid layer starts loading tiles
        this.fire("loading");
      }

      // create DOM fragment to append tiles in one batch
      let fragment = document.createDocumentFragment();

      for (let i = 0; i < queue.length; i++) {
        this._addTile(queue[i], fragment);
      }

      this._level.el.appendChild(fragment);
    }
  },
});
