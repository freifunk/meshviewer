#!/bin/sh

if [ ! -e /usr/share/nginx/html/config.json ]; then
  echo ""
  echo "!!! MESHVIEWER CONFIG NOT FOUND: /usr/share/nginx/html/config.json"
  echo ""
  exit 1
fi
