#!/bin/sh
set -eu

if [ -x /opt/homebrew/opt/ruby/bin/ruby ]; then
  export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
fi

cd "$(dirname "$0")/.."
exec bundle exec fastlane "$@"
