---
name: workflow-backlog
description: 管理需求生命周期：状态流转、AI 强制动作、禁止行为。在评审需求、推进需求状态、处理 BACKLOG.md 时使用。
---

# 需求进度管理

所有需求在 `BACKLOG.md` 中跟踪。完整状态定义、迁移规则和禁止行为以 `BACKLOG.md` 为准。

## 命名规则

- **需求 ID**：`<类型>-<三位全局序号>`，类型前缀：`F`（功能）、`B`（Bug）、`I`（改进）。序号全局自增。
- **Release Key**：`{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`，在 `📋 Prod Planning` 阶段由用户决定，**开发阶段不提前绑定**。
  > `{{RELEASE_KEY_PREFIX}}` 取自项目 `.agents/skills-config.json` 的 `release.keyPrefix`。
- 多个需求可合并为一个 Release 一次上线。

## 状态流转

```
⚪ Todo → 🔍 Reviewing → 📝 Req Confirmed → 🔨 In Dev → 🧪 Dev Deployed → ✅ Dev Confirmed → 📋 Prod Planning → 🚀 Prod Deployed → ✔️ Done
```

## AI 强制动作

| 触发时机 | 必须做的事 |
|----------|------------|
| 开始评审需求 | 状态改为 `🔍 Reviewing`，识别是否涉及 schema、数据回填、RBAC 初始化、部署脚本或网关路由调整，并在备注中标注 |
| 用户确认需求 | 状态改为 `📝 Req Confirmed`，等待明确开发指令 |
| 开始开发 | 状态改为 `🔨 In Dev` |
| 需求需迁移 | 在 `🔨 In Dev` 阶段写好 `docs/releases/PENDING/MIGRATION-<ID>.md`，并指明关联脚本或 migration 文件 |
| 部署到 dev 完成 | 状态改为 `🧪 Dev Deployed` |
| 用户确认 dev 通过 | 状态改为 `✅ Dev Confirmed` |
| 用户决定上线批次（指定 Release Key） | 创建 `docs/releases/<KEY>/`，整理变更、迁移、发布步骤，状态改为 `📋 Prod Planning` |
| 用户批准上线 | 按 `PROD_PLAN.md` 执行发布，健康检查通过后将相关需求更新为 `✔️ Done` |

## 迁移规则

> 具体迁移判断条件以项目 `.agents/skills-config.json` 的 `release.migrationRules` 为准。以下为通用基线：

以下情况按"需迁移"处理：
- 数据库 schema 变更
- ORM migration 新增或修改
- 初始化 SQL / RBAC 数据变更
- 历史数据回填、清洗、重算
- 需要新增或调整运维执行脚本才能安全上线的数据变更

## 禁止行为

- **禁止**跳过 `📋 Prod Planning` 直接部署生产。
- **禁止**在开发阶段提前绑定 Release Key。
- **禁止**需迁移需求在迁移方案未成稿前推进到 `🧪 Dev Deployed` 之后。
- **禁止**未经用户明确批准执行生产迁移、生产部署或回滚。
- **禁止**把需求状态当作代码完成度的别名；状态更新必须反映真实环境进展。
