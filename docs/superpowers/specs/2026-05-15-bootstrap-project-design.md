# Bootstrap Project Script Design

## Goal

Add a one-command onboarding script so a target project can quickly adopt this shared skills repository.

The script follows the existing README convention:

- Add this repository as a `.shared-skills` git submodule by default.
- Create project-local `.agents/skills-config.json` when it does not exist.
- Generate `.agents/shared-skills.md` with AGENTS/CLAUDE-ready skill references.
- Keep repeated runs safe and predictable.

## Recommended Invocation

Remote usage:

```bash
curl -fsSL <shared-skills-raw-url>/scripts/bootstrap-project.sh | bash -s -- --repo <shared-skills-git-url>
```

Local development usage:

```bash
/path/to/shared-skills/scripts/bootstrap-project.sh --repo /path/to/shared-skills
```

## Scope

The script creates integration scaffolding only. It does not edit the target project's main `AGENTS.md`, `CLAUDE.md`, package files, CI files, or application code.

This keeps the operation safe for diverse projects. The generated `.agents/shared-skills.md` is the copyable source of truth for project agent docs.

## CLI

Primary options:

- `--repo <url-or-path>`: required shared-skills git URL or local repository path.
- `--path <submodule-path>`: optional submodule path, default `.shared-skills`.
- `--force`: optional overwrite for generated `.agents/shared-skills.md`.
- `--help`: print usage.

The script runs in the current working directory, which is treated as the target project root.

## Behavior

1. Validate prerequisites.
   - `git` must exist.
   - Current directory must be inside a git work tree.
   - `--repo` must be provided.

2. Add or validate the submodule.
   - If the target path does not exist, run `git submodule add <repo> <path>`.
   - If the target path exists and is already a submodule, keep it.
   - If the target path exists but is not a submodule, exit with a clear error.

3. Create `.agents/skills-config.json`.
   - If it does not exist, write a minimal starter config matching README placeholders.
   - If it exists, leave it untouched.

4. Generate `.agents/shared-skills.md`.
   - Include a Markdown table of all shared skill entry paths under the chosen submodule path.
   - Include a short note telling users to reference or merge it from `AGENTS.md`.
   - If the file exists, leave it untouched unless `--force` is set.

5. Print concise completion instructions.
   - Show created or preserved files.
   - Show suggested files to review and commit.

## Idempotency Rules

Repeated runs must not duplicate submodule config, overwrite local project config, or rewrite generated documentation unless the user explicitly passes `--force`.

Existing `.agents/skills-config.json` is never overwritten by this script. Configuration is project-specific and must remain under project control.

## Error Handling

The script exits non-zero for:

- Missing `git`.
- Not running inside a git work tree.
- Missing `--repo`.
- Target submodule path exists but is not a git submodule.
- `git submodule add` failure.

Each failure prints one actionable message and preserves the underlying git error where helpful.

## Testing

Tests use temporary git repositories and a local bare clone of this repository.

Required cases:

- First run creates `.gitmodules`, the submodule path, `.agents/skills-config.json`, and `.agents/shared-skills.md`.
- Second run succeeds without duplicating or corrupting generated files.
- Existing `.agents/skills-config.json` is preserved.
- Existing `.agents/shared-skills.md` is preserved by default and overwritten with `--force`.
- Running outside a git repository fails.
- Existing non-submodule target path fails.

## Files

Expected implementation files:

- `scripts/bootstrap-project.sh`
- `scripts/bootstrap-project.test.sh`
- `README.md` usage section update

The tests are shell-based to avoid requiring Node.js, Python, or project package managers in target repositories.
