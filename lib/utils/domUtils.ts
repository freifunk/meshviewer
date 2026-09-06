import { h, VNode } from "snabbdom";
import { _ } from "./language.js";
import { LinkInfo } from "../config_default.js";
import { listReplace } from "./formatters.js";

export function attributeEntry(children: VNode[], label: string, value: string | VNode) {
  if (value !== undefined) {
    if (typeof value !== "object") {
      value = h("td", value);
    }

    children.push(h("tr", [h("th", _.t(label)), value]));
  }
}

export function showStat(linkInfo: LinkInfo, subst: ReplaceMapping): VNode {
  let content: VNode;
  if (linkInfo.image) {
    content = h("img", {
      props: {
        src: listReplace(linkInfo.image, subst),
        width: linkInfo.width,
        height: linkInfo.height,
        alt: _.t("loading", { name: linkInfo.name }),
      },
    });
  } else {
    content = h("p", listReplace(linkInfo.title, subst));
  }

  if (linkInfo.href) {
    return h(
      "div",
      h(
        "a",
        {
          props: {
            href: listReplace(linkInfo.href, subst),
            target: "_blank",
            title: listReplace(linkInfo.title, subst),
          },
        },
        content,
      ),
    );
  }
  return h("div", content);
}

export const showDevicePicture = function showDevicePicture(pictures: string, subst: ReplaceMapping) {
  if (!pictures) {
    return null;
  }

  return h("img", {
    props: { src: listReplace(pictures, subst) },
    class: { "hw-img": true },
    on: {
      // hide non-existent images
      error: function (e: any) {
        e.target.style.display = "none";
      },
    },
  });
};

export const fullscreen = function fullscreen(btn: HTMLButtonElement) {
  const fel = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
    const enter =
      fel.requestFullscreen?.bind(fel) ?? fel.webkitRequestFullScreen?.bind(fel) ?? fel.mozRequestFullScreen?.bind(fel);
    enter?.();
    btn.classList.remove("ion-full-enter");
    btn.classList.add("ion-full-exit");
  } else {
    const exit =
      document.exitFullscreen?.bind(document) ??
      document.webkitExitFullscreen?.bind(document) ??
      document.mozCancelFullScreen?.bind(document);
    if (exit) {
      exit();
      btn.classList.remove("ion-full-exit");
      btn.classList.add("ion-full-enter");
    }
  }
};
