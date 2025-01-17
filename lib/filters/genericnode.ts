import * as helper from "../utils/helper.js";
import { Filter } from "../datadistributor.js";
import { CanRender } from "../container.js";
import { Node } from "../utils/node.js";

export const GenericNodeFilter = function (
  name: string,
  keys: string[],
  value: string,
  nodeValueModifier: (a: any) => string,
): Filter & CanRender {
  let negate = false;
  let refresh: () => any;

  let label = document.createElement("label");
  let strong = document.createElement("strong");
  label.textContent = name + ": ";
  label.appendChild(strong);

  function run(node: Node) {
    let nodeValue = helper.dictGet(node, keys.slice(0));

    if (nodeValueModifier) {
      nodeValue = nodeValueModifier(nodeValue);
    }

    return nodeValue === value ? !negate : negate;
  }

  function setRefresh(f: () => any) {
    refresh = f;
  }

  function draw(el: HTMLElement) {
    if (negate) {
      el.classList.add("not");
    } else {
      el.classList.remove("not");
    }

    strong.textContent = value;
  }

  function render(el: HTMLElement) {
    el.appendChild(label);
    draw(el);

    label.onclick = function onclick() {
      negate = !negate;

      draw(el);

      if (refresh) {
        refresh();
      }
    };
  }

  function getKey() {
    return value.concat(name);
  }

  return {
    run,
    setRefresh,
    render,
    getKey,
  };
};
