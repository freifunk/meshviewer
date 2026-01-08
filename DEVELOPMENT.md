# Meshviewer Development

## Building

### Build yourself

- Clone this repository
- Run `npm install`
- Place your config file in `public/config.json`.
  You can copy the example config for testing/development: `cp config.example.json public/config.json`.
- Run `npm run build`
- A production build can then be found in [`/build`](./build)

Hint: You can start a development server with `npm run dev`

### Build and run using Docker

You have to copy `config.example.json` to `public/config.json`.

Static local instance:

```bash
docker run -it --rm -u $(id -u):$(id -g) -v "$PWD":/app -w /app node npm install
docker run -it --rm -u $(id -u):$(id -g) -v "$PWD":/app -w /app node npm run build
docker run -it --rm -v "$PWD/build":/usr/share/nginx/html -p 8080:80 --name nginx nginx
```

The map is reachable at [localhost:8080](http://localhost:8080).
Start a development environment with hot-reload:

```bash
docker run -it --rm --name meshviewer-dev \
  -u $(id -u):$(id -g) \
  -v "$PWD":/app -w /app \
  -e NODE_ENV=development \
  -p 5173:5173 \
  node npm run dev -- --host 0.0.0.0
```

## Workflow

To submit a feature, you should fork this repository and commit your changes on a branch of your fork.
Then you can open a PR against this repository.

To align your changes with the linter of this project run

`npm run lint:fix`

## Conventions

Following you can find some wording and used functionality for this project.

Normally you should use meaningful and self explaining names for variables and functions
but sometimes using common conventions might help as well, for example `i` / `j` for index, `e` for exceptions or events etc.
but also names based on elements like `p`, `a`, `div`..

### Functions

`_.t("[translation.selector]")`
: Lookup translation based on dotted path from `public/locale/[language].json`

## Variables

`a` / `b`
: Used when sorting data

`d`
: Is normally used to represent a selected dom node but can be (sadly) any data object.

`el`
: An element or dom node

`f`
: Functions / callbacks

`L`
: [Leaflet.js](https://github.com/Leaflet/Leaflet)

`V`
: [Snabbdom](https://github.com/snabbdom/snabbdom) virtual dom

## Addition of new icons

To add new icons to the `meshviewer.woff2` icon-set, one must edit the icon-set manually.

- This can be done by uploading the existing `meshviewer.tff` to https://icomoon.io/new-app
- Then, one can add a new icon by searching in the UI or uploading an SVG.
- Finally, export the iconset and replace the existing one
