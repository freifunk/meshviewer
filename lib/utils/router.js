import Navigo from "navigo";

export const Router = function (language) {
  var init = false;
  var objects = {};
  var targets = [];
  var views = {};
  var current = {};
  var state = { lang: language.getLocale(), view: "map" };

  function resetView() {
    targets.forEach(function (target) {
      target.resetView();
    });
  }

  function gotoNode(node) {
    if (objects.nodeDict[node.nodeId]) {
      targets.forEach(function (target) {
        target.gotoNode(objects.nodeDict[node.nodeId], objects.nodeDict);
      });
    }
  }

  function gotoLink(linkData) {
    var link = objects.links.filter(function (value) {
      return value.id === linkData.linkId;
    });
    if (link) {
      targets.forEach(function (t) {
        t.gotoLink(link);
      });
    }
  }

  function view(data) {
    if (data.view in views) {
      views[data.view]();
      state.view = data.view;
      resetView();
    }
  }

  function customRoute(lang, viewValue, node, link, zoom, lat, lng) {
    current = {
      lang: lang,
      view: viewValue,
      node: node,
      link: link,
      zoom: zoom,
      lat: lat,
      lng: lng,
    };

    if (lang && lang !== state.lang && lang === language.getLocale(lang)) {
      location.reload();
    }

    if (!init || (viewValue && viewValue !== state.view)) {
      if (!viewValue) {
        viewValue = state.view;
      }
      view({ view: viewValue });
      init = true;
    }

    if (node) {
      gotoNode({ nodeId: node });
    } else if (link) {
      gotoLink({ linkId: link });
    } else if (lat) {
      targets.forEach(function (target) {
        target.gotoLocation({
          zoom: parseInt(zoom, 10),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        });
      });
    } else {
      resetView();
    }
  }

  var router = new Navigo(null, true, "#!");

  router
    .on(
      /^\/?#?!?\/([\w]{2})?\/?(map|graph)?\/?([a-f\d]{12})?([a-f\d\-]{25})?\/?(?:(\d+)\/(-?[\d.]+)\/(-?[\d.]+))?$/,
      customRoute,
    )
    .on({
      "*": function () {
        router.fullUrl();
      },
    });

  router.generateLink = function generateLink(data, full, deep) {
    var result = "#!";

    if (full) {
      data = Object.assign({}, state, data);
    } else if (deep) {
      data = Object.assign({}, current, data);
    }

    for (var key in data) {
      if (!data.hasOwnProperty(key) || data[key] === undefined) {
        continue;
      }
      result += "/" + data[key];
    }

    return result;
  };

  router.fullUrl = function fullUrl(data, e, deep) {
    if (e) {
      e.preventDefault();
    }
    router.navigate(router.generateLink(data, !deep, deep));
  };

  router.getLang = function getLang() {
    var lang = location.hash.match(/^\/?#!?\/([\w]{2})\//);
    if (lang) {
      state.lang = language.getLocale(lang[1]);
      return lang[1];
    }
    return null;
  };

  router.addTarget = function addTarget(target) {
    targets.push(target);
  };

  router.removeTarget = function removeTarget(target) {
    targets = targets.filter(function (e) {
      return target !== e;
    });
  };

  router.addView = function addView(key, view) {
    views[key] = view;
  };

  router.setData = function setData(data) {
    objects = data;
  };

  return router;
};
