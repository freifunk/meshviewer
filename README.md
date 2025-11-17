# Meshviewer

[![Build Status](https://img.shields.io/github/actions/workflow/status/freifunk/meshviewer/build-meshviewer.yml?branch=main&style=flat-square)](https://github.com/freifunk/meshviewer/actions?query=workflow%3A%22Build+Meshviewer%22)
[![Release](https://img.shields.io/github/v/release/freifunk/meshviewer?style=flat-square)](https://github.com/freifunk/meshviewer/releases)
[![License: AGPL v3](https://img.shields.io/github/license/freifunk/meshviewer.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)

Meshviewer is an online visualization app to represent nodes and links on a map for Freifunk open mesh network.

## Installation

It is recommended to use the latest release:

- Go to the [release page](https://github.com/freifunk/meshviewer/releases) and download the current build
- Let your webserver serve this build
- Add a config.json to the webdir (based on config.example.json)

## Docker Deployment

Using the GitHub Container Registry (GHCR) you can get the latest dockerized release with `docker compose`.

Put your config.json into the public folder and run the following to deploy a meshviewer:

```
docker compose pull
docker compose up -d
```

The map is reachable at [localhost:8080](http://localhost:8080).

Hint: Instead of the latest release `ghcr.io/freifunk/meshviewer:latest` one can also use version tags for a specific version or `main` for the latest unreleased commits.

## Configuration

The configuration documentation is nowhere near finished.

### Deprecation and EOL Warning

Both the deprecation and the EOL warning can be turned off with `"deprecation_enabled": false` - but we wouldn't suggest it.

You can insert custom HTML into the deprecation and eol warning via `"deprecation_text":""` and `"eol_text":""` respectively.

## Development & Building

To contribute to the project by developing new features, have a look at our [development documentation](DEVELOPMENT.md).
This also includes instructions on building this project.

## History

Meshviewer started as [ffnord/meshviewer](https://github.com/ffnord/meshviewer) for Freifunk Nord
which was extended as [hopglass/hopglass](https://github.com/hopglass/hopglass)
and further expanded by Freifunk Regensburg as [ffrgb/meshviewer](https://github.com/ffrgb/meshviewer).
After maintenance stopped, Freifunk Frankfurt took over expanding the code base as [freifunk-ffm/meshviewer](https://github.com/freifunk-ffm/meshviewer)
and added features like the deprecation warnings.
It is now maintained by the Freifunk Org at [freifunk/meshviewer](https://github.com/freifunk/meshviewer).

## Goals

The goal for this project is to extend Meshviewer, pick off where other forks ended
and integrate those ideas into a code-base that is easily usable by all Freifunk communities.
This also has the benefit that everyone can take advantage of the bundled development resources
for implementing new features and fixing bugs.
