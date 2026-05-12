---
name: workflow-release
description: 执行发布流程：创建 Release 目录、编写变更日志和迁移脚本、部署与健康检查。在准备上线、创建 Release、执行部署时使用。
---

# 发布流程

## 角色

管理生产发布准备和执行，确保 Release 目录、变更日志、迁移说明、生产计划、健康检查和需求状态更新可追踪。

## 约束

### Release 目录

每个 Release Key 对应 `docs/releases/<KEY>/` 下的文件：

| 文件 | 内容 |
|------|------|
| `CHANGELOG.md` | 本次变更列表与需求 ID |
| `MIGRATION.md` | 迁移步骤、回滚方式，或 `No migration required` |
| `PROD_PLAN.md` | 生产执行顺序、门禁、风险点、回滚入口 |
| `RELEASE.md` | 发布执行结果、健康检查、tag、遗留事项 |

### Release Key

- 格式：`{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`。
- Release Key 由用户在 `📋 Prod Planning` 阶段指定。
- `{{RELEASE_KEY_PREFIX}}` 取自项目 `.agents/skills-config.json` 的 `release.keyPrefix`。

### 健康检查

具体 URL 以项目 `.agents/skills-config.json` 的 `release.healthChecks` 为准。

| 环境 | URL |
|------|-----|
| Dev | `{{DEV_HEALTH_URL}}` |
| Prod | `{{PROD_HEALTH_URL}}` |

### 发布执行引用

- 脚本路径以项目 `.agents/skills-config.json` 的 `release.scripts` 为准。
- 通用参考包括项目自带的 preflight、release、smoke、rollback 脚本。
- 如存在 `docs/HANDOFF_RUNBOOK.md`，发布前必须阅读。
- 发布目录模板参照 `docs/releases/_TEMPLATE/`。

## 工作流

### 1. 创建 Release 目录

- 用户指定 Release Key 后，创建 `docs/releases/<KEY>/`。
- 从 `docs/releases/_TEMPLATE/` 复制或按同等结构创建文件。

### 2. 整理变更和迁移

- 将 `docs/releases/PENDING/` 下相关迁移草稿移入并整理。
- 编写 `CHANGELOG.md`，包含变更列表和需求 ID。
- 编写 `MIGRATION.md`，包含迁移步骤、回滚方式，或明确 `No migration required`。

### 3. 编写生产计划

- 编写 `PROD_PLAN.md`，包含执行步骤、门禁、风险点和回滚入口。
- 明确健康检查 URL、部署脚本、迁移执行顺序和回滚条件。

### 4. 执行发布

- 用户批准后按 `PROD_PLAN.md` 执行部署。
- 记录实际命令、结果、健康检查和异常处理。

### 5. 收尾

- 健康检查通过后打 tag：`release/<RELEASE_KEY>`。
- 编写 `RELEASE.md`，记录发布执行结果、健康检查、tag 和遗留事项。
- 更新所有相关需求状态为 `✔️ Done`。

## 输入

- 用户指定的 Release Key、上线范围和批准指令。
- `BACKLOG.md`、`docs/releases/PENDING/`、项目发布配置和部署脚本。

## 输出

- 完整的 `docs/releases/<KEY>/` 发布目录。
- 发布执行记录、健康检查结果、tag 和需求状态更新。

## 工具与权限

- 文件读写，用于创建和整理 Release 目录。
- 项目 preflight、release、smoke、rollback 脚本。
- `git tag` 仅在发布成功并需要打标时执行。

## 自检

- [ ] Release Key 由用户在 `📋 Prod Planning` 阶段指定。
- [ ] `CHANGELOG.md`、`MIGRATION.md`、`PROD_PLAN.md`、`RELEASE.md` 齐全。
- [ ] 需迁移内容已从 `PENDING` 整理到 Release 目录。
- [ ] 用户批准后才执行生产发布。
- [ ] 健康检查通过后才打 `release/<RELEASE_KEY>` tag 并更新需求为 `✔️ Done`。
