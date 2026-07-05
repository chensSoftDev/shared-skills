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

- 如项目有本地 release 脚本（`scripts/release-dev.sh`、`scripts/release-prod.sh`、`scripts/release-rollback.sh`），优先使用本地脚本。
- 如项目无本地 release 脚本，使用 shared skill 脚本：`.shared-skills/skills/workflow-deploy/scripts/release-dev.sh`、`release-prod.sh`、`release-rollback.sh`。
- 只有排障或维护底层发布逻辑时才直接运行 `docker compose` 命令。
- 项目自定义构建逻辑写在本地 `scripts/deploy.sh`。
- 项目自定义 preflight 检查写在本地 `scripts/preflight-hook.sh`。
- Prod 发布以最近一次成功的 dev release 为门禁，除非用户明确批准 `--allow-without-dev`。
- 保持自动回滚开启，除非用户明确要求关闭。

### 服务器连接

当前目标是一台共享云服务器，不是 luggage-platform 专用机器。常规部署使用本机 SSH alias：

```bash
ssh ai
```

约定：

| 项 | 值 |
|---|---|
| SSH alias | `ai` |
| SSH 用户 | `ai` |
| 服务器仓库路径 | `/root/codebase/luggage-platform` |

本机 SSH 配置应使用 key 登录和主机指纹校验：

```sshconfig
Host ai
  HostName 43.153.152.124
  User ai
  IdentityFile ~/.ssh/ai_ed25519
  IdentitiesOnly yes
  StrictHostKeyChecking yes
  UserKnownHostsFile ~/.ssh/known_hosts
```

验证方式：

```bash
ssh -o BatchMode=yes ai "hostname; whoami; pwd"
```

服务器 SSH 密码登录已禁用；root 密码登录也已禁用。常规部署必须使用 `ssh ai` 的 key 登录。

`../keys.env` 明文密码文件不作为常规部署入口；如人工恢复该文件，也只允许作为紧急兜底。使用兜底密码前必须确认 SSH key 不可用的原因，并避免在命令行中直接写明文密码。

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

## 工作流

### 1. 确认远端状态

- 使用 `ssh ai` 登录共享服务器。
- 确认服务器工作目录路径为 `/root/codebase/luggage-platform`。
- 确认目标分支和 commit。
- 如服务器不在目标版本，先同步代码。

### 2. 执行 Dev 发布

运行：

```bash
ssh ai
cd /root/codebase/luggage-platform
./scripts/release-dev.sh
```

预期结果：

- preflight 通过。
- 构建镜像。
- 更新 dev 栈。
- smoke 通过。
- `deploy/dev-releases/latest-success.env` 更新。

当前共享服务器宿主机缺少 `node` 时，允许对 dev 使用 `./scripts/release-dev.sh --skip-preflight`，但 Docker build、backend smoke 和 shadow gateway smoke 仍必须执行。

dev 前端当前以 Docker 容器运行，`release-dev.sh` 只覆盖 account/api/gateway 后端栈；web/admin dev 需按 `docs/ops/DEPLOY.md` 的“Dev 发布当前实际流程”单独构建并替换 `luggage-web-dev`、`luggage-admin-dev`。

### 3. 执行 Prod 发布

运行：

```bash
ssh ai
cd /root/codebase/luggage-platform
./scripts/release-prod.sh
```

预期结果：

- prod preflight 通过。
- commit 匹配最近 dev release。
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
