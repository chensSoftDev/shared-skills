# Bootstrap Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the bootstrap script so projects use `.agents/shared-skills` as the submodule path and `AGENTS.md` as the selected-skill entry point.

**Architecture:** A Bash CLI runs from the target project root, adds shared-skills as a git submodule under `.agents/`, scans selected skills, writes starter `.agents/skills-config.json`, and creates or updates a marked block in `AGENTS.md`. Shell tests create temporary git repositories and verify public CLI behavior.

**Tech Stack:** Bash, git submodules, Markdown managed block replacement, shell tests.

---

### Task 1: Update Failing Tests

**Files:**
- Modify: `scripts/bootstrap-project.test.sh`

- [ ] **Step 1: Change expected default submodule path**

Tests should expect `.agents/shared-skills`, not `.shared-skills`.

- [ ] **Step 2: Add AGENTS.md assertions**

Tests should assert:

- first run creates `AGENTS.md`
- selected skills are listed in `AGENTS.md`
- unselected skills are not listed in `AGENTS.md`
- existing `AGENTS.md` content is preserved
- repeated runs keep exactly one managed block

- [ ] **Step 3: Run tests and confirm RED**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: FAIL because the current script still writes `.shared-skills` and `.agents/shared-skills.md`.

### Task 2: Update Bootstrap Script

**Files:**
- Modify: `scripts/bootstrap-project.sh`

- [ ] **Step 1: Change default submodule path**

Set `SUBMODULE_PATH=".agents/shared-skills"` and update usage text.

- [ ] **Step 2: Replace shared-skills doc generation with AGENTS.md generation**

Add a `write_agents_md` function that:

- creates `AGENTS.md` when missing
- inserts a block between `<!-- shared-skills:start -->` and `<!-- shared-skills:end -->`
- replaces only that block on repeated runs
- preserves content outside the block

- [ ] **Step 3: Update summary output**

Summary should list:

- `.gitmodules`
- `.agents/shared-skills`
- `.agents/skills-config.json`
- `AGENTS.md`

- [ ] **Step 4: Run tests and confirm GREEN**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: PASS.

### Task 3: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace old structure examples**

Document `.agents/shared-skills` and `AGENTS.md` managed references.

- [ ] **Step 2: Run tests again**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: PASS.

### Task 4: Repair short-video Integration

**Files:**
- Modify target project: `/Users/chensheng/Desktop/workspace/short-video`

- [ ] **Step 1: Remove previous root-level integration created by the old script**

Remove root `.shared-skills` submodule, root `skills/` symlinks, and `.agents/shared-skills.md`.

- [ ] **Step 2: Run corrected bootstrap script**

Run:

```bash
cd /Users/chensheng/Desktop/workspace/short-video
/Users/chensheng/Desktop/workspace/shared-skills/scripts/bootstrap-project.sh \
  --repo /Users/chensheng/Desktop/workspace/shared-skills \
  --skills video-generation,video-script-generation
```

Expected:

- `.agents/shared-skills` exists as the submodule
- `AGENTS.md` references only `video-generation` and `video-script-generation`
- `.agents/skills-config.json` keeps or creates those selected skills

### Task 5: Final Verification

**Files:**
- Verify source repository and target project

- [ ] **Step 1: Verify source tests**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: PASS.

- [ ] **Step 2: Verify target project integration**

Run:

```bash
cd /Users/chensheng/Desktop/workspace/short-video
test -d .agents/shared-skills
test -f AGENTS.md
grep -q "video-generation" AGENTS.md
grep -q "video-script-generation" AGENTS.md
! grep -q "coding-nextjs" AGENTS.md
! test -e .shared-skills
```

Expected: all checks pass.
