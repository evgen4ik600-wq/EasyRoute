#!/bin/sh
set -eu
BASE='https://raw.githubusercontent.com/evgen4ik600-wq/test/main'
tmp="/tmp/easyroute-install.$$"
trap 'rm -f "$tmp"' EXIT
wget -qO "$tmp" "$BASE/install.sh?$(date +%s)"
sh "$tmp"
