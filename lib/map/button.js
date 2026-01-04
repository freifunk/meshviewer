import * as L from "leaflet";
import { _ } from "../utils/language";

import { LocationMarker } from "./locationmarker";

let ButtonBase = L.Control.extend({
  options: {
    position: "bottomright",
  },

  active: false,
  button: undefined,

  initialize: function (f, options) {
    L.Util.setOptions(this, options);
    this.f = f;
  },

  update: function () {
    this.button.classList.toggle("active", this.active);
  },

  set: function (activeValue) {
    this.active = activeValue;
    this.update();
  },
});

let LocateButton = ButtonBase.extend({
  onAdd: function () {
    let button = L.DomUtil.create("button", "ion-locate");
    button.setAttribute("aria-label", _.t("button.tracking"));
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function () {
    this.f(!this.active);
  },
});

let CoordsPickerButton = ButtonBase.extend({
  onAdd: function () {
    let button = L.DomUtil.create("button", "ion-pin");
    button.setAttribute("aria-label", _.t("button.location"));

    // Click propagation isn't disabled as this causes problems with the
    // location picking mode; instead propagation is stopped in onClick().
    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function (e) {
    L.DomEvent.stopPropagation(e);
    this.f(!this.active);
  },
});

let RulerButton = ButtonBase.extend({
  onAdd: function () {
    let button = L.DomUtil.create("button", "ion-ruler");
    button.setAttribute("aria-label", _.t("button.ruler"));
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.addListener(button, "click", this.onClick, this);

    this.button = button;

    return button;
  },

  onClick: function (e) {
    L.DomEvent.stopPropagation(e);
    this.f(!this.active);
  },
});

export const Button = function (map, buttons) {
  let userLocation;
  const self = {
    clearButtons: undefined,
    disableTracking: undefined,
    locationFound: undefined,
    locationError: undefined,
    init: undefined,
  };

  let locateUserButton = new LocateButton(function (activate) {
    if (activate) {
      enableTracking();
    } else {
      self.disableTracking();
    }
  });

  let mybuttons = [];

  function addButton(button) {
    let el = button.onAdd();
    mybuttons.push(el);
    buttons.appendChild(el);
  }

  self.clearButtons = function clearButtons() {
    mybuttons.forEach(function (button) {
      buttons.removeChild(button);
    });
  };

  let showCoordsPickerButton = new CoordsPickerButton(function (activate) {
    if (activate) {
      enableCoords();
    } else {
      disableCoords();
    }
  });

  // Ruler / measure distances button
  let rulerButton = new RulerButton(function (activate) {
    if (activate) {
      enableRuler();
    } else {
      disableRuler();
    }
  });

  let rulerLayerGroup = null;
  let rulerMarkers = [];
  let rulerLines = null;
  let rulerDistancePopups = [];

  function formatDistance(m) {
    if (m >= 1000) {
      return (m / 1000).toFixed(2) + " km";
    }
    return Math.round(m) + " m";
  }

  function enableRuler() {
    // create layer group for ruler markers/lines
    rulerLayerGroup = L.layerGroup().addTo(map);
    rulerLines = L.polyline([], { color: "#000", weight: 2, dashArray: "4" }).addTo(rulerLayerGroup);
    rulerMarkers = [];
    rulerDistancePopups = [];

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
    rulerMarkers = [];
    rulerLines = null;
    rulerDistancePopups = [];

    rulerButton.set(false);
  }

  function onRulerClick(e) {
    let latlng = e.latlng;
    let config = window.config;
    let marker = L.circleMarker(latlng, {
      radius: 5,
      color: config.map && config.map.labelNewColor ? config.map.labelNewColor : "#333",
    }).addTo(rulerLayerGroup);
    rulerMarkers.push(marker);

    // add to polyline
    let latlngs = rulerLines.getLatLngs();
    latlngs.push(latlng);
    rulerLines.setLatLngs(latlngs);

    // compute segment distance and total distance
    let last = null;
    if (latlngs.length >= 2) {
      last = latlngs[latlngs.length - 2];
      let segDist = latlng.distanceTo(latlngs[latlngs.length - 2]);
      // show popup at midpoint for segment
      let midLat = (latlng.lat + last.lat) / 2;
      let midLng = (latlng.lng + last.lng) / 2;

      // compute total
      let total = 0;
      for (let i = 1; i < latlngs.length; i++) {
        total += latlngs[i].distanceTo(latlngs[i - 1]);
      }

      let popup = L.popup({ closeButton: false, autoClose: false, className: "ruler-popup" })
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

  function showCoordinates(clicked) {
    router.fullUrl({ zoom: map.getZoom(), lat: clicked.latlng.lat, lng: clicked.latlng.lng });
    disableCoords();
  }

  self.locationFound = function locationFound(location) {
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
    addButton(locateUserButton);
    addButton(showCoordsPickerButton);
    addButton(rulerButton);
  };

  return self;
};
