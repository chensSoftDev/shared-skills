---
name: workflow-backlog
description: 管理需求生命周期：登记变更、迁移评审、状态流转、Release 规划。在评审需求、推进需求状态、处理 BACKLOG.md 时使用。
---

# 需求进度管理

## 角色

管理 `BACKLOG.md` 中需求的生命周期，确保需求状态、Version / Release Key、迁移准备、上线门禁和生产操作都反映真实进展。

## 子流程

本 skill 编排以下子流程，按阶段按需加载对应 reference：

| 子流程 | 参考文档 | 调用时机 |
|--------|----------|----------|
| 变更登记 | `references/change-registration.md` | 任何仓库文件变更前，先登记到 BACKLOG |
| 迁移门禁 | `references/migration-gate.md` | 评审或开发阶段，判断是否需迁移并创建草稿 |
| 发布规划 | `references/release-planning.md` | 自动化测试通过后，用户决定上线批次时创建 Release 文档 |

## 约束

### 上下文来源

- 所有需求在 `BACKLOG.md` 中跟踪。
- 完整状态定义、迁移规则和禁止行为以项目 `BACKLOG.md` 为准。
- 项目配置优先读取 `.agents/skills-config.json`。

### 命名规则

- 需求 ID：`<类型>-<三位全局序号>`。
- 类型前缀：`F` 表示功能，`B` 表示 Bug，`I` 表示改进。
- 序号全局自增。
- 若项目启用 SemVer，Version 格式为 `vMAJOR.MINOR.PATCH`，需求进入 `📝 Req Confirmed` 时必须绑定目标版本。
- 若项目未启用 SemVer，Release Key 可沿用 `{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`，在 `📋 Prod Planning` 阶段由用户决定。
- 多个需求可合并为一个 Version / Release 一次上线。

### 状态流转

```text
⚪ Todo → 🔍 Reviewing → 📝 Req Confirmed → 🧩 Tech Design → 🔨 In Dev → 🚚 Dev Deployed → 🧪 Testing → ✅ Test Passed → 📋 Prod Planning → 🚀 Prod Deployed → ✔️ Done
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
- 禁止违反项目版本绑定规则；SemVer 项目禁止需求进入 `📝 Req Confirmed` 后仍缺少目标 Version，legacy 项目禁止开发阶段提前绑定 Release Key。
- 禁止需求进入 `🧩 Tech Design` 后仍没有对应 `feature/<version>/<topic>` 分支。
- 禁止需迁移需求在迁移方案未成稿前推进到 `🔨 In Dev` 之后。
- 禁止未经用户明确批准执行生产迁移、生产部署或回滚。
- 禁止把需求状态当作代码完成度的别名；状态更新必须反映真实环境进展。
- 禁止在未登记 BACKLOG 行的情况下实施会修改仓库文件的变更（文档/流程小改可同轮登记并推进，但必须有记录）。
- 禁止基于本地 ORM 自动同步通过就视为生产可上线。

## 工作流

### 1. 评审需求

- 将状态改为 `🔍 Reviewing`。
- 识别是否涉及 schema、数据回填、RBAC 初始化、部署脚本或网关路由调整。
- 在备注中标注迁移、部署和风险判断。

### 2. 确认需求

- 用户确认需求后，将状态改为 `📝 Req Confirmed`。
- 若项目启用 SemVer，同时在 `Version` 列绑定目标版本；若目标版本不明确，停留在 `🔍 Reviewing`。
- 等待研发设计，不自动进入编码开发。

### 3. 研发设计

- 将状态改为 `🧩 Tech Design`。
- 创建或切换到 `feature/<version>/<topic>` 分支；研发设计文档、实施计划、验收文档、编码和测试证据都应在同一需求分支中推进。
- 输出研发设计、实施计划和验收计划，通常放在需求目录的 `TECH_DESIGN.md`、`IMPLEMENTATION_PLAN.md`、`ACCEPTANCE.md`。
- 评审影响文件、数据/迁移、API 契约、网关、部署和自动化测试策略。
- 若需求需迁移，先写 `docs/releases/PENDING/MIGRATION-<ID>.md`。

### 4. 开始编码

- 用户要求开发时，将状态改为 `🔨 In Dev`。
- 确认 `Version` 列已绑定目标版本。
- 确认当前工作在对应 `feature/<version>/<topic>` 分支，而不是第一次到编码阶段才切分支。
- 若需求需迁移，确认 `docs/releases/PENDING/MIGRATION-<ID>.md` 已成稿，并指明关联脚本或 migration 文件。

### 5. Dev 部署与自动化测试

- 部署到 dev 完成后，将状态改为 `🚚 Dev Deployed`。
- 自动化测试开始后，将状态改为 `🧪 Testing`。
- AI 执行单元测试、集成测试、端到端测试或 smoke，并把命令、环境、commit 和结果写入需求 `ACCEPTANCE.md` 或 Release 文档。
- 自动化测试通过且证据完整后，将状态改为 `✅ Test Passed`。
- 如用户要求人工验收，在备注中记录人工确认结果，但不要用人工确认替代自动化测试证据。

### 6. 生产规划

- 用户决定上线批次并指定 Version / Release Key 后，创建 `docs/releases/<VERSION_OR_KEY>/`。
- 整理变更、迁移、发布步骤和回滚入口。
- 将相关需求状态改为 `📋 Prod Planning`。

### 7. 生产发布

- 用户批准上线后，按 `PROD_PLAN.md` 执行发布。
- 健康检查通过后，将相关需求更新为 `✔️ Done`。

## 输入

- 用户给出的需求、状态推进指令、上线批次或 `BACKLOG.md` 维护请求。
- 项目 `BACKLOG.md` 和 `.agents/skills-config.json`。

## 输出

- 更新后的需求状态、备注、迁移草稿或 Release 目录。
- 对迁移、门禁、风险和下一步动作的说明。

## 自检

- [ ] 状态流转没有跳级，Version / Release Key 绑定时机符合项目规则。
- [ ] 进入 `🧩 Tech Design` 后已创建或切换到对应 `feature/<version>/<topic>` 分支。
- [ ] 需迁移需求已有迁移草稿并关联具体脚本或 migration。
- [ ] `✅ Test Passed` 前已有自动化测试命令、环境、commit 和结果证据。
- [ ] 生产部署、迁移或回滚前已有用户明确批准。
- [ ] `BACKLOG.md` 反映真实环境进展，而不只是代码进度。
