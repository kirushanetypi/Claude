#!/usr/bin/env bash
# One-shot VPS bootstrap: docker + clone + compose up.
# Usage (as root, on fresh Debian/Ubuntu VPS):
#
#   DOMAIN=finance.kirushanetypi.com \
#   INITIAL_USER_EMAIL=you@example.com \
#   INITIAL_USER_PASSWORD='change-me-strong' \
#   INITIAL_USER_NAME='Kirill' \
#   bash <(curl -fsSL https://raw.githubusercontent.com/kirushanetypi/Claude/claude/finance-web-app-50hMJ/scripts/bootstrap.sh)
#
# Optional env:
#   REPO_URL        — default https://github.com/kirushanetypi/Claude.git
#   BRANCH          — default claude/finance-web-app-50hMJ
#   DEPLOY_DIR      — default /opt/finance
#   AUTH_SECRET     — auto-generated via openssl if unset

set -euo pipefail

: "${DOMAIN:?DOMAIN is required (e.g. finance.kirushanetypi.com)}"
: "${INITIAL_USER_EMAIL:?INITIAL_USER_EMAIL is required}"
: "${INITIAL_USER_PASSWORD:?INITIAL_USER_PASSWORD is required (min 8 chars)}"

INITIAL_USER_NAME="${INITIAL_USER_NAME:-Admin}"
REPO_URL="${REPO_URL:-https://github.com/kirushanetypi/Claude.git}"
BRANCH="${BRANCH:-claude/finance-web-app-50hMJ}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/finance}"

log() { printf '\033[1;36m[bootstrap] %s\033[0m\n' "$*"; }

# 1. docker
if ! command -v docker >/dev/null 2>&1; then
  log "installing docker..."
  apt-get update -y
  apt-get install -y --no-install-recommends ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  log "docker already installed ($(docker --version))"
fi

# 2. git
if ! command -v git >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends git
fi

# 3. repo
log "syncing repo at $DEPLOY_DIR ..."
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  rm -rf "$DEPLOY_DIR"
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
else
  git -C "$DEPLOY_DIR" fetch origin "$BRANCH" --depth=1
  git -C "$DEPLOY_DIR" reset --hard FETCH_HEAD
fi

cd "$DEPLOY_DIR"

# 4. .env.production
if [ -z "${AUTH_SECRET:-}" ]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
fi
log "writing .env.production ..."
umask 077
cat > .env.production <<EOF
DOMAIN=$DOMAIN
AUTH_SECRET=$AUTH_SECRET
AUTH_URL=https://$DOMAIN
AUTH_TRUST_HOST=true
INITIAL_USER_EMAIL=$INITIAL_USER_EMAIL
INITIAL_USER_NAME=$INITIAL_USER_NAME
INITIAL_USER_PASSWORD=$INITIAL_USER_PASSWORD
EOF

# 5. firewall sanity
if command -v ufw >/dev/null 2>&1; then
  ufw status | grep -q "Status: active" && {
    ufw allow 80/tcp  || true
    ufw allow 443/tcp || true
  }
fi

# 6. build & up
log "docker compose up -d --build (may take 5-10 min on 1GB RAM)..."
docker compose --env-file .env.production pull || true
docker compose --env-file .env.production up -d --build

log "done. follow logs with:"
log "  docker compose -f $DEPLOY_DIR/docker-compose.yml logs -f"
log "  open https://$DOMAIN once DNS + cert are ready (Caddy gets LE cert on first request)"
