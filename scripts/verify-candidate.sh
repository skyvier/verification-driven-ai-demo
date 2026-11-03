#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: sh scripts/verify-candidate.sh BASELINE CANDIDATE" >&2
  exit 2
fi

baseline=$1
candidate=$2
implementation=src/implementation
service=$implementation/booking-service.ts
if [ ! -d "$candidate/$implementation" ] || [ -L "$candidate/$implementation" ] ||
   [ ! -f "$candidate/$service" ] || [ -L "$candidate/$service" ]; then
  echo "Candidate service must be a regular file, not a symlink" >&2
  exit 1
fi
non_regular_entries=$(find "$candidate/$implementation" ! -type d ! -type f -print -quit)
if [ -n "$non_regular_entries" ]; then
  echo "Candidate implementation may contain only regular files and directories" >&2
  exit 1
fi

verification=$(mktemp -d "${TMPDIR:-/tmp}/booking-verification.XXXXXX")
trap 'rm -rf "$verification"' EXIT HUP INT TERM
cp -R "$baseline/." "$verification/"
rm -rf "$verification/$implementation"
cp -R "$candidate/$implementation" "$verification/$implementation"
mkdir -p "$verification/dist"
. "$baseline/scripts/demo-permissions.sh"
codex sandbox -C "$verification" -P booking-verification \
  -c "permissions.booking-verification.filesystem=$verification_filesystem_permissions" \
  -c 'permissions.booking-verification.network.enabled=false' \
  -- npm test
