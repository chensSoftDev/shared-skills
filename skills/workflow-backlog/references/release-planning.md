# 发布规划

将已确认的变更转化为有门禁的生产发布，确保 Release 目录、变更日志、迁移说明、生产计划和健康检查完整可追踪。

## 前置条件

进入生产规划前：

- 相关 BACKLOG 需求已达到 `✅ Dev Confirmed`，或用户明确批准提前规划。
- 需迁移的需求已有 `docs/releases/PENDING/MIGRATION-<ID>.md`。
- 用户提供或批准 Version / Release Key。

## Version / Release Key 格式

```text
vMAJOR.MINOR.PATCH
```

- SemVer 项目使用 `vMAJOR.MINOR.PATCH`，并与 Git tag 一致。
- Legacy 项目可继续使用 `{{RELEASE_KEY_PREFIX}}-YYYYMMDD-NN`。
- 多个需求可合并为一个 Version / Release 一次上线。

## Release 目录结构

创建 `docs/releases/<VERSION_OR_KEY>/`，必含文件：

| 文件 | 内容 |
|------|------|
| `CHANGELOG.md` | 本次变更列表、需求 ID、影响范围 |
| `MIGRATION.md` | 迁移步骤和回滚，或 `No migration required` |
| `PROD_PLAN.md` | 前置条件、执行步骤、门禁、smoke 检查、回滚方案 |
| `RELEASE.md` | 发布执行结果、健康检查、tag、遗留事项 |

优先从 `docs/releases/_TEMPLATE/` 复制模板，无模板时创建等价文件。

## 禁止行为

- 禁止跳过生产规划直接部署。
- 禁止从未审批的 `PROD_PLAN.md` 执行生产部署。
- 禁止把构建成功视为发布完成。
- 禁止在未记录发布结果前关闭 BACKLOG 需求。

## 执行步骤

### 1. 创建 Release 目录

- 用户指定 Version / Release Key 后，创建 `docs/releases/<VERSION_OR_KEY>/`。
- 从模板复制或按标准结构创建文件。

### 2. 整理变更和迁移

- 将 `docs/releases/PENDING/` 下相关迁移草稿移入并整理。
- 编写 `CHANGELOG.md`，包含变更列表和需求 ID。
- 编写 `MIGRATION.md`，包含迁移步骤和回滚方式，或明确无需迁移。

### 3. 编写生产计划

- 编写 `PROD_PLAN.md`，包含：
  - 前置条件和执行步骤。
  - Go/No-go 门禁。
  - 健康检查和 smoke 检查。
  - 回滚方案和入口。

### 4. 更新需求状态

- 将相关 BACKLOG 需求状态改为 `📋 Prod Planning`。
- 生产部署实际完成后才改为 `🚀 Prod Deployed`。
- 健康检查通过且发布记录完成后才改为 `✔️ Done`。

### 5. 记录发布结果

- 发布后编写 `RELEASE.md`，记录执行结果、健康检查、tag 和遗留事项。
