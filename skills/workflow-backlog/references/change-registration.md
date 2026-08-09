# 变更登记

确保项目中所有会修改仓库文件的变更都可追踪。在实际编辑文件之前，先在 `BACKLOG.md` 中登记需求行，避免未记录的变更进入代码库。

## 适用范围

必须登记：

- 新功能、Bug 修复、重构、文档和流程规则调整。
- 前后端代码、API、鉴权、RBAC、网关路由调整。
- 数据库 schema、初始化 SQL、历史数据、脚本、环境变量、CI/CD、部署和回滚调整。

无需登记：

- 只读分析、临时排查命令、未落地讨论。

## BACKLOG 行格式

推荐表格列：

```md
| ID | 需求描述 | 需迁移 | 当前状态 | Version | 备注 |
|----|----------|--------|----------|-------------|------|
```

规则：

- `需迁移` 取值 `是`、`否` 或 `待评审`。
- SemVer 项目中，需求进入 `📝 Req Confirmed` 时必须填写目标版本。
- `Todo / Reviewing` 阶段可保持 `-`；若目标版本不明确，需求不得进入 `📝 Req Confirmed`。
- Legacy 项目中，Release Key 可在 `📋 Prod Planning` 阶段前保持 `-`。
- 备注应记录证据、路径、迁移草稿、commit 或阻塞原因。

## 命名规则

- 需求 ID：`<类型>-<三位全局序号>`，全局自增。
- 类型前缀：`F` 功能，`B` Bug，`I` 改进/重构/文档/流程。
- SemVer 项目的 Version 格式为 `vMAJOR.MINOR.PATCH`。
- Legacy 项目的 `{{RELEASE_KEY_PREFIX}}` 取自项目 `.agents/skills-config.json` 的 `release.keyPrefix`。

## 禁止行为

- 禁止在未登记 BACKLOG 行的情况下实施文件变更。
- 禁止仅因代码完成就推进状态；状态必须反映真实工作流进展。
- 禁止违反项目版本绑定规则；SemVer 项目禁止需求确认后仍缺少目标 Version。

## 执行步骤

### 1. 识别变更

- 用户提出修改仓库文件的请求时触发。
- 判断是否属于必须登记的范围。

### 2. 登记需求

- 用 `pnpm coord requirement claim` 原子分配下一个全局递增 ID。
- 用户确认 Version 并完成绑定后，运行 `pnpm coord worktree create <ID> --topic <topic> --json`。
- 命令成功即已在需求 worktree 新增 `⚪ Todo` 行、创建独立 BACKLOG commit、推送远端 feature branch，并完成 coordination 绑定；不得再手工重复登记。

### 3. 进入评审

- 将状态改为 `🔍 Reviewing`。
- 在备注中记录影响范围：apps、API、鉴权/RBAC、数据库、迁移、环境变量、CI、部署、文档。
- 迁移列只有 `是` 或 `否` 才算评审完成；仍为 `待评审` 时不得进入 Req Confirmed。

### 4. 确认需求

- 用户确认后，将状态改为 `📝 Req Confirmed`。
- SemVer 项目同时填写目标 Version。
- 等待研发设计，不自动进入编码开发。

### 5. 研发设计

- 将状态改为 `🧩 Tech Design`。
- 输出研发设计、实施计划和验收计划。

### 6. 开始编码

- 用户要求实施时，将状态改为 `🔨 In Dev`。
- 确认 SemVer 需求已填写目标 Version。
- 文档/流程类小改可在同一轮登记并推进到 `🔨 In Dev`，但必须有记录。
- 用 `requirement declare-resources` 覆盖相对 main 的全部实际 changed paths。`BACKLOG.md` 需要声明用于投影覆盖，但不制造业务资源冲突。
- `lifecycle advance/fail` 返回成功即表示精确 BACKLOG 行已 commit/push；exit 15 时先运行 `pnpm coord reconcile <ID> --json`。

### 7. Ready 与 completion

- Draft PR 保持 Gate skipped；feature、release-docs、completion 转 Ready 前运行 `pnpm coord gate preflight --head HEAD --base origin/main --json`。
- Ready PR 与 merge group 由受信任 Gate 强校验；merge group 对组内 requirements 使用联合资源覆盖并隔离证据。
- runtime completion 只通过受信任 workflow dispatch 提供 requirement ID；精确 merged SHA 来自 coordination。completion PR 只含 `BACKLOG.md + COMPLETION.json`，Release 文档走独立 PR。
