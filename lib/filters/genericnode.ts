import { dictGet, normalizeFilterValue } from "../utils/formatters.js";
import { GenericFilter } from "../datadistributor.js";
import { CanRender } from "../container.js";
import { Node } from "../utils/node.js";
import { _ } from "../utils/language.js";

export type NodeValueModifier = (a: any) => unknown;

export const GenericNodeFilter = function (
  name: string,
  keys: string[],
  value: string,
  nodeValueModifier?: NodeValueModifier | null,
): GenericFilter & CanRender {
  let negate = false;
  let refresh: ((preserveFocus?: boolean) => void) | undefined;

  const normalizedValue = normalizeFilterValue(value);

  function run(node: Node) {
    let nodeValue: unknown = dictGet(node, keys.slice(0));

    if (nodeValueModifier) {
      nodeValue = nodeValueModifier(nodeValue);
    }

    if (nodeValue === null || nodeValue === undefined) {
      return negate;
    }

    return normalizeFilterValue(nodeValue) === normalizedValue ? !negate : negate;
  }

  function setRefresh(f: (preserveFocus?: boolean) => void) {
    refresh = f;
  }

  function draw(el: HTMLElement, strong: HTMLElement) {
    if (negate) {
      el.classList.add("not");
    } else {
      el.classList.remove("not");
    }

    strong.textContent = value;
  }

  function render(el: HTMLElement) {
    let label = document.createElement("label");
    let strong = document.createElement("strong");
    label.textContent = _.t(name) + ": ";
    label.appendChild(strong);
    el.appendChild(label);
    draw(el, strong);

    label.onclick = function onclick() {
      negate = !negate;

      draw(el, strong);

      if (refresh) {
        refresh();
      }
    };
  }

  function setNegate(n: boolean) {
    negate = n;
  }

  function getKey() {
    return normalizedValue.concat(name);
  }

  function getName() {
    return name;
  }

  function getValue() {
    return value;
  }

  function getNegate() {
    return negate;
  }

  return {
    run,
    setRefresh,
    render,
    getKey,
    getNegate,
    getName,
    getValue,
    setNegate,
  };
};
