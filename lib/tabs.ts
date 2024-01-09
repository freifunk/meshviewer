import { _ } from "./utils/language";
import { CanRender } from "./container";

export const Tabs = function () {
  const self = {
    add: undefined,
    render: undefined,
  };

  let tabs = document.createElement("ul");
  tabs.classList.add("tabs");

  let container = document.createElement("div");

  function gotoTab(li: HTMLLIElement) {
    for (let i = 0; i < tabs.children.length; i++) {
      tabs.children[i].classList.remove("visible");
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    li.classList.add("visible");

    let tab = document.createElement("div");
    tab.classList.add("tab");
    container.appendChild(tab);
    // @ts-ignore
    li.child.render(tab);
  }

  function switchTab() {
    gotoTab(this);

    return false;
  }

  self.add = function add(title: string, child: CanRender) {
    let li = document.createElement("li");
    li.textContent = _.t(title);
    li.onclick = switchTab;
    // @ts-ignore
    li.child = child;
    tabs.appendChild(li);

    let anyVisible = false;

    for (let i = 0; i < tabs.children.length; i++) {
      if (tabs.children[i].classList.contains("visible")) {
        anyVisible = true;
        break;
      }
    }

    if (!anyVisible) {
      gotoTab(li);
    }
  };

  self.render = function render(el: HTMLElement) {
    el.appendChild(tabs);
    el.appendChild(container);
  };

  return self;
};
