---
name: workflow-release
description: 执行发布流程：创建 Release 目录、编写变更日志和迁移脚本、部署与健康检查。在准备上线、创建 Release、执行部署时使用。
---

# 发布流程

每个 Release Key 对应 `docs/releases/<KEY>/` 下的文件：

| 文件 | 内容 |
|------|------|
| `CHANGELOG.md` | 本次变更列表与需求 ID |
| `MIGRATION.md` | 迁移步骤、回滚方式，或 `No migration required` |
| `PROD_PLAN.md` | 生产执行顺序、门禁、风险点、回滚入口 |
| `RELEASE.md` | 发布执行结果、健康检查、tag、遗留事项 |

## Release Key 格式

`{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`（由用户在 `📋 Prod Planning` 阶段指定）

> `{{RELEASE_KEY_PREFIX}}` 取自项目 `.agents/skills-config.json` 的 `release.keyPrefix`。

## 发布步骤

1. 用户指定 Release Key 后，创建 `docs/releases/<KEY>/` 目录
2. 将 `docs/releases/PENDING/` 下相关迁移草稿移入并整理
3. 编写 `CHANGELOG.md`（变更列表 + 需求 ID）
4. 编写 `PROD_PLAN.md`（执行步骤 + 门禁 + 回滚方式）
5. 用户批准后按 `PROD_PLAN.md` 执行部署
6. 健康检查通过后打 tag：`release/<RELEASE_KEY>`
7. 更新所有相关需求状态为 `✔️ Done`

## 健康检查

> 具体 URL 以项目 `.agents/skills-config.json` 的 `release.healthChecks` 为准。

| 环境 | URL |
|------|-----|
| Dev | `{{DEV_HEALTH_URL}}` |
| Prod | `{{PROD_HEALTH_URL}}` |

## 发布执行引用

> 脚本路径以项目 `.agents/skills-config.json` 的 `release.scripts` 为准，以下为通用参考：

- 项目自带的 preflight / release / smoke / rollback 脚本
- `docs/HANDOFF_RUNBOOK.md`（如有）

## 发布目录模板

参照 `docs/releases/_TEMPLATE/` 创建新 Release 目录。
