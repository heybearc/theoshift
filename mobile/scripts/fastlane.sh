#!/bin/sh
set -eu

# Agent shells have no terminal. actool deadlocks without one, and Xcode's
# thinned catalog compile also deadlocks unless --bundle-identifier is set.
# install-actool-wrapper.sh adds that flag when ACTOOL_FALLBACK_BUNDLE_ID is set.
if [ -z "${THEOSHIFT_HAS_TTY:-}" ] && [ ! -t 0 ]; then
  export THEOSHIFT_HAS_TTY=1
  exec script -q /dev/null "$0" "$@"
fi

if [ -x /opt/homebrew/opt/ruby/bin/ruby ]; then
  export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
fi

export ACTOOL_FALLBACK_BUNDLE_ID="app.theoshift.volunteer"

cd "$(dirname "$0")/.."
exec bundle exec fastlane "$@"
