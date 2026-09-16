export interface CanRender {
  render: (element: HTMLElement) => void;
}

export interface CanAdd {
  add: (element: CanRender) => void;
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
