# Bootstrap Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a one-command bootstrap script that adds shared-skills to a target project and can expose only selected skills.

**Architecture:** A Bash CLI runs from the target project root, adds shared-skills as a git submodule, writes safe `.agents` scaffolding, and generates skill references from the submodule's `skills/*/SKILL.md` files. Tests create temporary git repositories and exercise the script through its public CLI.

**Tech Stack:** Bash, git submodules, shell test script.

---

### Task 1: Shell Test Coverage

**Files:**
- Create: `scripts/bootstrap-project.test.sh`

- [ ] **Step 1: Write the failing test**

Create a shell test runner that builds temporary source and target git repositories, runs `scripts/bootstrap-project.sh`, and asserts:

- first run creates `.gitmodules`, `.shared-skills`, `.agents/skills-config.json`, and `.agents/shared-skills.md`
- `--skills video-generation,video-script-generation` filters generated references and config
- repeated runs preserve existing project config and docs
- `--force` regenerates `.agents/shared-skills.md`
- non-git directories fail
- existing non-submodule target paths fail

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: FAIL because `scripts/bootstrap-project.sh` does not exist yet.

### Task 2: Bootstrap Script

**Files:**
- Create: `scripts/bootstrap-project.sh`

- [ ] **Step 1: Implement minimal script**

Implement options:

- `--repo <url-or-path>`
- `--path <submodule-path>` defaulting to `.shared-skills`
- `--skills <comma-separated-skill-names>`
- `--force`
- `--help`

Implement behavior:

- validate `git`, target git work tree, and `--repo`
- add or initialize the submodule using `git -c protocol.file.allow=always submodule add`
- reject an existing target path that is not a submodule
- create `.agents/skills-config.json` without overwriting it
- generate `.agents/shared-skills.md` from selected `SKILL.md` files
- preserve `.agents/shared-skills.md` unless `--force` is set

- [ ] **Step 2: Run test to verify it passes**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: PASS.

### Task 3: README Usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document one-command onboarding**

Add a concise section showing:

```bash
curl -fsSL <shared-skills-raw-url>/scripts/bootstrap-project.sh | bash -s -- --repo <shared-skills-git-url>
```

and the short-video filtered form:

```bash
bash /path/to/shared-skills/scripts/bootstrap-project.sh --repo /path/to/shared-skills --skills video-generation,video-script-generation
```

- [ ] **Step 2: Run test again**

Run:

```bash
bash scripts/bootstrap-project.test.sh
```

Expected: PASS.

### Task 4: Short Video Project Onboarding

**Files:**
- Modify target project: `/Users/chensheng/Desktop/workspace/short-video`

- [ ] **Step 1: Run bootstrap script in target project**

Run:

```bash
cd /Users/chensheng/Desktop/workspace/short-video
/Users/chensheng/Desktop/workspace/shared-skills/scripts/bootstrap-project.sh \
  --repo /Users/chensheng/Desktop/workspace/shared-skills \
  --skills video-generation,video-script-generation
```

Expected: `.agents/shared-skills.md` references only `video-generation` and `video-script-generation`.

- [ ] **Step 2: Start the video workflow for 《矛盾论》**

Create the output directory and script JSON:

```bash
mkdir -p output/video-generation/maodunlun
```

Then produce `output/video-generation/maodunlun/script.json` using the video-script-generation rules, followed by video-generation rendering if required dependencies and assets are available.

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
test -f .agents/shared-skills.md
test -f .agents/skills-config.json
grep -q "video-generation" .agents/shared-skills.md
grep -q "video-script-generation" .agents/shared-skills.md
! grep -q "coding-nextjs" .agents/shared-skills.md
```

Expected: all checks pass.
