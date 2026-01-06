# Configuration

You can find an example configuration at `config.example.json`. This guide tries to list some of the existing configuration flags.

## General

`DataPath` describes the URL where your `./meshviewer.json` file is located. It can be relative. There should be a list of nodes and links.

```json
{
  "dataPath": ["https://yanic.batman15.ffffm.net/"],
```

```json
  "siteName": "Freifunk Frankfurt",
  "maxAge": 21, # default 14, number of days a node is marked as new
  "maxAgeAlert": 5
  "nodeZoom": 19, # default 18, max. 19, OpenStreetMap zoomlevel when a node is selected
```

### List with general Links

You can add some general links via a list. They get displayed in the header of the sidebar.

```json
  "linkList": [
    {
      "href": "https://freifunk.fail/contact/",
      "title": "Kontakt"
    },
    {
      "href": "https://freifunk.fail/de/imprint/",
      "title": "Impressum"
    }
  ],
```

## Map

Defines a List of Maps that are used as a background.

```json
  "mapLayers": [
    {
      "name": "OpenStreetMap", # Displayed in the browser
      "url": "https://tiles.ffm.freifunk.net/{z}/{x}/{y}.png",
      "config": {
        "type": "osm",
        "maxZoom": 19,
        "attribution": "<a href='https://github.com/freifunk/meshviewer/issues' target='_blank'>Report Bug</a> | Map data &copy; <a href\"http://openstreetmap.org\">OpenStreetMap</a> contributor"
      }
    },
    {
      "name": "BaseMap.de (Vektor)",
      "url": "https://sgx.geodatenzentrum.de/gdz_basemapworld_vektor/styles/bm_web_wld_col.json",
      "type": "vector",
      "config": {
        "attribution": "&copy; basemap.de / <a href='https://www.bkg.bund.de'>BKG</a> (2025) <a href='https://creativecommons.org/licenses/by/4.0/'>CC BY 4.0</a>; Datenquellen: &copy; GeoBasis-DE / <a href='https://www.bkg.bund.de'>BKG</a> (2025) <a href='https://creativecommons.org/licenses/by/4.0/'>CC BY 4.0</a>; außerhalb Deutschlands: &copy; <a href='https://www.openstreetmap.org/copyright'>Open Street Map Mitwirkende ODbL v. 1.0</a> ; © <a href='https://openmaptiles.org/'>OpenMapTiles</a>"
      }
    }
  ],
```

`fixedCenter` defines the default area that is visible when opening the map.

```json
  "fixedCenter": [
    [50.5099, 8.1393],
    [49.9282, 9.3164]
  ],
```

### Custom Features

Via `geojson` you can add custom features to the map like district boundaries.

```json
    "geo": [
        {
            "json": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {
                            "stroke": "#555555",
                            "stroke-width": 2,
                            "stroke-opacity": 1,
                            "fill": "#6db743",
                            "fill-opacity": 0.5,
                            "segment": 3
                        },
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [
                                        6.170628106033859,
                                        50.80453937432226
                                    ],
                                    [
                                        6.173592924692929,
                                        50.80457163351845
                                    ]
                                ]
                            ]
                        }
                    }
                ]
            },
            "option": {
                "style": {
                    "color": "#555555",
                    "weight": 5,
                    "opacity": 0.4,
                    "fillColor": "#555555",
                    "fillOpacity": 0.1
                }
            }
        }
    ],
}
```

## Domain Names

Map human readable names to the domain from the individual node as stated in the `meshviewer.json` to be displayed as an info when the node is selected.

```json
  "domainNames": [
    { "domain": "ffffm_60431", "name": "60431 Frankfurt am Main" },
    { "domain": "ffffm_default", "name": "Default" }
  ],
```

## Node Infos

Add Links to external Sites like wikis or monitoring. You might use one of the following variables as placeholders:

| variable        | description                 |
| --------------- | --------------------------- |
| `{NODE_CUSTOM}` | node_name with custom regex |
| `{NODE_ID}`     | mac address of the node     |
| `{NODE_NAME}`   | hostname                    |
| `{TIME}`        |                             |

Here are some examples:

```json
  "nodeInfos": [
    {
      "name": "Clientstatistik", # required, title of the section
      "href": "https://freifunk.fail/dashboard/db/nodes?var-name={NODE_CUSTOM}&from=now-7d&to=now", # required, link to website
      "image": "https://freifunk.fail/render/dashboard-solo/db/node-details-for-map?panelId=7&var-id={NODE_ID}&from=now-7d&to=now&width=600&height=300&theme=light&_t={TIME}", # optional
      "title": "Knoten {NODE_ID} ({NODE_NAME})" # required, is used as helptext if an image is present, otherwise text of the link
    },
  ],
```

## Global Infos

TODO

```json
  "globalInfos": [
    {
      "name": "Wochenstatistik",
      "href": "https://freifunk.fail/dashboard/db/deck?from=now-7d&to=now",
      "image": "https://freifunk.fail/render/dashboard-solo/db/deck?&panelId=22&from=now-7d&to=now&width=600&height=300&theme=light&_t={TIME}", # optional
      "title": "Bild der Wochenstatistik"
    }
  ],
```

## Devices

Nodes can display a picture of the device type. These need to be provided as svg pictures. There is an existing repository with these pictures (see source below).

```json
  "devicePictures": "https://map.aachen.freifunk.net/pictures-svg/{MODEL_NORMALIZED}.svg",
  "devicePicturesSource": "<a href='https://github.com/freifunk/device-pictures'>https://github.com/freifunk/device-pictures</a>",
  "devicePicturesLicense": "CC-BY-NC-SA 4.0",
```

```json
  "node_custom": "/[^a-z0-9\\-\\.]/ig", # regex that get applied to node_name, e.g. used for noamlisation of domain names
```

### Deprecation and EOL Warning

Both the deprecation and the EOL warning can be turned off with `"deprecation_enabled": false` - but we wouldn't suggest it.

You can insert custom HTML into the deprecation and eol warning via `"deprecation_text":""` and `"eol_text":""` respectively.

```json
  "deprecation_text": "Hier kann ein eigener Text für die Deprecation Warning (inkl. HTML) stehen!", # text that gets displayed when a node with a device defined in deprecated (see below) is selected
  "eol_text": "Hier kann ein eigener Text für die End-of-Life Warnung (inkl. HTML) stehen!", # same as deprecated, but for eol
  "deprecation_enabled": true, # turns off eol and deprecation warnings

# define a list of devices that are deprecated
  "deprecated": [
    "D-Link DGS-1210",
    "TP-Link Archer C2 v3",
  ],

# define a list of devices that are End of Life
  "eol": [
    "A5-V11",
    "AP121",
  ]
}
```
