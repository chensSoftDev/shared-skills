---
name: testing-miniapp-e2e
description: Use when creating, splitting, or refactoring this repo's miniapp E2E tests with miniprogram-automator, especially when breaking a monolithic test file into per-case files, defining step-by-step cases, and extracting reusable shared steps such as login.
---

# Miniapp E2E Case Authoring

Use this skill for `tests/miniapp-e2e` work in this repository.

## Core Rules

1. Do not keep all E2E cases in one file.
2. One use case should live in one file.
3. A case must be broken into ordered steps before implementation.
4. Implement and validate one step at a time.
5. Reusable cross-case flows should be extracted into shared helpers.

## Preferred Layout

```text
tests/miniapp-e2e/
  runner.mjs
  cases/
    login.case.mjs
    inventory.case.mjs
    stock.case.mjs
    category.case.mjs
  helpers/
    auth.mjs
    navigation.mjs
    mock-api.mjs
    assertions.mjs
    signals.mjs
```

## Case Design

- Each case file should cover one scenario or one closely related user flow.
- Give the case a concrete name tied to page and behavior.
- Write the case as an ordered step list.
- Each step should do one thing:
  - prepare state
  - perform one interaction
  - assert one outcome

## Step Rules

- Start from the smallest stable step, then add the next one.
- Do not write a long end-to-end chain first and debug it later.
- Keep step boundaries explicit so failures point to one action.
- Failure output should stay step-scoped and readable, for example:
  - `[库存页：类别切换] 切换到第二类别 失败：...`

## Shared Helper Rules

Extract helpers when logic is reused across 2 or more cases, especially for:

- login and session bootstrap
- mock API install and reset
- page entry and tab switching
- current page assertions and waits
- common storage signal reads and resets
- warehouse and category switching

Helpers should be deterministic and small. Prefer stateless helpers. If state is required, reset it per case.

## Refactor Order

When converting a monolithic E2E file:

1. Identify each case boundary.
2. Extract shared helpers first.
3. Move one case at a time into `cases/`.
4. Keep the runner thin. The runner should only assemble and execute cases.
5. Remove duplicated helper logic after the split is stable.

## Independence Rules

- Each case must be independently runnable.
- Do not let one case depend on another case's storage, login state, navigation stack, or mock data.
- Reset mock state and test signals at case start when needed.

## Practical Bias

- Prefer stable page methods and deterministic helper entry points over fragile UI chains when both validate the same behavior.
- Keep unrelated unstable flows isolated in their own case instead of blocking the entire suite.
- Shared flows like login should be reusable, not copied into every case.
