#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/../../scripts/lib/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

STAGE="prod"
SNAPSHOT_FILE=""
SKIP_SMOKE="false"
RUN_SHADOW_SMOKE="true"
API_BASE_URL=""
WEB_BASE_URL=""
ADMIN_BASE_URL=""
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

usage() {
  cat <<USAGE
Usage: ./scripts/release-rollback.sh [options] [snapshot-file]

Options:
  --stage <prod|dev>      Target stage (default: prod)
  --skip-smoke            Skip smoke checks after rollback
  --skip-shadow-smoke     Skip in-container gateway self-check
  --api-base-url <url>    API base URL override
  --web-base-url <url>    Web base URL override
  --admin-base-url <url>  Admin base URL override
  --admin-token <token>   Optional admin JWT for protected checks
  -h, --help              Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stage)
      STAGE="${2:-}"
      shift 2
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
    --web-base-url)
      WEB_BASE_URL="${2:-}"
      shift 2
      ;;
    --admin-base-url)
      ADMIN_BASE_URL="${2:-}"
      shift 2
      ;;
    --admin-token)
      ADMIN_TOKEN="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -n "$SNAPSHOT_FILE" ]]; then
        echo "Unexpected argument: $1"
        usage
        exit 1
      fi
      SNAPSHOT_FILE="$1"
      shift
      ;;
  esac
done

if [[ "$STAGE" != "prod" && "$STAGE" != "dev" ]]; then
  echo "Invalid stage: $STAGE"
  exit 1
fi

verify_docker_ready

if [[ "$STAGE" == "prod" ]]; then
  API_BASE_URL="${API_BASE_URL:-${PROD_API_BASE_URL:-http://127.0.0.1:13001/api}}"
  WEB_BASE_URL="${WEB_BASE_URL:-${PROD_WEB_BASE_URL:-http://127.0.0.1:13000}}"
  ADMIN_BASE_URL="${ADMIN_BASE_URL:-${PROD_ADMIN_BASE_URL:-http://127.0.0.1:13002}}"
else
  API_BASE_URL="${API_BASE_URL:-${DEV_API_BASE_URL:-http://127.0.0.1:13011/api}}"
fi

if [[ "$STAGE" == "prod" ]]; then
  if [[ -n "$SNAPSHOT_FILE" ]]; then
    "$ROOT_DIR/scripts/rollback.sh" "$SNAPSHOT_FILE"
  else
    "$ROOT_DIR/scripts/rollback.sh"
  fi

  if [[ "$SKIP_SMOKE" != "true" ]]; then
    SMOKE_ARGS=(
      --api-base-url "$API_BASE_URL"
      --web-base-url "$WEB_BASE_URL"
      --admin-base-url "$ADMIN_BASE_URL"
    )
    if [[ -n "$ADMIN_TOKEN" ]]; then
      SMOKE_ARGS+=(--admin-token "$ADMIN_TOKEN")
    fi

    "$ROOT_DIR/scripts/smoke.sh" "${SMOKE_ARGS[@]}"

    if [[ "$RUN_SHADOW_SMOKE" == "true" ]]; then
      "$ROOT_DIR/scripts/shadow-gateway-smoke.sh" --stage prod
    fi
  fi

  echo "[release-rollback] prod rollback complete"
  exit 0
fi

COMPOSE_FILE="docker-compose.dev.yml"
RELEASE_DIR="$ROOT_DIR/deploy/dev-releases"

if [[ -z "$SNAPSHOT_FILE" ]]; then
  SNAPSHOT_FILE="$(latest_snapshot_file "$RELEASE_DIR")"
fi

if [[ -z "$SNAPSHOT_FILE" || ! -f "$SNAPSHOT_FILE" ]]; then
  echo "Dev snapshot file not found"
  echo "usage: ./scripts/release-rollback.sh --stage dev <deploy/dev-releases/<timestamp>.env>"
  exit 1
fi

# shellcheck disable=SC1090
source "$SNAPSHOT_FILE"

if [[ -z "${PREV_ACCOUNT_IMAGE_ID:-}" && -z "${PREV_GATEWAY_IMAGE_ID:-}" && -z "${PREV_API_IMAGE_ID:-}" ]]; then
  echo "snapshot does not contain previous dev image ids"
  exit 1
fi

if [[ -n "${PREV_ACCOUNT_IMAGE_ID:-}" ]]; then
  echo "[release-rollback] retagging previous account image"
  docker tag "$PREV_ACCOUNT_IMAGE_ID" luggage-account-api:latest
fi

if [[ -n "${PREV_GATEWAY_IMAGE_ID:-}" ]]; then
  echo "[release-rollback] retagging previous gateway image"
  docker tag "$PREV_GATEWAY_IMAGE_ID" luggage-gateway-api:latest
fi

if [[ -n "${PREV_API_IMAGE_ID:-}" ]]; then
  echo "[release-rollback] retagging previous api image"
  docker tag "$PREV_API_IMAGE_ID" luggage-api:latest
fi

echo "[release-rollback] applying dev compose rollback"
docker compose -f "$COMPOSE_FILE" up -d mysql-devstack
if [[ -n "${PREV_ACCOUNT_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps account-dev
fi
if [[ -n "${PREV_API_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps api-dev
fi
if [[ -n "${PREV_GATEWAY_IMAGE_ID:-}" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps gateway-dev
fi

echo "[release-rollback] verifying dev containers"
verify_containers_running \
  luggage-mysql-devstack \
  luggage-account-api-dev \
  luggage-api-dev \
  luggage-gateway-api-dev

if [[ "$SKIP_SMOKE" != "true" ]]; then
  "$ROOT_DIR/scripts/smoke.sh" \
    --api-base-url "$API_BASE_URL" \
    --skip-web \
    --skip-admin

  if [[ "$RUN_SHADOW_SMOKE" == "true" ]]; then
    "$ROOT_DIR/scripts/shadow-gateway-smoke.sh" --stage dev
  fi
fi

echo "[release-rollback] dev rollback complete"
