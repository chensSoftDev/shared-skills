#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SKILL_DIR/scripts/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

API_BASE_URL="${API_BASE_URL:-${PROD_API_BASE_URL}}"
WEB_BASE_URL="${WEB_BASE_URL:-${PROD_WEB_BASE_URL}}"
ADMIN_BASE_URL="${ADMIN_BASE_URL:-${PROD_ADMIN_BASE_URL}}"
SHADOW_GATEWAY_BASE_URL="${SHADOW_GATEWAY_BASE_URL:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
SMOKE_RETRY_ATTEMPTS="${SMOKE_RETRY_ATTEMPTS:-3}"
SMOKE_RETRY_DELAY_SEC="${SMOKE_RETRY_DELAY_SEC:-2}"
SMOKE_SKIP_API="${SMOKE_SKIP_API:-false}"
SMOKE_SKIP_ACCOUNT="${SMOKE_SKIP_ACCOUNT:-false}"
SMOKE_SKIP_PUBLIC_DATA="${SMOKE_SKIP_PUBLIC_DATA:-false}"
SMOKE_SKIP_WEB="${SMOKE_SKIP_WEB:-false}"
SMOKE_SKIP_ADMIN="${SMOKE_SKIP_ADMIN:-false}"

usage() {
  cat <<USAGE
Usage: ./scripts/smoke.sh [options]

Options:
  --api-base-url <url>           API base URL (default: \$API_BASE_URL)
  --web-base-url <url>           Web base URL (default: \$WEB_BASE_URL)
  --admin-base-url <url>         Admin base URL (default: \$ADMIN_BASE_URL)
  --shadow-gateway-base-url <url>
                                 Optional shadow gateway API base URL
  --admin-token <token>          Optional admin JWT for protected checks
  --skip-api                     Skip gateway health check
  --skip-account                 Skip account health check via gateway
  --skip-public-data             Skip public products/categories checks
  --skip-web                     Skip web health check
  --skip-admin                   Skip admin login page check
  -h, --help                     Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
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
    --shadow-gateway-base-url)
      SHADOW_GATEWAY_BASE_URL="${2:-}"
      shift 2
      ;;
    --admin-token)
      ADMIN_TOKEN="${2:-}"
      shift 2
      ;;
    --skip-api)
      SMOKE_SKIP_API="true"
      shift
      ;;
    --skip-account)
      SMOKE_SKIP_ACCOUNT="true"
      shift
      ;;
    --skip-public-data)
      SMOKE_SKIP_PUBLIC_DATA="true"
      shift
      ;;
    --skip-web)
      SMOKE_SKIP_WEB="true"
      shift
      ;;
    --skip-admin)
      SMOKE_SKIP_ADMIN="true"
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

echo "[smoke] api=$API_BASE_URL web=$WEB_BASE_URL admin=$ADMIN_BASE_URL"
if [[ -n "$SHADOW_GATEWAY_BASE_URL" ]]; then
  echo "[smoke] shadow-gateway=$SHADOW_GATEWAY_BASE_URL"
fi

require_cmd curl

with_retry() {
  local name="$1"
  shift

  local attempt=1
  while true; do
    if "$@"; then
      return 0
    fi

    if (( attempt >= SMOKE_RETRY_ATTEMPTS )); then
      echo "[fail] $name after ${SMOKE_RETRY_ATTEMPTS} attempts"
      return 1
    fi

    echo "[retry] $name failed (attempt ${attempt}/${SMOKE_RETRY_ATTEMPTS}), retrying in ${SMOKE_RETRY_DELAY_SEC}s"
    sleep "$SMOKE_RETRY_DELAY_SEC"
    attempt=$((attempt + 1))
  done
}

run_json_check() {
  local url="$1"
  local extra_header="${2:-}"

  if [[ -n "$extra_header" ]]; then
    curl -fsS -H "$extra_header" "$url" >/dev/null
  else
    curl -fsS "$url" >/dev/null
  fi
}

run_http_check() {
  local url="$1"
  curl -fsS -L "$url" >/dev/null
}

check_json_endpoint() {
  local url="$1"
  local name="$2"
  local extra_header="${3:-}"

  with_retry "$name" run_json_check "$url" "$extra_header"

  echo "[ok] $name"
}

check_http_endpoint() {
  local url="$1"
  local name="$2"
  with_retry "$name" run_http_check "$url"
  echo "[ok] $name"
}

if [[ "$SMOKE_SKIP_API" != "true" ]]; then
  check_json_endpoint "$API_BASE_URL/health" "api(gateway) health"
fi

if [[ "$SMOKE_SKIP_ACCOUNT" != "true" ]]; then
  check_json_endpoint "$API_BASE_URL/account/health" "account health via gateway"
fi

if [[ "$SMOKE_SKIP_PUBLIC_DATA" != "true" ]]; then
  check_json_endpoint "$API_BASE_URL/products/public" "public products"
  check_json_endpoint "$API_BASE_URL/categories/public" "public categories"
fi

if [[ "$SMOKE_SKIP_WEB" != "true" ]]; then
  check_json_endpoint "$WEB_BASE_URL/api/health" "web health"
fi

if [[ "$SMOKE_SKIP_ADMIN" != "true" ]]; then
  check_http_endpoint "$ADMIN_BASE_URL/admin/login" "admin login page"
fi

if [[ -n "$SHADOW_GATEWAY_BASE_URL" ]]; then
  check_json_endpoint "$SHADOW_GATEWAY_BASE_URL/health" "shadow gateway health"
  check_json_endpoint "$SHADOW_GATEWAY_BASE_URL/account/health" "shadow gateway account health"
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  check_json_endpoint "$API_BASE_URL/dashboard/overview" "dashboard overview" "Authorization: Bearer $ADMIN_TOKEN"
  check_json_endpoint "$API_BASE_URL/inquiries?page=1&pageSize=1" "inquiries list" "Authorization: Bearer $ADMIN_TOKEN"
else
  echo "[skip] admin endpoints (set ADMIN_TOKEN to enable)"
fi

echo "[smoke] success"
