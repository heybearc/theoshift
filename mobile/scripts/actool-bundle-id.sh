#!/bin/sh
# Xcode 27's thinned asset-catalog compile omits --bundle-identifier and then
# deadlocks. Archive builds export ACTOOL_FALLBACK_BUNDLE_ID so this wrapper
# can add the missing flag. Other actool calls are unchanged.
real="/Applications/Xcode.app/Contents/Developer/usr/bin/actool.real"
if [ ! -x "$real" ]; then
  real="/Applications/Xcode.app/Contents/Developer/usr/bin/actool"
fi
compile=0
has_bundle=0
for arg in "$@"; do
  if [ "$arg" = "--compile" ]; then
    compile=1
  fi
  if [ "$arg" = "--bundle-identifier" ]; then
    has_bundle=1
  fi
done
if [ "$compile" -eq 1 ] && [ "$has_bundle" -eq 0 ] && [ -n "${ACTOOL_FALLBACK_BUNDLE_ID:-}" ]; then
  exec "$real" "$@" --bundle-identifier "$ACTOOL_FALLBACK_BUNDLE_ID"
fi
exec "$real" "$@"
