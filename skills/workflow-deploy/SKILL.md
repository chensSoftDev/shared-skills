---
name: workflow-deploy
description: Docker 部署操作：release 脚本使用、dev/prod 门禁、回滚处理。在执行服务器部署、重启、回滚时使用。
---

# Docker 部署流程

## 角色

指导 Docker Compose 服务栈的 dev、prod 发布和回滚，确保部署前读配置、部署中遵守门禁、失败时保留自动回滚和可追踪快照。

## 约束

### 必读文档

执行部署前先阅读：

- `DEPLOY.md`（如有）或 `docs/ops/DEPLOY.md`。
- 项目根目录 `docker-compose*.yml`。
- 项目 `scripts/deploy-config.sh`。
- `docs/ops/RELEASE_WORKFLOW.md`（如有）。
- `docs/ops/HANDOFF_RUNBOOK.md`（如有）。

### 核心规则

- 如项目有统一 release 调度入口（例如 `scripts/release.sh`，或 `.agents/skills-config.json` 中 `release.scripts.release` 指向的脚本），优先使用该入口选择 dev/prod、版本和 local/remote 执行位置。
- 如项目只有阶段脚本（`scripts/release-dev.sh`、`scripts/release-prod.sh`、`scripts/release-rollback.sh`），在确认已经位于目标服务器项目目录后再直接使用本地脚本。
- 如项目无本地 release 脚本，先检查 shared skill 脚本是否已通过项目配置泛化；若脚本中出现项目特定镜像、容器、域名或路径，不得直接运行，只能作为模板复制并适配到项目本地 `scripts/`。
- 只有排障或维护底层发布逻辑时才直接运行 `docker compose` 命令。
- 项目自定义构建逻辑写在本地 `scripts/deploy.sh`。
- 项目自定义 preflight 检查写在本地 `scripts/preflight-hook.sh`。
- Prod 发布以最近一次成功的 dev release 为门禁，除非用户明确批准 `--allow-without-dev`。
- 如项目启用 SemVer 版本发布，dev/prod 发布必须传入项目文档指定的 `--version <VERSION>`，并从 Git tag 发布，不从 branch HEAD 发布生产。
- 保持自动回滚开启，除非用户明确要求关闭。

### 服务器连接

服务器 SSH alias、用户、仓库路径、域名和凭据策略必须从项目配置或项目文档读取，优先级：

1. `.agents/skills-config.json` 中的部署配置。
2. `docs/ops/DEPLOY.md` 或 `DEPLOY.md`。
3. `docs/ops/RELEASE_WORKFLOW.md`。

shared skill 不写死某个仓库、主机、IP、SSH alias、域名或服务器路径。连接前先用项目文档中的只读验证命令确认身份、主机和工作目录。

### 项目配置

每个项目维护 `scripts/deploy-config.sh`，定义：

| 变量 | 说明 |
|------|------|
| `DEV_COMPOSE_FILE` | 开发环境 compose 文件 |
| `PROD_COMPOSE_FILE` | 生产环境 compose 文件 |
| `DEPLOY_ENV_FILES` | 需检查的 env 文件列表 |
| `DEPLOY_SERVICES` | compose 服务启动顺序 |
| `DEPLOY_CONTAINERS` | 健康检查容器名列表 |
| `DEV_API_BASE_URL` | 开发环境 API URL |
| `PROD_API_BASE_URL` | 生产环境 API URL |
| `BUILD_COMMANDS` | 构建验证命令 |
| `DEPLOY_REMOTE_SSH_ALIAS` | 可选，远程执行发布时使用的 SSH alias |
| `DEPLOY_REMOTE_REPO_PATH` | 可选，远程执行发布时使用的服务器仓库路径 |
| `release.versioning` | 可选，项目版本策略，例如 SemVer tag 格式、分支命名和 Draft tag 规则 |

## 工作流

### 1. 确认远端状态

- 使用项目文档指定的 SSH alias 登录服务器。
- 确认服务器工作目录路径与项目文档一致。
- 确认目标分支和 commit。
- prod 发布前读取最近一次成功 dev release 快照；目标 checkout 应与该快照 version 和 commit 一致，除非用户明确批准绕过 dev 门禁。
- 如服务器不在目标版本，按项目文档同步代码；不要为了 release 文档或 backlog 收尾提交破坏 dev/prod commit 门禁。

### 2. 执行 Dev 发布

运行项目文档指定的 dev release 命令。若存在统一调度入口，默认形态：

```bash
./scripts/release.sh --stage dev --version <VERSION>
```

若项目没有统一调度入口且已经在目标服务器项目目录，默认形态：

```bash
./scripts/release-dev.sh
```

预期结果：

- preflight 通过。
- 构建镜像。
- 更新 dev 栈。
- smoke 通过。
- version 化 dev success 快照更新；若项目保留兼容指针，`deploy/dev-releases/latest-success.env` 也会更新。

宿主机缺少 `node/pnpm` 时，优先运行项目提供的 `preflight --skip-build` 或容器化构建/迁移入口；只有项目文档明确允许时才跳过完整 preflight，且必须保留 Docker build、smoke 和回滚门禁。

dev 前端是否由 release 脚本覆盖以项目 `DEPLOY.md` 为准，不在 shared skill 中假设服务名或容器名。

### 3. 执行 Prod 发布

运行项目文档指定的 prod release 命令。若存在统一调度入口，默认形态：

```bash
./scripts/release.sh --stage prod --version <VERSION>
```

若项目没有统一调度入口且已经在目标服务器项目目录，默认形态：

```bash
./scripts/release-prod.sh
```

预期结果：

- prod preflight 通过。
- version 和 commit 匹配最近 dev release。
- 部署完成。
- smoke 通过。

### 4. 执行回滚

运行：

```bash
.shared-skills/skills/workflow-deploy/scripts/release-rollback.sh --stage prod
.shared-skills/skills/workflow-deploy/scripts/release-rollback.sh --stage dev
```

### 5. 汇报结果

- 汇报服务器路径、部署 commit、dev/prod 快照路径、smoke 结果、是否触发回滚以及遗留访问或环境风险。

## 输入

- 用户指定的部署环境、目标 commit、重启或回滚请求。
- 项目部署配置、compose 文件、服务器凭据和 release 脚本。

## 输出

- 部署或回滚执行结果。
- 快照路径、健康检查结果、回滚状态和风险说明。

## 工具与权限

- `sshpass`、`ssh` 用于连接服务器。
- `docker compose` 由 release 脚本在服务器侧调用。
- shared deploy scripts 用于 dev/prod/rollback 标准流程。

## 常用标志

| 命令 | 标志 |
|------|------|
| `release-dev.sh` | `--skip-build`、`--skip-smoke`、`--no-rollback-on-fail` |
| `release-prod.sh` | `--allow-without-dev`、`--skip-smoke`、`--admin-token <jwt>`、`--no-rollback-on-fail` |

## 自检

- [ ] 部署前已读取 `DEPLOY.md`、compose 文件和 `scripts/deploy-config.sh`。
- [ ] Prod 发布未绕过最近成功 dev release 门禁，除非用户明确批准。
- [ ] 自动回滚保持开启，除非用户明确要求关闭。
- [ ] 输出包含服务器路径、部署 commit、快照路径、smoke 结果和回滚状态。
