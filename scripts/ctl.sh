#!/usr/bin/env bash
# HMAC-signed client for the VPS control API.
#
# Usage:
#   CONTROL_SECRET=... CONTROL_BASE=https://finance.kirushanetypi.com \
#     ./scripts/ctl.sh <cmd> [args]
#
# Commands:
#   ping                      — anonymous liveness check
#   ps                        — docker compose ps
#   logs <app|caddy> [N]      — tail N log lines (default 200)
#   deploy                    — pull + rebuild + restart app
#   restart <app|caddy>       — restart one service
#   exec <init-admin|migrate> — run whitelisted one-shot
#   raw <METHOD> <PATH>       — manual signed request

set -euo pipefail

: "${CONTROL_SECRET:?CONTROL_SECRET env var required}"
: "${CONTROL_BASE:?CONTROL_BASE env var required (e.g. https://finance.kirushanetypi.com)}"

sign_and_call() {
  local method="$1" path="$2" body="${3:-}"
  local ts body_hash sig
  ts="$(date +%s)"
  body_hash="$(printf '%s' "$body" | sha256sum | cut -d' ' -f1)"
  sig="$(printf '%s\n%s\n%s\n%s' "$method" "$path" "$ts" "$body_hash" \
    | openssl dgst -sha256 -hmac "$CONTROL_SECRET" -hex \
    | sed 's/^.* //')"
  if [ "$method" = "GET" ]; then
    curl -sS -H "X-Timestamp: $ts" -H "X-Signature: $sig" \
      "${CONTROL_BASE}${path}"
  else
    curl -sS -X "$method" \
      -H "X-Timestamp: $ts" -H "X-Signature: $sig" \
      --data-binary "$body" \
      "${CONTROL_BASE}${path}"
  fi
}

cmd="${1:-}"; shift || true
case "$cmd" in
  ping)
    curl -sS "${CONTROL_BASE}/__ping"; echo ;;
  ps)
    sign_and_call GET /__ps ;;
  logs)
    svc="${1:?service name required}"; tail="${2:-200}"
    sign_and_call GET "/__logs/${svc}?tail=${tail}" ;;
  deploy)
    sign_and_call POST /__deploy ;;
  restart)
    svc="${1:?service name required}"
    sign_and_call POST "/__restart?service=${svc}" ;;
  exec)
    action="${1:?action required}"
    sign_and_call POST "/__exec?action=${action}" ;;
  raw)
    sign_and_call "$1" "$2" "${3:-}" ;;
  *)
    echo "usage: $0 <ping|ps|logs|deploy|restart|exec|raw> [args]" >&2
    exit 2 ;;
esac
