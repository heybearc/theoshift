#!/bin/sh
set -eu

# Xcode's asset compiler (actool) deadlocks in ibtoold when stdin is not a
# terminal. Agent shells and CI pipes are not terminals. Give the build one.
if [ -z "${THEOSHIFT_HAS_TTY:-}" ] && [ ! -t 0 ]; then
  export THEOSHIFT_HAS_TTY=1
  exec script -q /dev/null "$0" "$@"
fi

if [ -x /opt/homebrew/opt/ruby/bin/ruby ]; then
  export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
fi

cd "$(dirname "$0")/.."
exec bundle exec fastlane "$@"
