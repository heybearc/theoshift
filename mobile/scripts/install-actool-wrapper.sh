#!/bin/sh
set -eu
bin="/Applications/Xcode.app/Contents/Developer/usr/bin"
wrapper="$(cd "$(dirname "$0")" && pwd)/actool-bundle-id.sh"
if [ ! -e "$bin/actool.real" ]; then
  mv "$bin/actool" "$bin/actool.real"
fi
cp "$wrapper" "$bin/actool"
chmod 755 "$bin/actool"
chown root:wheel "$bin/actool"
