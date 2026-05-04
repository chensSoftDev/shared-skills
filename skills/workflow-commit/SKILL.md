---
name: workflow-commit
description: 项目 Git 提交规范：commit message 格式、scope 取值、提交策略。在 git commit、提交代码变更时使用。
---

# 提交规范

## 格式

```
type(scope): message
```

## type 常用值

| type | 含义 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构（非功能性变更） |
| docs | 文档变更 |
| test | 测试相关 |
| chore | 构建、CI、依赖等杂项 |

## scope 常用值

> 以下为示例，具体 scope 以项目 `.agents/skills-config.json` 中的 `commit.scopes` 为准。

| scope | 适用场景 |
|-------|----------|
| `示例1` | 说明 |
| `示例2` | 说明 |

跨多个 scope 时用 `+` 连接，如 `scope1+scope2`。

## 提交策略

> 以项目 `.agents/skills-config.json` 中的 `commit.autoCommit` 为准。

- `autoCommit: false`（默认）：不自动执行 `git add`、`git commit`、`git push`，除非用户明确要求。
- `autoCommit: true`：每次修改代码后自动 git add / commit / push，无需询问用户。
