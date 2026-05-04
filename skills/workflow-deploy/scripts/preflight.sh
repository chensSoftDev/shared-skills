#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SKILL_DIR/scripts/release-common.sh"
source "$ROOT_DIR/scripts/deploy-config.sh"

MODE="local"
SKIP_BUILD="false"
CHECK_HEALTH="false"

usage() {
  cat <<USAGE
Usage: ./scripts/preflight.sh [options]

Options:
  --mode <local|dev|prod>   Run local, dev, or production checks (default: local)
  --skip-build              Skip build checks
  --check-health            Check health endpoints after checks
  -h, --help                Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)       MODE="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD="true"; shift ;;
    --check-health) CHECK_HEALTH="true"; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

if [[ "$MODE" != "local" && "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "Invalid mode: $MODE"
  exit 1
fi

echo "[preflight] mode=$MODE"
require_cmd node

# Docker 检查（dev/prod 模式）
if [[ "$MODE" == "dev" || "$MODE" == "prod" ]]; then
  verify_docker_ready

  echo "[preflight] validating compose"
  local_compose="${DEV_COMPOSE_FILE}"
  [[ "$MODE" == "prod" ]] && local_compose="${PROD_COMPOSE_FILE}"
  docker compose -f "$local_compose" config >/dev/null

  # 检查 env 文件
  if [[ ${#DEPLOY_ENV_FILES[@]} -gt 0 ]]; then
    echo "[preflight] checking deploy env files"
    for file in "${DEPLOY_ENV_FILES[@]}"; do
      assert_file_exists "$file"
    done
  fi
fi

# 项目自定义 preflight hook
PREFLIGHT_HOOK="$ROOT_DIR/scripts/preflight-hook.sh"
if [[ -f "$PREFLIGHT_HOOK" ]]; then
  echo "[preflight] running project hook"
  source "$PREFLIGHT_HOOK"
fi

# 构建验证
if [[ "$SKIP_BUILD" != "true" && ${#BUILD_COMMANDS[@]} -gt 0 ]]; then
  echo "[preflight] build verification"
  for cmd in "${BUILD_COMMANDS[@]}"; do
    echo "  $ $cmd"
    eval "$cmd"
  done
fi

# 健康检查
if [[ "$CHECK_HEALTH" == "true" ]]; then
  require_cmd curl
  echo "[preflight] health endpoint checks"
  for url in "${HEALTH_CHECK_URLS[@]:-}"; do
    [[ -n "$url" ]] && curl -fsS "$url" >/dev/null && echo "  [ok] $url"
  done
fi

echo "[preflight] success"
