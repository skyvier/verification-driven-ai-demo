#!/bin/sh
set -eu

repository=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
. "$repository/scripts/demo-permissions.sh"
workspace=$(mktemp -d "${TMPDIR:-/tmp}/booking-sandbox-test.XXXXXX")
trap 'rm -rf "$workspace"' EXIT HUP INT TERM
mkdir -p "$workspace/src/implementation" "$workspace/dist" "$workspace/test"
printf 'contract\n' > "$workspace/src/booking.ts"
printf 'test\n' > "$workspace/test/booking.test.ts"
printf 'service\n' > "$workspace/src/implementation/booking-service.ts"

codex sandbox -C "$workspace" -P booking-demo \
  -c "permissions.booking-demo.filesystem=$demo_filesystem_permissions" \
  -c 'permissions.booking-demo.network.enabled=false' \
  /bin/sh -c '
    set -eu
    printf "implementation\n" > src/implementation/booking-service.ts
    printf "build\n" > dist/output
    if (printf "modified\n" > test/booking.test.ts) 2>/dev/null; then exit 1; fi
    if (printf "modified\n" > src/booking.ts) 2>/dev/null; then exit 1; fi
    if mv src/booking.ts src/booking.old 2>/dev/null; then exit 1; fi
    if rm test/booking.test.ts 2>/dev/null; then exit 1; fi
    if cp src/implementation/booking-service.ts src/booking.ts 2>/dev/null; then exit 1; fi
  '
test "$(cat "$workspace/src/booking.ts")" = contract
test "$(cat "$workspace/test/booking.test.ts")" = test
echo 'Sandbox boundary checks passed.'
