#!/usr/bin/env bash

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

verify_docker_ready() {
  require_cmd docker
  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose plugin not found"
    exit 1
  fi
}

assert_file_exists() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
}

read_env_value() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d '=' -f2-
}

assert_non_placeholder() {
  local file="$1"
  local key="$2"
  local value
  value="$(read_env_value "$file" "$key")"

  if [[ -z "$value" ]]; then
    echo "Missing env value: $key in $file"
    exit 1
  fi

  if [[ "$value" == *"replace"* || "$value" == "ChangeThis123!" ]]; then
    echo "Placeholder env value detected for $key in $file"
    exit 1
  fi
}

assert_env_equals() {
  local file="$1"
  local key="$2"
  local expected="$3"
  local value
  value="$(read_env_value "$file" "$key")"

  if [[ "$value" != "$expected" ]]; then
    echo "Invalid env value: $key in $file must be $expected"
    exit 1
  fi
}

assert_not_env_value() {
  local file="$1"
  local key="$2"
  local forbidden="$3"
  local value
  value="$(read_env_value "$file" "$key")"

  if [[ -n "$value" && "$value" == "$forbidden" ]]; then
    echo "Unsafe default env value detected for $key in $file"
    exit 1
  fi
}

current_git_commit() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git rev-parse HEAD
  else
    echo "unknown"
  fi
}

current_git_branch() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git rev-parse --abbrev-ref HEAD
  else
    echo "unknown"
  fi
}

latest_snapshot_file() {
  local dir="$1"
  ls -1t "$dir"/*.env 2>/dev/null | head -n 1 || true
}

save_latest_success_snapshot() {
  local snapshot="$1"
  local dir="$2"
  cp "$snapshot" "$dir/latest-success.env"
}

verify_containers_running() {
  local failed=0
  local service=""
  for service in "$@"; do
    local running
    running="$(docker inspect -f '{{.State.Running}}' "$service" 2>/dev/null || true)"
    if [[ "$running" != "true" ]]; then
      echo "service not running: $service"
      failed=1
    fi
  done

  return "$failed"
}
