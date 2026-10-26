#!/usr/bin/env bash
# TheoShift published release gate (D-066).
# A fixed behavioral set, plus one area when the change touches it.
# Page-load smoke is not the gate.
#
# Usage:
#   RELEASE_BASE_URL=https://green.theoshift.com bash scripts/release-test.sh gate
#   BASE_REV=<sha> bash scripts/release-test.sh detect
# Areas: gate positions volunteers auth full

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GATE=(
  tests/release-gate/chat-pinning.spec.ts
  tests/release-gate/volunteers-oversight-removal.spec.ts
)

area_files() {
  case "$1" in
    gate) ;;
    positions)
      cat <<'EOF'
tests/generated-release-positions-day-board.spec.ts
tests/generated-release-day-board-bulk.spec.ts
tests/generated-release-event-overseers.spec.ts
tests/generated-release-shift-select-visible.spec.ts
tests/generated-release-bulk-create-templates.spec.ts
tests/conflict-detection.spec.ts
EOF
      ;;
    volunteers)
      cat <<'EOF'
tests/generated-release-volunteers-filter-persist.spec.ts
tests/generated-release-volunteer-import-roster.spec.ts
tests/generated-release-skip-changeme-availability.spec.ts
tests/generated-release-shift-click-checkbox.spec.ts
EOF
      ;;
    auth)
      echo tests/generated-release-overseer-login-case.spec.ts
      ;;
    *)
      echo "Unknown area: $1" >&2
      echo "Areas: gate positions volunteers auth full" >&2
      exit 2
      ;;
  esac
}

detect_areas() {
  local rev="${BASE_REV:-}"
  local files areas=()
  if [ -z "$rev" ]; then
    echo gate
    return
  fi
  files="$(git diff --name-only "${rev}..HEAD" || true)"
  if printf '%s\n' "$files" | grep -Eq 'prisma/schema\.prisma|prisma/migrations/|pages/auth/|pages/api/auth/'; then
    echo full
    return
  fi
  if printf '%s\n' "$files" | grep -Eq 'positions-next/|pages/events/\[id\]/positions|pages/api/events/\[id\]/positions|pages/api/events/\[id\]/assignments|components/positions/BulkPositionCreator|pages/api/shift-templates'; then
    areas+=(positions)
  fi
  if printf '%s\n' "$files" | grep -Eq 'pages/events/\[id\]/volunteers|pages/api/events/\[id\]/availability|src/lib/placeholderEmail|pages/api/volunteer/'; then
    areas+=(volunteers)
  fi
  if [ "${#areas[@]}" -eq 0 ]; then
    echo gate
  else
    echo "${areas[*]}"
  fi
}

if [ "${1:-}" = "detect" ]; then
  detect_areas
  exit 0
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/release-test.sh <gate|positions|volunteers|auth|full|detect>" >&2
  exit 2
fi

for area in "$@"; do
  if [ "$area" = "full" ]; then
    if [ "$#" -ne 1 ]; then
      echo "full runs alone" >&2
      exit 2
    fi
  else
    area_files "$area" >/dev/null
  fi
done

BASE_URL="${RELEASE_BASE_URL:-${BASE_URL:-}}"
if [ -z "$BASE_URL" ]; then
  echo "Set RELEASE_BASE_URL or BASE_URL to the STANDBY origin" >&2
  exit 2
fi
export BASE_URL

if [ "$1" = "full" ]; then
  echo "TheoShift release area: full"
  exec npm run test:e2e:full
fi

PATHS=("${GATE[@]}")
for area in "$@"; do
  if [ "$area" = "gate" ]; then
    continue
  fi
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    PATHS+=("$file")
  done < <(area_files "$area")
done

MISSING=0
for file in "${PATHS[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Missing gate file: $file" >&2
    MISSING=1
  fi
done
if [ "$MISSING" -ne 0 ]; then
  exit 1
fi

echo "TheoShift release area: $* (${#PATHS[@]} files, gate included)"
npx playwright test "${PATHS[@]}"
