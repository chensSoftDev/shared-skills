#!/usr/bin/env bash
set -euo pipefail

REPO=""
SUBMODULE_PATH=".agents/shared-skills"
SKILLS_FILTER=""
FORCE=0

usage() {
  cat <<'EOF'
Usage:
  bootstrap-project.sh --repo <shared-skills-url-or-path> [options]

Options:
  --repo <url-or-path>       Shared-skills git URL or local repository path. Required.
  --path <submodule-path>    Submodule path in the target project. Default: .agents/shared-skills
  --skills <names>           Comma-separated skill names to reference in AGENTS.md.
  --force                    Accepted for compatibility; AGENTS.md managed block is always regenerated.
  --help                     Show this help.

Examples:
  curl -fsSL <raw-url>/scripts/bootstrap-project.sh | bash -s -- --repo <repo-url>
  bash /path/to/shared-skills/scripts/bootstrap-project.sh --repo /path/to/shared-skills --skills video-generation,video-script-generation
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        [[ $# -ge 2 ]] || die "--repo requires a value"
        REPO="$2"
        shift 2
        ;;
      --path)
        [[ $# -ge 2 ]] || die "--path requires a value"
        SUBMODULE_PATH="$2"
        shift 2
        ;;
      --skills)
        [[ $# -ge 2 ]] || die "--skills requires a value"
        SKILLS_FILTER="$2"
        shift 2
        ;;
      --force)
        FORCE=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1"
        ;;
    esac
  done
}

require_prerequisites() {
  command -v git >/dev/null 2>&1 || die "git is required"
  [[ -n "$REPO" ]] || die "--repo is required"
  [[ -n "$SUBMODULE_PATH" ]] || die "--path cannot be empty"

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "run this script inside a git work tree"
}

is_submodule_path() {
  if git ls-files --stage -- "$SUBMODULE_PATH" | grep -q '^160000 '; then
    return 0
  fi

  if [[ -f .gitmodules ]]; then
    git config --file .gitmodules --get-regexp '^submodule\..*\.path$' 2>/dev/null \
      | awk -v path="$SUBMODULE_PATH" '$2 == path { found = 1 } END { exit found ? 0 : 1 }'
    return $?
  fi

  return 1
}

ensure_submodule() {
  if is_submodule_path; then
    git -c protocol.file.allow=always submodule update --init -- "$SUBMODULE_PATH"
    echo "Submodule ready: $SUBMODULE_PATH"
    return
  fi

  if [[ -e "$SUBMODULE_PATH" ]]; then
    die "$SUBMODULE_PATH exists but is not a git submodule"
  fi

  git -c protocol.file.allow=always submodule add "$REPO" "$SUBMODULE_PATH"
  echo "Submodule added: $SUBMODULE_PATH"
}

skill_requested() {
  local skill_name="$1"
  local raw
  local requested

  [[ -n "$SKILLS_FILTER" ]] || return 0

  local old_ifs="$IFS"
  IFS=','
  for raw in $SKILLS_FILTER; do
    requested="$(trim "$raw")"
    if [[ "$requested" == "$skill_name" ]]; then
      IFS="$old_ifs"
      return 0
    fi
  done
  IFS="$old_ifs"

  return 1
}

read_frontmatter_field() {
  local file="$1"
  local field="$2"
  sed -n "s/^$field:[[:space:]]*//p" "$file" | head -n 1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g;s/"/\\"/g'
}

markdown_escape() {
  printf '%s' "$1" | sed 's/|/\\|/g'
}

SELECTED_SKILL_FILES=()
SELECTED_SKILL_NAMES=()
SELECTED_SKILL_DESCRIPTIONS=()

collect_skills() {
  local skills_dir="$SUBMODULE_PATH/skills"
  local file
  local name
  local description

  [[ -d "$skills_dir" ]] || die "skills directory not found: $skills_dir"

  while IFS= read -r file; do
    name="$(read_frontmatter_field "$file" "name")"
    [[ -n "$name" ]] || name="$(basename "$(dirname "$file")")"
    description="$(read_frontmatter_field "$file" "description")"

    if skill_requested "$name"; then
      SELECTED_SKILL_FILES+=("$file")
      SELECTED_SKILL_NAMES+=("$name")
      SELECTED_SKILL_DESCRIPTIONS+=("$description")
    fi
  done < <(find "$skills_dir" -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort)

  [[ ${#SELECTED_SKILL_NAMES[@]} -gt 0 ]] || die "no matching skills found under $skills_dir"
  validate_requested_skills
}

validate_requested_skills() {
  local raw
  local requested
  local selected
  local found

  [[ -n "$SKILLS_FILTER" ]] || return 0

  local old_ifs="$IFS"
  IFS=','
  for raw in $SKILLS_FILTER; do
    requested="$(trim "$raw")"
    [[ -n "$requested" ]] || continue
    found=0
    for selected in "${SELECTED_SKILL_NAMES[@]}"; do
      if [[ "$selected" == "$requested" ]]; then
        found=1
        break
      fi
    done
    [[ "$found" -eq 1 ]] || {
      IFS="$old_ifs"
      die "requested skill not found: $requested"
    }
  done
  IFS="$old_ifs"
}

write_skills_config() {
  local config_file=".agents/skills-config.json"
  local index
  local comma

  mkdir -p .agents

  if [[ -f "$config_file" ]]; then
    echo "Preserved: $config_file"
    return
  fi

  {
    echo "{"
    echo "  \"skills\": {"
    echo "    \"enabled\": ["
    for index in "${!SELECTED_SKILL_NAMES[@]}"; do
      comma=","
      [[ "$index" == "$((${#SELECTED_SKILL_NAMES[@]} - 1))" ]] && comma=""
      printf '      "%s"%s\n' "$(json_escape "${SELECTED_SKILL_NAMES[$index]}")" "$comma"
    done
    echo "    ]"
    echo "  }"
    echo "}"
  } > "$config_file"

  echo "Created: $config_file"
}

build_agents_block() {
  local index

  echo "<!-- shared-skills:start -->"
  echo "## Shared Skills"
  echo
  echo "This project uses shared skills from \`$SUBMODULE_PATH\`."
  echo
  echo "| Skill | Entry | Description |"
  echo "|-------|-------|-------------|"
  for index in "${!SELECTED_SKILL_NAMES[@]}"; do
    printf '| `%s` | `%s` | %s |\n' \
      "$(markdown_escape "${SELECTED_SKILL_NAMES[$index]}")" \
      "$(markdown_escape "${SELECTED_SKILL_FILES[$index]}")" \
      "$(markdown_escape "${SELECTED_SKILL_DESCRIPTIONS[$index]}")"
  done
  echo "<!-- shared-skills:end -->"
}

count_marker() {
  local file="$1"
  local marker="$2"
  grep -Fxc "$marker" "$file" 2>/dev/null || true
}

write_agents_md() {
  local agents_file="AGENTS.md"
  local start_marker="<!-- shared-skills:start -->"
  local end_marker="<!-- shared-skills:end -->"
  local block_file
  local temp_file
  local start_count
  local end_count

  block_file="$(mktemp)"
  temp_file="$(mktemp)"
  build_agents_block > "$block_file"

  if [[ ! -f "$agents_file" ]]; then
    mv "$block_file" "$agents_file"
    rm -f "$temp_file"
    echo "Created: $agents_file"
    return
  fi

  start_count="$(count_marker "$agents_file" "$start_marker")"
  end_count="$(count_marker "$agents_file" "$end_marker")"
  if [[ "$start_count" != "$end_count" ]]; then
    rm -f "$block_file" "$temp_file"
    die "$agents_file has mismatched shared-skills markers"
  fi

  awk -v block_file="$block_file" -v start="$start_marker" -v end="$end_marker" '
    BEGIN {
      while ((getline line < block_file) > 0) {
        block = block line ORS
      }
      in_block = 0
      replaced = 0
    }
    $0 == start {
      printf "%s", block
      in_block = 1
      replaced = 1
      next
    }
    $0 == end && in_block {
      in_block = 0
      next
    }
    !in_block {
      print
    }
    END {
      if (!replaced) {
        if (NR > 0) print ""
        printf "%s", block
      }
    }
  ' "$agents_file" > "$temp_file"

  mv "$temp_file" "$agents_file"
  rm -f "$block_file"
  echo "Updated: $agents_file"
}

print_summary() {
  echo
  echo "Shared skills bootstrap complete."
  echo
  echo "Review and commit these target-project files:"
  echo "- .gitmodules"
  echo "- $SUBMODULE_PATH"
  echo "- .agents/skills-config.json"
  echo "- AGENTS.md"
}

main() {
  parse_args "$@"
  require_prerequisites

  local project_root
  project_root="$(git rev-parse --show-toplevel)"
  cd "$project_root"

  ensure_submodule
  collect_skills
  write_skills_config
  write_agents_md
  print_summary
}

main "$@"
