export const showLoaderError = function showLoaderError(message: string, detail?: string, hint?: string) {
  const loader = document.querySelector(".loader");
  if (!loader) {
    return;
  }

  const button = document.createElement("button");
  button.className = "btn text";
  button.textContent = "Try to reload";
  button.setAttribute("aria-label", "Try to reload");
  button.addEventListener("click", function () {
    location.reload();
  });

  const nodes: (Node | string)[] = [message];
  if (detail) {
    nodes.push(document.createElement("br"), detail);
  }
  nodes.push(document.createElement("br"), document.createElement("br"), button);
  if (hint) {
    nodes.push(document.createElement("br"), hint);
  }
  loader.replaceChildren(...nodes);
};
