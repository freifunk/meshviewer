const iframe = document.getElementById("meshviewer-embedded");

if (!(iframe instanceof HTMLIFrameElement)) {
  console.warn("IFrame 'meshviewer-embedded' not found or invalid");
} else {
  const baseSrc = (iframe.getAttribute("src") || "../index.html").split("#")[0];

  function normalizeHash(hash) {
    if (!hash) {
      return "";
    }

    return hash.startsWith("#") ? hash : `#${hash}`;
  }

  function syncIframeSrc(hash) {
    iframe.setAttribute("src", `${baseSrc}${normalizeHash(hash)}`);
  }

  function postHashToIframe(hash) {
    if (!iframe.contentWindow) {
      syncIframeSrc(hash);
      return;
    }

    iframe.contentWindow.postMessage({ hash: normalizeHash(hash) }, "*");
  }

  function updateParentHash(hash) {
    const nextHash = normalizeHash(hash);

    if (!nextHash || nextHash === normalizeHash(window.location.hash)) {
      return;
    }

    window.location.replace(nextHash);
  }

  syncIframeSrc(window.location.hash);

  iframe.addEventListener("load", function () {
    postHashToIframe(window.location.hash);
  });

  window.addEventListener("message", function (event) {
    if (event && event.data && typeof event.data.hash === "string") {
      updateParentHash(event.data.hash);
    }
  });

  window.addEventListener("hashchange", function () {
    postHashToIframe(window.location.hash);
  });
}
