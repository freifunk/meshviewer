(function() {

    var iframe=document.getElementById("meshviewer-embedded")
    if (!iframe) {
        console.log("IFrame 'meshviewer-embedded' not found")
        return;
    }
    if (!iframe.contentWindow) {
        console.log("Element 'meshviewer-embedded' seems not to be a valid iframe")
        return;
    }

    function updateIframeHash() { // see https://gist.github.com/manufitoussi/7529fa882ff0b737f257
        // iframe is just starting.
        var newHash = window.location.hash;
        var srcStr = iframe.getAttribute('src');
        var words = srcStr.split('#');
        var href = words[0];
        var newSrc = href + newHash;
        iframe.setAttribute('src', newSrc);
    };

    updateIframeHash();
    window.addEventListener("message", (event) => {
        if (event && event.data && event.data.hash) {
            window.location.replace(event.data.hash);
        }
    }, false);
    window.onhashchange = updateIframeHash;
}) ();
