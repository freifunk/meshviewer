# Meshviewer Development

Following you can find some wording and used functionality for this project.

Normally you should use meaningful and self explaining names for variables and functions
but sometimes using common conventions might help as well, for example `i` / `j` for index, `e` for exceptions or events etc.
but also names based on elements like `p`, `a`, `div`..

## Functions

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
