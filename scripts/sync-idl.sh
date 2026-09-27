#!/usr/bin/env bash
# Copy the Anchor IDL and TS types from target/ into the frontend.
# Usage: scripts/sync-idl.sh [--build]   (--build runs `anchor build` first)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM=swap
IDL_SRC="$ROOT/target/idl/$PROGRAM.json"
TYPES_SRC="$ROOT/target/types/$PROGRAM.ts"
IDL_DST="$ROOT/fe/ctx/${PROGRAM}_idl.json"
TYPES_DST="$ROOT/fe/ctx/$PROGRAM.ts"

if [[ "${1:-}" == "--build" ]]; then
  (cd "$ROOT" && anchor build)
fi

for f in "$IDL_SRC" "$TYPES_SRC"; do
  [[ -f "$f" ]] || { echo "missing $f, run anchor build first" >&2; exit 1; }
done

# Refuse to copy a stale IDL: its address must match declare_id! in the program.
DECLARED=$(grep -oP 'declare_id!\("\K[^"]+' "$ROOT/programs/$PROGRAM/src/lib.rs")
IDL_ADDR=$(grep -oP '^\s*"address":\s*"\K[^"]+' "$IDL_SRC" | head -1)
if [[ "$DECLARED" != "$IDL_ADDR" ]]; then
  echo "IDL address $IDL_ADDR != declare_id! $DECLARED, rebuild with anchor build" >&2
  exit 1
fi

cp "$IDL_SRC" "$IDL_DST"
cp "$TYPES_SRC" "$TYPES_DST"
echo "synced $PROGRAM IDL + types ($IDL_ADDR) into fe/ctx/"
