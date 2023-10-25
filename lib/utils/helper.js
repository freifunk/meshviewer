export const get = function get(url) {
  return new Promise(function (resolve, reject) {
    var req = new XMLHttpRequest();
    req.open("GET", url);

    req.onload = function onload() {
      if (req.status === 200) {
        resolve(req.response);
      } else {
        reject(Error(req.statusText));
      }
    };

    req.onerror = function onerror() {
      reject(Error("Network Error"));
    };

    req.send();
  });
};

export const getJSON = function getJSON(url) {
  return get(url).then(JSON.parse);
};

export const sortByKey = function sortByKey(key, data) {
  return data.sort(function (a, b) {
    return b[key] - a[key];
  });
};

export const limit = function limit(key, moment, data) {
  return data.filter(function (entry) {
    return entry[key].isAfter(moment);
  });
};

export const sum = function sum(items) {
  return items.reduce(function (a, b) {
    return a + b;
  }, 0);
};

export const one = function one() {
  return 1;
};

export const dictGet = function dictGet(dict, keys) {
  var key = keys.shift();

  if (!(key in dict)) {
    return null;
  }

  if (keys.length === 0) {
    return dict[key];
  }

  return dictGet(dict[key], keys);
};

export const listReplace = function listReplace(string, subst) {
  for (var key in subst) {
    if (subst.hasOwnProperty(key)) {
      var re = new RegExp(key, "g");
      string = string.replace(re, subst[key]);
    }
  }
  return string;
};

export const hasLocation = function hasLocation(data) {
  return "location" in data && Math.abs(data.location.latitude) < 90 && Math.abs(data.location.longitude) < 180;
};

export const hasUplink = function hasUplink(data) {
  if (!("neighbours" in data)) {
    return false;
  }
  let uplink = false;
  data.neighbours.forEach(function (l) {
    if (l.link.type === "vpn") {
      uplink = true;
    }
  });
  return uplink;
};

export const subtract = function subtract(a, b) {
  var ids = {};

  b.forEach(function (d) {
    ids[d.node_id] = true;
  });

  return a.filter(function (d) {
    return !ids[d.node_id];
  });
};

/* Helpers working with links */

export const showDistance = function showDistance(data) {
  if (isNaN(data.distance)) {
    return "";
  }

  return data.distance.toFixed(0) + " m";
};

export const showTq = function showTq(tq) {
  return (tq * 100).toFixed(0) + "%";
};

export const attributeEntry = function attributeEntry(V, children, label, value) {
  if (value !== undefined) {
    if (typeof value !== "object") {
      value = V.h("td", value);
    }

    children.push(V.h("tr", [V.h("th", _.t(label)), value]));
  }
};

export const showStat = function showStat(V, linkInfo, subst) {
  var content = V.h("img", {
    attrs: {
      src: listReplace(linkInfo.image, subst),
      width: linkInfo.width,
      height: linkInfo.height,
      alt: _.t("loading", { name: linkInfo.name }),
    },
  });

  if (linkInfo.href) {
    return V.h(
      "div",
      V.h(
        "a",
        {
          attrs: {
            href: listReplace(linkInfo.href, subst),
            target: "_blank",
            title: listReplace(linkInfo.title, subst),
          },
        },
        content,
      ),
    );
  }
  return V.h("div", content);
};

export const showDevicePicture = function showDevicePicture(V, pictures, subst) {
  if (!pictures) {
    return null;
  }

  return V.h("img", {
    attrs: { src: listReplace(pictures, subst), class: "hw-img" },
    on: {
      // hide non-existant images
      error: function (e) {
        e.target.style.display = "none";
      },
    },
  });
};

export const getTileBBox = function getTileBBox(size, map, tileSize, margin) {
  var tl = map.unproject([size.x - margin, size.y - margin]);
  var br = map.unproject([size.x + margin + tileSize, size.y + margin + tileSize]);

  return { minX: br.lat, minY: tl.lng, maxX: tl.lat, maxY: br.lng };
};

export const positionClients = function positionClients(ctx, point, startAngle, node, startDistance) {
  if (node.clients === 0) {
    return;
  }

  var radius = 3;
  var a = 1.2;
  var mode = 0;

  ctx.beginPath();
  ctx.fillStyle = config.client.wifi24;

  for (var orbit = 0, i = 0; i < node.clients; orbit++) {
    var distance = startDistance + orbit * 2 * radius * a;
    var n = Math.floor((Math.PI * distance) / (a * radius));
    var delta = node.clients - i;

    for (var j = 0; j < Math.min(delta, n); i++, j++) {
      if (mode !== 1 && i >= node.clients_wifi24 + node.clients_wifi5) {
        mode = 1;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.wifi5;
      } else if (mode === 0 && i >= node.clients_wifi24) {
        mode = 2;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = config.client.other;
      }
      var angle = ((2 * Math.PI) / n) * j;
      var x = point.x + distance * Math.cos(angle + startAngle);
      var y = point.y + distance * Math.sin(angle + startAngle);

      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
};

export const fullscreen = function fullscreen(btn) {
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
    var fel = document.firstElementChild;
    var func = fel.requestFullscreen || fel.webkitRequestFullScreen || fel.mozRequestFullScreen;
    func.call(fel);
    btn.classList.remove("ion-full-enter");
    btn.classList.add("ion-full-exit");
  } else {
    func = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
    if (func) {
      func.call(document);
      btn.classList.remove("ion-full-exit");
      btn.classList.add("ion-full-enter");
    }
  }
};

export const escape = function escape(string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").replace(/'/g, "&#39;");
};
