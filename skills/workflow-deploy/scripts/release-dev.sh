#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SKILL_DIR/scripts/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

COMPOSE_FILE="${DEV_COMPOSE_FILE}"
RELEASE_DIR="${DEV_RELEASE_DIR}"
SKIP_PREFLIGHT="false"
SKIP_BUILD="false"
SKIP_SMOKE="false"
RUN_SHADOW_SMOKE="true"
ROLLBACK_ON_FAIL="${AUTO_ROLLBACK_ON_FAIL:-true}"
API_BASE_URL="${DEV_API_BASE_URL}"
DEPLOYED="false"
SNAPSHOT_FILE=""

usage() {
  cat <<USAGE
Usage: ./scripts/release-dev.sh [options]

Options:
  --skip-preflight       Skip preflight checks
  --skip-build           Reuse existing latest images
  --skip-smoke           Skip backend smoke checks
  --skip-shadow-smoke    Skip in-container gateway self-check
  --api-base-url <url>   Dev gateway API base URL (default: http://127.0.0.1:13011/api)
  --no-rollback-on-fail  Do not auto-rollback if deploy verification or smoke fails
  -h, --help             Show help
USAGE
}

rollback_if_needed() {
  if [[ "$DEPLOYED" == "true" && "$ROLLBACK_ON_FAIL" == "true" && -n "$SNAPSHOT_FILE" ]]; then
    echo "[release-dev] release failed, rolling back dev stack"
    "$SKILL_DIR/scripts/release-rollback.sh" --stage dev --skip-smoke "$SNAPSHOT_FILE" || true
  fi
}

trap 'status=$?; if [[ $status -ne 0 ]]; then rollback_if_needed; fi' EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-preflight)
      SKIP_PREFLIGHT="true"
      shift
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE="true"
      shift
      ;;
    --skip-shadow-smoke)
      RUN_SHADOW_SMOKE="false"
      shift
      ;;
    --api-base-url)
      API_BASE_URL="${2:-}"
      shift 2
      ;;
    --no-rollback-on-fail)
      ROLLBACK_ON_FAIL="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

verify_docker_ready
mkdir -p "$RELEASE_DIR"

if [[ "$SKIP_PREFLIGHT" != "true" ]]; then
  "$SKILL_DIR/scripts/preflight.sh" --mode dev --skip-build
fi

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
SNAPSHOT_FILE="$RELEASE_DIR/${RELEASE_ID}.env"
PREV_ACCOUNT_IMAGE_ID="$(docker image inspect luggage-account-api:latest --format '{{.Id}}' 2>/dev/null || true)"
PREV_GATEWAY_IMAGE_ID="$(docker image inspect luggage-gateway-api:latest --format '{{.Id}}' 2>/dev/null || true)"
PREV_API_IMAGE_ID="$(docker image inspect luggage-api:latest --format '{{.Id}}' 2>/dev/null || true)"

cat > "$SNAPSHOT_FILE" <<SNAP
STAGE=dev
RELEASE_ID=${RELEASE_ID}
CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RELEASE_COMMIT_SHA=$(current_git_commit)
RELEASE_BRANCH=$(current_git_branch)
PREV_ACCOUNT_IMAGE_ID=${PREV_ACCOUNT_IMAGE_ID}
PREV_GATEWAY_IMAGE_ID=${PREV_GATEWAY_IMAGE_ID}
PREV_API_IMAGE_ID=${PREV_API_IMAGE_ID}
SNAP

if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "[release-dev] building account image"
  docker build -f apps/account-api/Dockerfile -t "luggage-account-api:${RELEASE_ID}" -t "luggage-account-api:latest" .

  echo "[release-dev] building gateway image"
  docker build -f apps/gateway-api/Dockerfile -t "luggage-gateway-api:${RELEASE_ID}" -t "luggage-gateway-api:latest" .

  echo "[release-dev] building api image"
  docker build -f apps/api/Dockerfile -t "luggage-api:${RELEASE_ID}" -t "luggage-api:latest" .
else
  echo "[release-dev] reusing current latest images"
fi

echo "[release-dev] applying compose (mysql-devstack -> account-dev -> api-dev -> gateway-dev)"
docker compose -f "$COMPOSE_FILE" up -d mysql-devstack
docker compose -f "$COMPOSE_FILE" up -d --no-deps account-dev
docker compose -f "$COMPOSE_FILE" up -d --no-deps api-dev
docker compose -f "$COMPOSE_FILE" up -d --no-deps gateway-dev
DEPLOYED="true"

echo "[release-dev] verifying containers"
verify_containers_running \
  luggage-mysql-devstack \
  luggage-account-api-dev \
  luggage-api-dev \
  luggage-gateway-api-dev

if [[ "$SKIP_SMOKE" != "true" ]]; then
  "$SKILL_DIR/scripts/smoke.sh" \
    --api-base-url "$API_BASE_URL" \
    --skip-web \
    --skip-admin

  if [[ "$RUN_SHADOW_SMOKE" == "true" ]]; then
    [[ -f "$SKILL_DIR/scripts/shadow-gateway-smoke.sh" ]] && "$SKILL_DIR/scripts/shadow-gateway-smoke.sh" --stage dev
  fi
fi

save_latest_success_snapshot "$SNAPSHOT_FILE" "$RELEASE_DIR"
trap - EXIT

echo "[release-dev] success"
echo "snapshot: $SNAPSHOT_FILE"
echo "latest success marker: $RELEASE_DIR/latest-success.env"
echo "api: $API_BASE_URL"
