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

  const container = document.createElement(tag);

  const self: CanRender & CanAdd = {
    add(d: CanRender) {
      d.render(container);
    },
    render(el: HTMLElement) {
      el.appendChild(container);
    },
  };

  return self;
};
