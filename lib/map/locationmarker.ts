import * as L from "leaflet";

export class LocationMarker extends L.CircleMarker {
  private accuracyCircle: L.Circle;
  private outerCircle: L.CircleMarker;

  constructor(latlng: L.LatLngExpression) {
    const config = window.config;
    super(latlng, config.locate.innerCircle);
    this.accuracyCircle = L.circle(latlng, { radius: 0, ...config.locate.accuracyCircle });
    this.outerCircle = L.circleMarker(latlng, config.locate.outerCircle);

    this.on("remove", () => {
      if (!this._map) {
        return;
      }
      this._map.removeLayer(this.accuracyCircle);
      this._map.removeLayer(this.outerCircle);
    });
  }

  setLatLng(latlng: L.LatLngExpression): this {
    this.accuracyCircle.setLatLng(latlng);
    this.outerCircle.setLatLng(latlng);
    return super.setLatLng(latlng);
  }

  setAccuracy(accuracy: number): void {
    this.accuracyCircle.setRadius(accuracy);
  }

  onAdd(map: L.Map): this {
    this.accuracyCircle.addTo(map).bringToBack();
    this.outerCircle.addTo(map);
    return super.onAdd(map);
  }
}
