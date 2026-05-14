#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/scripts/bootstrap-project.sh"
TMP_ROOT=""

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$TMP_ROOT" && -d "$TMP_ROOT" ]]; then
    rm -rf "$TMP_ROOT"
  fi
}
trap cleanup EXIT

assert_file() {
  [[ -f "$1" ]] || fail "expected file: $1"
}

assert_dir() {
  [[ -d "$1" ]] || fail "expected directory: $1"
}

assert_contains() {
  local file="$1"
  local text="$2"
  grep -Fq "$text" "$file" || fail "expected $file to contain: $text"
}

assert_not_contains() {
  local file="$1"
  local text="$2"
  if grep -Fq "$text" "$file"; then
    fail "expected $file not to contain: $text"
  fi
}

assert_equal() {
  local expected="$1"
  local actual="$2"
  [[ "$expected" == "$actual" ]] || fail "expected [$expected], got [$actual]"
}

init_repo() {
  local dir="$1"
  mkdir -p "$dir"
  git -C "$dir" init -q
  git -C "$dir" config user.name "Bootstrap Test"
  git -C "$dir" config user.email "bootstrap-test@example.com"
}

write_skill() {
  local repo="$1"
  local name="$2"
  local description="$3"
  mkdir -p "$repo/skills/$name"
  cat > "$repo/skills/$name/SKILL.md" <<EOF
---
name: $name
description: $description
---

# $name
EOF
}

create_source_repo() {
  local repo="$TMP_ROOT/source"
  init_repo "$repo"
  write_skill "$repo" "video-generation" "Generate short videos"
  write_skill "$repo" "video-script-generation" "Generate short video scripts"
  write_skill "$repo" "coding-nextjs" "Next.js coding rules"
  git -C "$repo" add skills
  git -C "$repo" commit -q -m "test: add skills"
  echo "$repo"
}

create_target_repo() {
  local dir="$1"
  init_repo "$dir"
  touch "$dir/README.md"
  git -C "$dir" add README.md
  git -C "$dir" commit -q -m "test: init target"
}

run_bootstrap() {
  local target="$1"
  shift
  (
    cd "$target"
    bash "$SCRIPT" "$@"
  )
}

test_first_run_filters_video_skills() {
  local source="$1"
  local target="$TMP_ROOT/target-filtered"
  create_target_repo "$target"

  run_bootstrap "$target" --repo "$source" --skills video-generation,video-script-generation

  assert_file "$target/.gitmodules"
  assert_dir "$target/.shared-skills"
  assert_file "$target/.agents/skills-config.json"
  assert_file "$target/.agents/shared-skills.md"
  assert_contains "$target/.agents/shared-skills.md" ".shared-skills/skills/video-generation/SKILL.md"
  assert_contains "$target/.agents/shared-skills.md" ".shared-skills/skills/video-script-generation/SKILL.md"
  assert_not_contains "$target/.agents/shared-skills.md" "coding-nextjs"
  assert_contains "$target/.agents/skills-config.json" "\"video-generation\""
  assert_contains "$target/.agents/skills-config.json" "\"video-script-generation\""
  assert_not_contains "$target/.agents/skills-config.json" "\"coding-nextjs\""
}

test_default_run_includes_all_skills() {
  local source="$1"
  local target="$TMP_ROOT/target-all"
  create_target_repo "$target"

  run_bootstrap "$target" --repo "$source"

  assert_contains "$target/.agents/shared-skills.md" "video-generation"
  assert_contains "$target/.agents/shared-skills.md" "video-script-generation"
  assert_contains "$target/.agents/shared-skills.md" "coding-nextjs"
}

test_repeated_run_preserves_project_files() {
  local source="$1"
  local target="$TMP_ROOT/target-repeat"
  create_target_repo "$target"

  run_bootstrap "$target" --repo "$source" --skills video-generation

  cat > "$target/.agents/skills-config.json" <<'EOF'
{"custom": true}
EOF
  cat > "$target/.agents/shared-skills.md" <<'EOF'
# Custom docs
EOF

  run_bootstrap "$target" --repo "$source" --skills video-generation

  assert_equal '{"custom": true}' "$(cat "$target/.agents/skills-config.json")"
  assert_equal '# Custom docs' "$(cat "$target/.agents/shared-skills.md")"
}

test_force_regenerates_docs() {
  local source="$1"
  local target="$TMP_ROOT/target-force"
  create_target_repo "$target"

  run_bootstrap "$target" --repo "$source" --skills video-generation
  cat > "$target/.agents/shared-skills.md" <<'EOF'
# Custom docs
EOF

  run_bootstrap "$target" --repo "$source" --skills video-generation --force

  assert_contains "$target/.agents/shared-skills.md" ".shared-skills/skills/video-generation/SKILL.md"
  assert_not_contains "$target/.agents/shared-skills.md" "# Custom docs"
}

test_non_git_directory_fails() {
  local source="$1"
  local target="$TMP_ROOT/not-git"
  local log="$TMP_ROOT/not-git.log"
  mkdir -p "$target"

  if run_bootstrap "$target" --repo "$source" >"$log" 2>&1; then
    fail "expected non-git directory to fail"
  fi

  assert_contains "$log" "git work tree"
}

test_existing_non_submodule_path_fails() {
  local source="$1"
  local target="$TMP_ROOT/target-conflict"
  local log="$TMP_ROOT/conflict.log"
  create_target_repo "$target"
  mkdir -p "$target/.shared-skills"

  if run_bootstrap "$target" --repo "$source" >"$log" 2>&1; then
    fail "expected existing non-submodule path to fail"
  fi

  assert_contains "$log" "not a git submodule"
}

main() {
  TMP_ROOT="$(mktemp -d)"
  local source
  source="$(create_source_repo)"

  test_first_run_filters_video_skills "$source"
  test_default_run_includes_all_skills "$source"
  test_repeated_run_preserves_project_files "$source"
  test_force_regenerates_docs "$source"
  test_non_git_directory_fails "$source"
  test_existing_non_submodule_path_fails "$source"

  echo "PASS: bootstrap-project tests"
}

main "$@"
