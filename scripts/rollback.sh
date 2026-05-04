#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

COMPOSE_FILE="${PROD_COMPOSE_FILE}"
RELEASE_DIR="${RELEASE_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin not found"
  exit 1
fi

SNAPSHOT_FILE="${1:-}"
if [[ -z "$SNAPSHOT_FILE" ]]; then
  SNAPSHOT_FILE="$(ls -1t "$RELEASE_DIR"/*.env 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$SNAPSHOT_FILE" || ! -f "$SNAPSHOT_FILE" ]]; then
  echo "snapshot file not found"
  echo "usage: ./scripts/rollback.sh <deploy/releases/<timestamp>.env>"
  exit 1
fi

# shellcheck disable=SC1090
source "$SNAPSHOT_FILE"

if [[ -z "${PREV_API_IMAGE_ID:-}" || -z "${PREV_WEB_IMAGE_ID:-}" ]]; then
  echo "snapshot does not contain previous api/web image ids"
  exit 1
fi

if [[ -n "${PREV_ACCOUNT_IMAGE_ID:-}" ]]; then
  echo "[rollback] retagging previous account image"
  docker tag "$PREV_ACCOUNT_IMAGE_ID" luggage-account-api:latest
else
  echo "[rollback] PREV_ACCOUNT_IMAGE_ID missing, skip account image retag"
fi

if [[ -n "${PREV_GATEWAY_IMAGE_ID:-}" ]]; then
  echo "[rollback] retagging previous gateway image"
  docker tag "$PREV_GATEWAY_IMAGE_ID" luggage-gateway-api:latest
else
  echo "[rollback] PREV_GATEWAY_IMAGE_ID missing, skip gateway image retag"
fi

echo "[rollback] retagging previous api/web images"
docker tag "$PREV_API_IMAGE_ID" luggage-api:latest
docker tag "$PREV_WEB_IMAGE_ID" luggage-web:latest

if [[ -n "${PREV_ADMIN_IMAGE_ID:-}" ]]; then
  echo "[rollback] retagging previous admin image"
  docker tag "$PREV_ADMIN_IMAGE_ID" luggage-admin:latest
else
  echo "[rollback] PREV_ADMIN_IMAGE_ID missing, skip admin image retag"
fi

echo "[rollback] applying compose rollback"
if [[ -n "${PREV_ACCOUNT_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps account
fi
if [[ -n "${PREV_GATEWAY_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps gateway
fi
docker compose -f "$COMPOSE_FILE" up -d --no-deps api
docker compose -f "$COMPOSE_FILE" up -d --no-deps web
if [[ -n "${PREV_ADMIN_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps admin
fi

echo "[rollback] verifying containers"
for service in luggage-gateway-api-prod luggage-web-prod luggage-admin-prod; do
  running="$(docker inspect -f '{{.State.Running}}' "$service" 2>/dev/null || true)"
  if [[ "$running" != "true" ]]; then
    echo "rollback failed: $service is not running"
    exit 1
  fi
done

echo "[rollback] done"
docker compose -f "$COMPOSE_FILE" ps
