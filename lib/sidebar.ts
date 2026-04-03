import { _ } from "./utils/language.js";
import { CanRender } from "./container.js";

export const Sidebar = function (el: HTMLElement) {
  const gridBreakpoints = {
    lg: [992, 446],
    xl: [1200, 560],
  };

  const sidebar = document.createElement("div");
  sidebar.classList.add("sidebar");
  el.appendChild(sidebar);

  const button = document.createElement("button");
  const visibility = new CustomEvent("visibility");
  sidebar.appendChild(button);

  button.classList.add("sidebarhandle");
  button.setAttribute("aria-label", _.t("sidebar.toggle"));
  button.onclick = function onclick() {
    button.dispatchEvent(visibility);
    sidebar.classList.toggle("hidden");
  };

  const container = document.createElement("div");
  container.classList.add("container");
  sidebar.appendChild(container);

  return {
    getWidth() {
      if (gridBreakpoints.lg[0] > window.innerWidth || sidebar.classList.contains("hidden")) {
        return 0;
      } else if (gridBreakpoints.xl[0] > window.innerWidth) {
        return gridBreakpoints.lg[1];
      }
      return gridBreakpoints.xl[1];
    },

    add(d: CanRender) {
      d.render(container);
    },

    ensureVisible() {
      sidebar.classList.remove("hidden");
    },

    hide() {
      container.children[1].classList.add("hide");
      container.children[2].classList.add("hide");
    },

    reveal() {
      container.children[1].classList.remove("hide");
      container.children[2].classList.remove("hide");
    },

    container: sidebar,
    button,
  };
};
