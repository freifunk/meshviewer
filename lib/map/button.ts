// @ts-nocheck
import * as L from "leaflet";
import { _ } from "../utils/language.js";

import { LocationMarker } from "./locationmarker.js";

const ButtonBase = L.Control.extend({
  options: {
    position: "bottomright",
  },

  active: false,
  button: undefined as HTMLElement | undefined,

  initialize: function (
    this: L.Control & { f: (v: boolean) => void },
    f: (v: boolean) => void,
    options?: L.ControlOptions,
  ) {
    L.Util.setOptions(this, options);
    this.f = f;
  },

  update: function (this: L.Control & { active: boolean; button: HTMLElement }) {
    this.button.classList.toggle("active", this.active);
  },

  set: function (this: L.Control & { active: boolean; button: HTMLElement }, activeValue: boolean) {
    this.active = activeValue;
    this.update();
  },
});

const LocateButton = ButtonBase.extend({
  onAdd: function (this: L.Control & { button: HTMLElement }) {
    const button = L.DomUtil.create("button", "ion-locate");
    button.setAttribute("aria-label", _.t("button.tracking"));
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function (this: L.Control & { f: (v: boolean) => void; active: boolean }) {
    this.f(!this.active);
  },
});

const CoordsPickerButton = ButtonBase.extend({
  onAdd: function (this: L.Control & { button: HTMLElement }) {
    const button = L.DomUtil.create("button", "ion-pin");
    button.setAttribute("aria-label", _.t("button.location"));

    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function (this: L.Control & { f: (v: boolean) => void; active: boolean }, e: L.LeafletMouseEvent) {
    L.DomEvent.stopPropagation(e);
    this.f(!this.active);
  },
});

const RulerButton = ButtonBase.extend({
  onAdd: function (this: L.Control & { button: HTMLElement }) {
    const button = L.DomUtil.create("button", "ion-ruler");
    button.setAttribute("aria-label", _.t("button.ruler"));
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function (this: L.Control & { f: (v: boolean) => void; active: boolean }, e: L.LeafletMouseEvent) {
    L.DomEvent.stopPropagation(e);
    this.f(!this.active);
  },
});

export type MapButtonApi = {
  clearButtons: () => void;
  disableTracking: () => void;
  locationFound: (location: L.LocationEvent) => void;
  locationError: () => void;
  init: () => void;
};

export const Button = function (map: L.Map, buttons: HTMLElement): MapButtonApi {
  let userLocation: InstanceType<typeof LocationMarker> | null = null;
  const self: MapButtonApi = {
    clearButtons: () => {},
    disableTracking: () => {},
    locationFound: () => {},
    locationError: () => {},
    init: () => {},
  };

  const locateUserButton = new (LocateButton as unknown as new (f: (v: boolean) => void) => L.Control & {
    onAdd: () => HTMLElement;
    set: (v: boolean) => void;
  })(function (activate: boolean) {
    if (activate) {
      enableTracking();
    } else {
      self.disableTracking();
    }
  });

  const mybuttons: HTMLElement[] = [];

  function addButton(button: L.Control & { onAdd: () => HTMLElement }) {
    const el = button.onAdd();
    mybuttons.push(el);
    buttons.appendChild(el);
  }

  self.clearButtons = function clearButtons() {
    mybuttons.forEach(function (button) {
      buttons.removeChild(button);
    });
  };

  const showCoordsPickerButton = new (CoordsPickerButton as unknown as new (f: (v: boolean) => void) => L.Control & {
    onAdd: () => HTMLElement;
    set: (v: boolean) => void;
  })(function (activate: boolean) {
    if (activate) {
      enableCoords();
    } else {
      disableCoords();
    }
  });

  const rulerButton = new (RulerButton as unknown as new (f: (v: boolean) => void) => L.Control & {
    onAdd: () => HTMLElement;
    set: (v: boolean) => void;
  })(function (activate: boolean) {
    if (activate) {
      enableRuler();
    } else {
      disableRuler();
    }
  });

  let rulerLayerGroup: L.LayerGroup | null = null;
  const rulerMarkers: L.CircleMarker[] = [];
  let rulerLines: L.Polyline | null = null;
  let rulerLinesBg: L.Polyline | null = null;
  const rulerDistancePopups: L.Popup[] = [];

  function formatDistance(m: number) {
    if (m >= 1000) {
      return (m / 1000).toFixed(2) + " km";
    }
    return Math.round(m) + " m";
  }

  function enableRuler() {
    rulerLayerGroup = L.layerGroup().addTo(map);
    rulerLinesBg = L.polyline([], {
      color: "#fff",
      weight: 3,
    }).addTo(rulerLayerGroup);
    rulerLines = L.polyline([], { color: "#000", weight: 2, dashArray: "4" }).addTo(rulerLayerGroup);

    map.getContainer().classList.add("measure-active");
    map.on("click", onRulerClick);
    rulerButton.set(true);
  }

  function disableRuler() {
    map.getContainer().classList.remove("measure-active");
    map.off("click", onRulerClick);

    if (rulerLayerGroup) {
      map.removeLayer(rulerLayerGroup);
      rulerLayerGroup = null;
    }
    rulerMarkers.length = 0;
    rulerLines = null;
    rulerLinesBg = null;
    rulerDistancePopups.length = 0;

    rulerButton.set(false);
  }

  function onRulerClick(e: L.LeafletMouseEvent) {
    const latlng = e.latlng;
    const config = window.config;
    if (!rulerLayerGroup || !rulerLines || !rulerLinesBg) {
      return;
    }
    const marker = L.circleMarker(latlng, {
      radius: 5,
      color: config.map && config.map.labelNewColor ? config.map.labelNewColor : "#333",
    }).addTo(rulerLayerGroup);
    rulerMarkers.push(marker);

    const latlngs = rulerLines.getLatLngs() as L.LatLng[];
    latlngs.push(latlng);
    rulerLines.setLatLngs(latlngs);
    rulerLinesBg.setLatLngs(latlngs);

    if (latlngs.length >= 2) {
      const last = latlngs[latlngs.length - 2];
      const segDist = latlng.distanceTo(latlngs[latlngs.length - 2]);

      const midLat = (latlng.lat + last.lat) / 2;
      const midLng = (latlng.lng + last.lng) / 2;

      let total = 0;
      for (let i = 1; i < latlngs.length; i++) {
        total += latlngs[i].distanceTo(latlngs[i - 1]);
      }

      const popup = L.popup({ closeButton: false, autoClose: false, className: "ruler-popup" })
        .setLatLng([midLat, midLng])
        .setContent("<strong>" + formatDistance(segDist) + "</strong><br/>" + formatDistance(total))
        .addTo(rulerLayerGroup);

      rulerDistancePopups.push(popup);
    }
  }

  function enableTracking() {
    map.locate({
      watch: true,
      enableHighAccuracy: true,
      setView: "untilPan",
    });
    locateUserButton.set(true);
  }

  self.disableTracking = function disableTracking() {
    map.stopLocate();
    self.locationError();
    locateUserButton.set(false);
  };

  function enableCoords() {
    map.getContainer().classList.add("pick-coordinates");
    map.on("click", showCoordinates);
    showCoordsPickerButton.set(true);
  }

  function disableCoords() {
    map.getContainer().classList.remove("pick-coordinates");
    map.off("click", showCoordinates);
    showCoordsPickerButton.set(false);
  }

  function showCoordinates(clicked: L.LeafletMouseEvent) {
    const router = window.router;
    router.fullUrl({ zoom: map.getZoom(), lat: clicked.latlng.lat, lng: clicked.latlng.lng });
    disableCoords();
  }

  self.locationFound = function locationFound(location: L.LocationEvent) {
    if (!userLocation) {
      userLocation = new LocationMarker(location.latlng).addTo(map);
    }

    userLocation.setLatLng(location.latlng);
    userLocation.setAccuracy(location.accuracy);
  };

  self.locationError = function locationError() {
    if (userLocation) {
      map.removeLayer(userLocation);
      userLocation = null;
    }
  };

  self.init = function init() {
    addButton(locateUserButton as L.Control & { onAdd: () => HTMLElement });
    addButton(showCoordsPickerButton as L.Control & { onAdd: () => HTMLElement });
    addButton(rulerButton as L.Control & { onAdd: () => HTMLElement });
  };

  return self;
};
