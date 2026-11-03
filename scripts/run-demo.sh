#!/bin/sh
set -eu

repository=$(git rev-parse --show-toplevel)
checkpoint=$(git -C "$repository" rev-parse HEAD)
run_directory=$(mktemp -d "${TMPDIR:-/tmp}/booking-demo.XXXXXX")
baseline=$run_directory/baseline
workspace=$run_directory/workspace
mkdir -p "$baseline" "$workspace"

echo "Checkpoint: $checkpoint"
echo "Demo files: $run_directory"
git -C "$repository" archive "$checkpoint" | tar -x -C "$baseline"
(cd "$baseline" && npm ci --ignore-scripts)
cp -R "$baseline/." "$workspace/"
mkdir -p "$workspace/dist"
. "$baseline/scripts/demo-permissions.sh"

echo "Starting Codex; only src/implementation and dist are writable."
agent_status=0
codex exec --ignore-user-config --skip-git-repo-check \
  -C "$workspace" \
  -c 'approval_policy="never"' \
  -c 'default_permissions="booking-demo"' \
  -c "permissions.booking-demo.filesystem=$demo_filesystem_permissions" \
  -c 'permissions.booking-demo.network.enabled=false' \
  - < "$baseline/IMPLEMENTATION_AGENT_PROMPT.md" || agent_status=$?

echo "Running trusted verification from the checkpoint."
verification_status=0
sh "$baseline/scripts/verify-candidate.sh" "$baseline" "$workspace" || verification_status=$?
if [ "$agent_status" -ne 0 ]; then
  echo "Codex exited with status $agent_status; the task is incomplete." >&2
  exit 1
fi
if [ "$verification_status" -ne 0 ]; then
  echo "Trusted verification failed; the task is incomplete." >&2
  exit 1
fi
echo "Trusted verification passed. Candidate: $workspace/src/implementation/booking-service.ts"
