# Bootstrap Project Script Design

## Goal

Add a one-command onboarding script so a target project can quickly adopt this shared skills repository through the project's agent configuration directory.

The script follows this convention:

- `.agents/` is the project-local agent configuration root.
- `.agents/shared-skills/` is the git submodule for this repository.
- `AGENTS.md` is the human- and agent-readable entry point.
- `AGENTS.md` contains a script-managed block listing only the selected skills.

## Recommended Invocation

Remote usage:

```bash
curl -fsSL <shared-skills-raw-url>/scripts/bootstrap-project.sh | bash -s -- --repo <shared-skills-git-url>
```

Local development usage:

```bash
/path/to/shared-skills/scripts/bootstrap-project.sh --repo /path/to/shared-skills
```

Short-video-only usage:

```bash
/path/to/shared-skills/scripts/bootstrap-project.sh \
  --repo /path/to/shared-skills \
  --skills video-generation,video-script-generation
```

## Scope

The script creates and updates agent integration scaffolding only. It does not edit package files, CI files, application code, or project-specific local skills.

It does update `AGENTS.md` because that file is the expected project entry point for agent instructions.

## CLI

Primary options:

- `--repo <url-or-path>`: required shared-skills git URL or local repository path.
- `--path <submodule-path>`: optional submodule path, default `.agents/shared-skills`.
- `--skills <comma-separated-skill-names>`: optional filter for the skills referenced in `AGENTS.md`.
- `--force`: accepted for compatibility; the managed `AGENTS.md` block is always regenerated.
- `--help`: print usage.

The script runs in the current working directory, which is treated as the target project root.

## Behavior

1. Validate prerequisites.
   - `git` must exist.
   - Current directory must be inside a git work tree.
   - `--repo` must be provided.

2. Add or validate the submodule.
   - If the target path does not exist, run `git submodule add <repo> <path>`.
   - If the target path exists and is already a submodule, run `git submodule update --init`.
   - If the target path exists but is not a submodule, exit with a clear error.

3. Discover selected skills.
   - Scan `<submodule-path>/skills/*/SKILL.md`.
   - Read `name` and `description` from each skill's front matter.
   - If `--skills` is provided, include only those names.
   - If `--skills` is omitted, include all shared skills.
   - If any requested skill is missing, exit non-zero.

4. Create `.agents/skills-config.json`.
   - If it does not exist, write a minimal starter config with the selected skill names.
   - If it exists, leave it untouched because this file may contain project-specific configuration.

5. Create or update `AGENTS.md`.
   - If `AGENTS.md` does not exist, create it.
   - Insert a managed block at the end when no managed block exists.
   - Replace only the managed block when it already exists.
   - Preserve all content outside the managed block.
   - The block uses these markers:

```markdown
<!-- shared-skills:start -->
<!-- shared-skills:end -->
```

6. Print concise completion instructions.
   - Show created or preserved files.
   - Show suggested files to review and commit.

## AGENTS.md Managed Block

The managed block has this shape:

```markdown
<!-- shared-skills:start -->
## Shared Skills

This project uses shared skills from `.agents/shared-skills`.

| Skill | Entry | Description |
|-------|-------|-------------|
| `video-generation` | `.agents/shared-skills/skills/video-generation/SKILL.md` | 短视频生产全流程 |
<!-- shared-skills:end -->
```

## Idempotency Rules

Repeated runs must not duplicate submodule config or duplicate `AGENTS.md` content.

`AGENTS.md` content outside the managed block is never modified.

Existing `.agents/skills-config.json` is never overwritten by this script.

## Error Handling

The script exits non-zero for:

- Missing `git`.
- Not running inside a git work tree.
- Missing `--repo`.
- Target submodule path exists but is not a git submodule.
- Requested skill not found.
- `git submodule add` failure.

Each failure prints one actionable message and preserves the underlying git error where helpful.

## Testing

Tests use temporary git repositories and a local source repository fixture.

Required cases:

- First run creates `.gitmodules`, `.agents/shared-skills`, `.agents/skills-config.json`, and `AGENTS.md`.
- `--skills video-generation,video-script-generation` writes only those skills into `AGENTS.md` and starter config.
- Default run includes all shared skills in `AGENTS.md`.
- Existing `AGENTS.md` content is preserved while the managed block is inserted.
- Repeated run replaces the managed block instead of duplicating it.
- Existing `.agents/skills-config.json` is preserved.
- Running outside a git repository fails.
- Existing non-submodule target path fails.

## Files

Expected implementation files:

- `scripts/bootstrap-project.sh`
- `scripts/bootstrap-project.test.sh`
- `README.md`

The tests are shell-based to avoid requiring Node.js, Python, or project package managers in target repositories.
