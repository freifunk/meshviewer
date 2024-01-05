export interface CanRender {
  render: (element: HTMLElement) => any;
}

export interface CanAdd {
  add: (element: CanRender) => any;
}

export const Container = function (tag?: string): CanRender & CanAdd {
  if (!tag) {
    tag = "div";
  }

  const self = {
    add: undefined,
    render: undefined,
  };

  let container = document.createElement(tag);

  self.add = function add(d: CanRender) {
    d.render(container);
  };

  self.render = function render(el: HTMLElement) {
    el.appendChild(container);
  };

  return self;
};
