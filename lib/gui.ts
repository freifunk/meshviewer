import { interpolate } from "d3-interpolate";
import { _ } from "./utils/language.js";
import { About } from "./about.js";
import { Container } from "./container.js";
import { DataDistributor } from "./datadistributor.js";
import { ForceGraph } from "./forcegraph.js";
import { Legend } from "./legend.js";
import { Linklist } from "./linklist.js";
import { Nodelist } from "./nodelist.js";
import { Map } from "./map.js";
import { Proportions } from "./proportions.js";
import { SimpleNodelist } from "./simplenodelist.js";
import { Sidebar } from "./sidebar.js";
import { Tabs } from "./tabs.js";
import { Title } from "./title.js";
import { Main as Infobox } from "./infobox/main.js";
import { FilterGui } from "./filters/filtergui.js";
import { HostnameFilter } from "./filters/hostname.js";
import * as helper from "./utils/helper.js";
import { Language } from "./utils/language.js";

export const Gui = function (language: ReturnType<typeof Language>) {
  const self = {
    setData: undefined,
  };
  let content: ReturnType<typeof Map>;
  let contentDiv: HTMLDivElement;
  let router = window.router;
  let config = window.config;

  let linkScale = interpolate(config.map.tqFrom, config.map.tqTo);
  let sidebar: ReturnType<typeof Sidebar>;

  let buttons = document.createElement("div");
  buttons.classList.add("buttons");

  let fanout = DataDistributor();
  let fanoutUnfiltered = DataDistributor();
  fanoutUnfiltered.add(fanout);

  function removeContent() {
    if (!content) {
      return;
    }

    router.removeTarget(content);
    fanout.remove(content);

    content.destroy();

    content = null;
  }

  function addContent(mapViewComponent: typeof Map | typeof ForceGraph) {
    removeContent();

    content = mapViewComponent(linkScale, sidebar, buttons);
    content.render(contentDiv);

    fanout.add(content);
    router.addTarget(content);
  }

  function mkView(mapViewComponent: typeof Map | typeof ForceGraph) {
    return function () {
      addContent(mapViewComponent);
    };
  }

  let loader = document.getElementsByClassName("loader")[0];
  loader.classList.add("hide");

  contentDiv = document.createElement("div");
  contentDiv.classList.add("content");
  document.body.appendChild(contentDiv);

  sidebar = Sidebar(document.body);

  contentDiv.appendChild(buttons);

  let buttonToggle = document.createElement("button");
  buttonToggle.classList.add("ion-eye");
  buttonToggle.setAttribute("aria-label", _.t("button.switchView"));
  buttonToggle.onclick = function onclick() {
    let data: {};
    if (router.currentView() === "map") {
      data = { view: "graph", lat: undefined, lng: undefined, zoom: undefined };
    } else {
      data = { view: "map" };
    }
    router.fullUrl(data, false, true);
  };

  buttons.appendChild(buttonToggle);

  if (config.fullscreen || (config.fullscreenFrame && window.frameElement)) {
    let buttonFullscreen = document.createElement("button");
    buttonFullscreen.classList.add("ion-full-enter");
    buttonFullscreen.setAttribute("aria-label", _.t("button.fullscreen"));
    buttonFullscreen.onclick = function onclick() {
      helper.fullscreen(buttonFullscreen);
    };

    buttons.appendChild(buttonFullscreen);
  }

  let title = Title();

  let header = Container("header");
  let infobox = Infobox(sidebar, linkScale);
  let tabs = Tabs();
  let overview = Container();
  let legend = Legend(language);
  let newnodeslist = SimpleNodelist("new", "firstseen", _.t("node.new"));
  let lostnodeslist = SimpleNodelist("lost", "lastseen", _.t("node.missing"));
  let nodelist = Nodelist();
  let linklist = Linklist(linkScale);
  let statistics = Proportions(fanout);
  let about = About(config.devicePicturesSource, config.devicePicturesLicense);

  fanoutUnfiltered.add(legend);
  fanoutUnfiltered.add(newnodeslist);
  fanoutUnfiltered.add(lostnodeslist);
  fanoutUnfiltered.add(infobox);
  fanout.add(nodelist);
  fanout.add(linklist);
  fanout.add(statistics);

  sidebar.add(header);
  header.add(legend);

  overview.add(newnodeslist);
  overview.add(lostnodeslist);

  let filterGui = FilterGui(fanout);
  fanout.watchFilters(filterGui);
  header.add(filterGui);

  let hostnameFilter = HostnameFilter();
  fanout.addFilter(hostnameFilter);

  sidebar.add(tabs);
  tabs.add("sidebar.actual", overview);
  tabs.add("node.nodes", nodelist);
  tabs.add("node.links", linklist);
  tabs.add("sidebar.stats", statistics);
  tabs.add("sidebar.about", about);

  router.addTarget(title);
  router.addTarget(infobox);

  router.addView("map", mkView(Map));
  router.addView("graph", mkView(ForceGraph));

  self.setData = fanoutUnfiltered.setData;

  return self;
};
