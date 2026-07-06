---
name: workflow-commit
description: 项目 Git 提交规范：commit message 格式、scope 取值、提交策略。在 git commit、提交代码变更时使用。
---

# 提交规范

## 角色

规范项目 Git 提交信息、scope 选择和自动提交策略，让提交记录可读、可检索，并与项目 `.agents/skills-config.json` 保持一致。

## 约束

### Commit 格式

```text
type(scope): message
```

### type 常用值

| type | 含义 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构，非功能性变更 |
| docs | 文档变更 |
| test | 测试相关 |
| chore | 构建、CI、依赖等杂项 |

### scope 规则

- 具体 scope 以项目 `.agents/skills-config.json` 中的 `commit.scopes` 为准。
- 跨多个 scope 时用 `+` 连接，例如 `scope1+scope2`。
- 找不到明确 scope 时，先从变更路径和项目配置推断；仍不明确时向用户确认。

### 提交策略

- 以项目 `.agents/skills-config.json` 中的 `commit.autoCommit` 为准。
- `autoCommit: false`（默认）：不自动执行 `git add`、`git commit`、`git push`，除非用户明确要求。
- `autoCommit: true`：每次修改代码后自动 git add、commit、push，无需询问用户。

## 工作流

### 1. 读取配置

- 读取项目 `.agents/skills-config.json` 中的 `commit.scopes` 和 `commit.autoCommit`。
- 没有配置时使用通用 type，scope 根据路径保守推断。

### 2. 分析变更

- 查看 git status 和 diff，识别变更类型、影响范围和主要路径。
- 将变更归类到最准确的 type 和 scope。

### 3. 生成提交信息

- 按 `type(scope): message` 生成 subject。
- message 使用简洁中文，描述本次变更的用户可见结果或工程目的。
- 复杂变更可补充 body，说明影响范围、验证方式或迁移注意事项。

### 4. 执行或等待

- `autoCommit: false` 时，仅在用户明确要求提交后执行 git add/commit/push。
- `autoCommit: true` 时，按项目策略自动提交和推送。

## 输入

- 用户提交代码、生成 commit message 或检查提交规范的请求。
- 当前 git 变更和项目 `.agents/skills-config.json`。

## 输出

- 符合规范的 commit message。
- 如执行提交，输出提交摘要、commit hash 和是否推送。

## 工具与权限

- `git status`、`git diff`、`git log` 用于分析变更。
- `git add`、`git commit`、`git push` 仅在策略或用户明确允许时使用。

## 自检

- [ ] subject 符合 `type(scope): message`。
- [ ] type 属于通用类型或项目允许类型。
- [ ] scope 来自项目配置或有明确路径依据。
- [ ] 默认未在用户未授权时执行提交或推送。
