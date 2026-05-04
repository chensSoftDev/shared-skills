#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/../../scripts/lib/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

SKIP_PREFLIGHT="false"
SKIP_SMOKE="false"
RUN_SHADOW_SMOKE="true"
ALLOW_WITHOUT_DEV="false"
ROLLBACK_ON_FAIL="${AUTO_ROLLBACK_ON_FAIL:-true}"
DEV_SNAPSHOT_FILE="${DEV_SNAPSHOT_FILE:-}"
API_BASE_URL="${PROD_API_BASE_URL}"
WEB_BASE_URL="${PROD_WEB_BASE_URL}"
ADMIN_BASE_URL="${PROD_ADMIN_BASE_URL}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

usage() {
  cat <<USAGE
Usage: ./scripts/release-prod.sh [options]

Options:
  --skip-preflight         Skip production preflight
  --skip-smoke             Skip post-deploy smoke checks
  --skip-shadow-smoke      Skip in-container gateway self-check
  --allow-without-dev      Bypass latest dev-success gate
  --dev-snapshot <path>    Override dev success snapshot path
  --api-base-url <url>     Prod gateway API base URL (default: http://127.0.0.1:13001/api)
  --web-base-url <url>     Prod web base URL (default: http://127.0.0.1:13000)
  --admin-base-url <url>   Prod admin base URL (default: http://127.0.0.1:13002)
  --admin-token <token>    Optional admin JWT for protected checks
  --no-rollback-on-fail    Do not auto-rollback if smoke fails after deploy
  -h, --help               Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-preflight)
      SKIP_PREFLIGHT="true"
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
    --allow-without-dev)
      ALLOW_WITHOUT_DEV="true"
      shift
      ;;
    --dev-snapshot)
      DEV_SNAPSHOT_FILE="${2:-}"
      shift 2
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

if [[ "$SKIP_PREFLIGHT" != "true" ]]; then
  "$ROOT_DIR/scripts/preflight.sh" --mode prod --skip-build
fi

if [[ "$ALLOW_WITHOUT_DEV" != "true" ]]; then
  if [[ -z "$DEV_SNAPSHOT_FILE" ]]; then
    DEV_SNAPSHOT_FILE="$ROOT_DIR/deploy/dev-releases/latest-success.env"
  fi

  if [[ ! -f "$DEV_SNAPSHOT_FILE" ]]; then
    echo "Missing dev success snapshot: $DEV_SNAPSHOT_FILE"
    echo "Run ./scripts/release-dev.sh first, or use --allow-without-dev to bypass."
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$DEV_SNAPSHOT_FILE"
  CURRENT_COMMIT="$(current_git_commit)"

  if [[ -z "${RELEASE_COMMIT_SHA:-}" || "$RELEASE_COMMIT_SHA" == "unknown" || "$CURRENT_COMMIT" == "unknown" ]]; then
    echo "Unable to compare current commit with latest dev release commit."
    echo "Use --allow-without-dev to bypass after manual confirmation."
    exit 1
  fi

  if [[ "$CURRENT_COMMIT" != "$RELEASE_COMMIT_SHA" ]]; then
    echo "Current commit does not match latest successful dev release."
    echo "dev commit:     $RELEASE_COMMIT_SHA"
    echo "current commit: $CURRENT_COMMIT"
    echo "Run ./scripts/release-dev.sh for the current checkout, or use --allow-without-dev to bypass."
    exit 1
  fi
fi

"$ROOT_DIR/scripts/deploy.sh"
PROD_SNAPSHOT_FILE="$(latest_snapshot_file "$ROOT_DIR/deploy/releases")"
SMOKE_ARGS=(
  --api-base-url "$API_BASE_URL"
  --web-base-url "$WEB_BASE_URL"
  --admin-base-url "$ADMIN_BASE_URL"
)
ROLLBACK_ARGS=(
  --stage prod
  --skip-shadow-smoke
  --api-base-url "$API_BASE_URL"
  --web-base-url "$WEB_BASE_URL"
  --admin-base-url "$ADMIN_BASE_URL"
)

if [[ -n "$ADMIN_TOKEN" ]]; then
  SMOKE_ARGS+=(--admin-token "$ADMIN_TOKEN")
  ROLLBACK_ARGS+=(--admin-token "$ADMIN_TOKEN")
fi

if [[ "$SKIP_SMOKE" != "true" ]]; then
  if ! "$ROOT_DIR/scripts/smoke.sh" "${SMOKE_ARGS[@]}"; then
    if [[ "$ROLLBACK_ON_FAIL" == "true" && -n "$PROD_SNAPSHOT_FILE" ]]; then
      echo "[release-prod] smoke failed, rolling back"
      "$ROOT_DIR/scripts/release-rollback.sh" "${ROLLBACK_ARGS[@]}" "$PROD_SNAPSHOT_FILE"
    fi
    exit 1
  fi

  if [[ "$RUN_SHADOW_SMOKE" == "true" ]]; then
    if ! "$ROOT_DIR/scripts/shadow-gateway-smoke.sh" --stage prod; then
      if [[ "$ROLLBACK_ON_FAIL" == "true" && -n "$PROD_SNAPSHOT_FILE" ]]; then
        echo "[release-prod] shadow smoke failed, rolling back"
        "$ROOT_DIR/scripts/release-rollback.sh" "${ROLLBACK_ARGS[@]}" "$PROD_SNAPSHOT_FILE"
      fi
      exit 1
    fi
  fi
fi

echo "[release-prod] success"
if [[ -n "$PROD_SNAPSHOT_FILE" ]]; then
  echo "snapshot: $PROD_SNAPSHOT_FILE"
fi
