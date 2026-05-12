---
name: workflow-backlog
description: 管理需求生命周期：状态流转、AI 强制动作、禁止行为。在评审需求、推进需求状态、处理 BACKLOG.md 时使用。
---

# 需求进度管理

## 角色

管理 `BACKLOG.md` 中需求的生命周期，确保需求状态、Release Key、迁移准备、上线门禁和生产操作都反映真实进展。

## 约束

### 上下文来源

- 所有需求在 `BACKLOG.md` 中跟踪。
- 完整状态定义、迁移规则和禁止行为以项目 `BACKLOG.md` 为准。
- 项目配置优先读取 `.agents/skills-config.json`。

### 命名规则

- 需求 ID：`<类型>-<三位全局序号>`。
- 类型前缀：`F` 表示功能，`B` 表示 Bug，`I` 表示改进。
- 序号全局自增。
- Release Key：`{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`，在 `📋 Prod Planning` 阶段由用户决定，开发阶段不提前绑定。
- `{{RELEASE_KEY_PREFIX}}` 取自项目 `.agents/skills-config.json` 的 `release.keyPrefix`。
- 多个需求可合并为一个 Release 一次上线。

### 状态流转

```text
⚪ Todo → 🔍 Reviewing → 📝 Req Confirmed → 🔨 In Dev → 🧪 Dev Deployed → ✅ Dev Confirmed → 📋 Prod Planning → 🚀 Prod Deployed → ✔️ Done
```

### 迁移规则

具体迁移判断条件以项目 `.agents/skills-config.json` 的 `release.migrationRules` 为准。通用基线如下：

- 数据库 schema 变更。
- ORM migration 新增或修改。
- 初始化 SQL 或 RBAC 数据变更。
- 历史数据回填、清洗、重算。
- 需要新增或调整运维执行脚本才能安全上线的数据变更。

### 禁止行为

- 禁止跳过 `📋 Prod Planning` 直接部署生产。
- 禁止在开发阶段提前绑定 Release Key。
- 禁止需迁移需求在迁移方案未成稿前推进到 `🧪 Dev Deployed` 之后。
- 禁止未经用户明确批准执行生产迁移、生产部署或回滚。
- 禁止把需求状态当作代码完成度的别名；状态更新必须反映真实环境进展。

## 工作流

### 1. 评审需求

- 将状态改为 `🔍 Reviewing`。
- 识别是否涉及 schema、数据回填、RBAC 初始化、部署脚本或网关路由调整。
- 在备注中标注迁移、部署和风险判断。

### 2. 确认需求

- 用户确认需求后，将状态改为 `📝 Req Confirmed`。
- 等待明确开发指令，不自动进入开发。

### 3. 开始开发

- 用户要求开发时，将状态改为 `🔨 In Dev`。
- 若需求需迁移，在 `docs/releases/PENDING/MIGRATION-<ID>.md` 写好迁移草稿，并指明关联脚本或 migration 文件。

### 4. Dev 验证

- 部署到 dev 完成后，将状态改为 `🧪 Dev Deployed`。
- 用户确认 dev 通过后，将状态改为 `✅ Dev Confirmed`。

### 5. 生产规划

- 用户决定上线批次并指定 Release Key 后，创建 `docs/releases/<KEY>/`。
- 整理变更、迁移、发布步骤和回滚入口。
- 将相关需求状态改为 `📋 Prod Planning`。

### 6. 生产发布

- 用户批准上线后，按 `PROD_PLAN.md` 执行发布。
- 健康检查通过后，将相关需求更新为 `✔️ Done`。

## 输入

- 用户给出的需求、状态推进指令、上线批次或 `BACKLOG.md` 维护请求。
- 项目 `BACKLOG.md` 和 `.agents/skills-config.json`。

## 输出

- 更新后的需求状态、备注、迁移草稿或 Release 目录。
- 对迁移、门禁、风险和下一步动作的说明。

## 自检

- [ ] 状态流转没有跳级或提前绑定 Release Key。
- [ ] 需迁移需求已有迁移草稿并关联具体脚本或 migration。
- [ ] 生产部署、迁移或回滚前已有用户明确批准。
- [ ] `BACKLOG.md` 反映真实环境进展，而不只是代码进度。
