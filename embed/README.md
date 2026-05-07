# Embed Wrapper

This directory contains a small wrapper page for embedding Meshviewer in an iframe while keeping deep-links in sync in both directions.

## Development

Start the dev server:

```bash
npm run dev:fixtures
```

Then open:

```text
http://127.0.0.1:5173/embed/
```

The wrapper loads `embed/index.html` in an iframe and synchronizes the hash between parent page and embedded Meshviewer via `postMessage`.

## Embedding

Use `embed/index.html` as the outer page. Deep-links work in both directions:

- parent hash changes update the embedded Meshviewer
- hash changes inside the embedded Meshviewer update the parent URL

The synchronization uses `postMessage`, so the setup also works when parent page and embedded Meshviewer are served from different domains.
