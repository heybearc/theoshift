#!/bin/sh
# Install the phone app on this Mac and run the Maestro flows in .maestro/.
# iOS uses the Simulator. Android uses the local emulator.
# qa-01 still checks the website and phone API. It does not drive the phone screen.
#
# Usage, from mobile/:
#   npm run test:phone
#   npm run test:phone -- android
#   npm run test:phone -- ios

set -eu

if [ -z "${THEOSHIFT_HAS_TTY:-}" ] && [ ! -t 0 ]; then
  export THEOSHIFT_HAS_TTY=1
  exec script -q /dev/null "$0" "$@"
fi

cd "$(dirname "$0")/.."
PLATFORM="${1:-ios}"
LOG="${TMPDIR:-/tmp}/theoshift-phone-test.log"
PIDFILE="${TMPDIR:-/tmp}/theoshift-phone-test.pid"

if [ -z "${JAVA_HOME:-}" ] && [ -x /opt/homebrew/opt/openjdk@17/bin/java ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
export PATH="$HOME/.maestro/bin:$PATH"
if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is not installed. Install it on this Mac with:" >&2
  echo "  curl -Ls https://get.maestro.mobile.dev | bash" >&2
  exit 1
fi

stop_app() {
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" >/dev/null 2>&1 || true
    rm -f "$PIDFILE"
  fi
}
trap stop_app EXIT

wait_for_app() {
  i=0
  while [ "$i" -lt 240 ]; do
    if grep -q -E "CommandError|exited with non-zero code|BUILD FAILED|The app build stopped" "$LOG"; then
      echo "The app build stopped before it was ready." >&2
      tail -n 40 "$LOG" >&2
      exit 1
    fi
    if grep -q "Logs for your project will appear below" "$LOG"; then
      return 0
    fi
    if ! kill -0 "$(cat "$PIDFILE")" >/dev/null 2>&1; then
      echo "The app build stopped before it was ready." >&2
      tail -n 40 "$LOG" >&2
      exit 1
    fi
    i=$((i + 1))
    sleep 5
  done
  echo "The app did not finish launching." >&2
  tail -n 40 "$LOG" >&2
  exit 1
}

case "$PLATFORM" in
  ios)
    if ! command -v xcrun >/dev/null 2>&1; then
      echo "Xcode is required for the iOS Simulator." >&2
      exit 1
    fi
    if ! xcrun simctl list runtimes | grep -q "iOS"; then
      echo "The iOS Simulator runtime is not installed. On this Mac run:" >&2
      echo "  xcodebuild -downloadPlatform iOS" >&2
      exit 1
    fi
    pkill -f ibtoold >/dev/null 2>&1 || true
    pkill -f AssetCatalogAgent >/dev/null 2>&1 || true
    : >"$LOG"
    npx expo run:ios >"$LOG" 2>&1 &
    echo $! >"$PIDFILE"
    wait_for_app
    ;;
  android)
    if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
      export ANDROID_HOME="$HOME/Library/Android/sdk"
    fi
    if [ -z "${ANDROID_HOME:-}" ] || [ ! -x "$ANDROID_HOME/emulator/emulator" ]; then
      echo "The Android SDK emulator is not installed on this Mac." >&2
      exit 1
    fi
    export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
    if [ -f fastlane/.env ]; then
      set -a
      # shellcheck disable=SC1091
      . ./fastlane/.env
      set +a
    fi
    if ! adb devices | grep emulator | grep -q 'device$'; then
      AVD="$(emulator -list-avds | head -n 1)"
      if [ -z "$AVD" ]; then
        echo "No Android emulator image is installed." >&2
        exit 1
      fi
      emulator -avd "$AVD" -netdelay none -netspeed full >/dev/null 2>&1 &
      adb wait-for-device
      booted=0
      while [ "$booted" -lt 90 ]; do
        if adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'; then
          break
        fi
        booted=$((booted + 1))
        sleep 2
      done
    fi
    adb uninstall app.theoshift.volunteer >/dev/null 2>&1 || true
    : >"$LOG"
    npx expo run:android >"$LOG" 2>&1 &
    echo $! >"$PIDFILE"
    wait_for_app
    ;;
  *)
    echo "Use ios or android." >&2
    exit 1
    ;;
esac

maestro test .maestro
