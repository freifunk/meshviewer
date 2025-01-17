import { _ } from "../utils/language.js";
import * as helper from "../utils/helper.js";
import { TargetLocation } from "../utils/router.js";

export const location = function (el: HTMLElement, position: TargetLocation) {
  let config = window.config;
  let sidebarTitle = document.createElement("h2");
  sidebarTitle.textContent = _.t("location.location");
  el.appendChild(sidebarTitle);

  helper
    .getJSON(
      config.reverseGeocodingApi +
        "?format=json&lat=" +
        position.lat +
        "&lon=" +
        position.lng +
        "&zoom=18&addressdetails=0&accept-language=" +
        _.locale(),
    )
    .then(function (result: { display_name: string }) {
      if (result.display_name) {
        sidebarTitle.outerHTML += "<p>" + result.display_name + "</p>";
      }
    });

  let editLat = document.createElement("input");
  editLat.setAttribute("aria-label", _.t("location.latitude"));
  editLat.type = "text";
  editLat.value = position.lat.toFixed(9);
  el.appendChild(createBox("lat", _.t("location.latitude"), editLat));

  let editLng = document.createElement("input");
  editLng.setAttribute("aria-label", _.t("location.longitude"));
  editLng.type = "text";
  editLng.value = position.lng.toFixed(9);
  el.appendChild(createBox("lng", _.t("location.longitude"), editLng));

  let editUci = document.createElement("textarea");
  editUci.setAttribute("aria-label", "Uci");
  editUci.value =
    "uci set gluon-node-info.@location[0]='location'; " +
    "uci set gluon-node-info.@location[0].share_location='1';" +
    "uci set gluon-node-info.@location[0].latitude='" +
    position.lat.toFixed(9) +
    "';" +
    "uci set gluon-node-info.@location[0].longitude='" +
    position.lng.toFixed(9) +
    "';" +
    "uci commit gluon-node-info";

  el.appendChild(createBox("uci", "Uci", editUci));

  function createBox(name: string, title: string, inputElem: HTMLInputElement | HTMLTextAreaElement) {
    let box = document.createElement("div");
    let heading = document.createElement("h3");
    heading.textContent = title;
    box.appendChild(heading);
    let btn = document.createElement("button");
    btn.classList.add("ion-clipboard");
    btn.title = _.t("location.copy");
    btn.setAttribute("aria-label", _.t("location.copy"));
    btn.onclick = function onclick() {
      copy2clip(inputElem.id);
    };
    inputElem.id = "location-" + name;
    inputElem.readOnly = true;
    let line = document.createElement("p");
    line.appendChild(inputElem);
    line.appendChild(btn);
    box.appendChild(line);
    box.id = "box-" + name;
    return box;
  }

  function copy2clip(id: string) {
    let copyField: HTMLTextAreaElement = document.querySelector("#" + id);
    copyField.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.warn(err);
    }
  }
};
