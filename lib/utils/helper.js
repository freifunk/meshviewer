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

export const sortByKey = function sortByKey(key, d) {
  return d.sort(function (a, b) {
    return b[key] - a[key];
  });
};

export const limit = function limit(key, m, d) {
  return d.filter(function (n) {
    return n[key].isAfter(m);
  });
};

export const sum = function sum(a) {
  return a.reduce(function (b, c) {
    return b + c;
  }, 0);
};

export const one = function one() {
  return 1;
};

export const dictGet = function dictGet(dict, key) {
  var k = key.shift();

  if (!(k in dict)) {
    return null;
  }

  if (key.length === 0) {
    return dict[k];
  }

  return dictGet(dict[k], key);
};

export const listReplace = function listReplace(s, subst) {
  for (var key in subst) {
    if (subst.hasOwnProperty(key)) {
      var re = new RegExp(key, "g");
      s = s.replace(re, subst[key]);
    }
  }
  return s;
};

export const hasLocation = function hasLocation(d) {
  return "location" in d && Math.abs(d.location.latitude) < 90 && Math.abs(d.location.longitude) < 180;
};

export const hasUplink = function hasUplink(d) {
  if (!("neighbours" in d)) {
    return false;
  }
  let uplink = false;
  d.neighbours.forEach(function (l) {
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

export const showDistance = function showDistance(d) {
  if (isNaN(d.distance)) {
    return "";
  }

  return d.distance.toFixed(0) + " m";
};

export const showTq = function showTq(d) {
  return (d * 100).toFixed(0) + "%";
};

export const attributeEntry = function attributeEntry(V, children, label, value) {
  if (value !== undefined) {
    if (typeof value !== "object") {
      value = V.h("td", value);
    }

    children.push(V.h("tr", [V.h("th", _.t(label)), value]));
  }
};

export const showStat = function showStat(V, o, subst) {
  var content = V.h("img", {
    attrs: {
      src: listReplace(o.image, subst),
      width: o.width,
      height: o.height,
      alt: _.t("loading", { name: o.name }),
    },
  });

  if (o.href) {
    return V.h(
      "div",
      V.h(
        "a",
        {
          attrs: {
            href: listReplace(o.href, subst),
            target: "_blank",
            title: listReplace(o.title, subst),
          },
        },
        content,
      ),
    );
  }
  return V.h("div", content);
};

export const showHwImg = function showHwImg(V, o, subst) {
  if (!o) {
    return null;
  }

  return V.h("img", {
    attrs: { src: listReplace(o, subst), class: "hw-img" },
    on: {
      // hide non-existant images
      error: function (e) {
        e.target.style.display = "none";
      },
    },
  });
};

export const getTileBBox = function getTileBBox(s, map, tileSize, margin) {
  var tl = map.unproject([s.x - margin, s.y - margin]);
  var br = map.unproject([s.x + margin + tileSize, s.y + margin + tileSize]);

  return { minX: br.lat, minY: tl.lng, maxX: tl.lat, maxY: br.lng };
};

export const positionClients = function positionClients(ctx, p, startAngle, node, startDistance) {
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
      var x = p.x + distance * Math.cos(angle + startAngle);
      var y = p.y + distance * Math.sin(angle + startAngle);

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
