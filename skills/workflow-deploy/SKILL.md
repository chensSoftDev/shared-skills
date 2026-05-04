---
name: workflow-deploy
description: Docker 部署操作：release 脚本使用、dev/prod 门禁、回滚处理。在执行服务器部署、重启、回滚时使用。
---

# Docker 部署

使用仓库 release 脚本部署 Docker Compose 服务栈。

## 必读文档

执行部署前先阅读：

- `DEPLOY.md`（如有）
- 项目根目录 `docker-compose*.yml`
- 项目 `scripts/deploy-config.sh`（部署配置）

## 核心规则

- 优先使用 shared 脚本（`.shared-skills/scripts/`）：`release-dev.sh`、`release-prod.sh`、`release-rollback.sh`。
- 项目自定义构建逻辑写在本地 `scripts/deploy.sh`。
- 项目自定义 preflight 检查写在本地 `scripts/preflight-hook.sh`。
- Prod 发布以最近一次成功的 dev release 为门禁，除非用户明确批准 `--allow-without-dev`。
- 保持自动回滚开启，除非用户明确要求关闭。

## 服务器凭据

服务器 SSH 连接信息存放在工作区**上级目录**的 `keys.env` 文件中（即 `../keys.env`，相对于本仓库根目录）。

读取方式：

```bash
cat "$(git rev-parse --show-toplevel)/../keys.env"
```

文件格式：

```ini
# linux server
server=<IP>
username=<用户名>
pwd=<密码>
```

连接命令：

```bash
sshpass -p '<pwd>' ssh -o StrictHostKeyChecking=no <username>@<server>
```

## 项目配置

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

## 标准流程

### 1. 确认远端状态

- 从 `../keys.env` 读取服务器 IP、用户名、密码
- 确认服务器工作目录路径
- 确认分支和 commit
- 如不在目标版本，先同步代码

### 2. Dev 发布

```bash
.shared-skills/scripts/release-dev.sh
```

预期结果：preflight 通过 → 构建镜像 → 更新 dev 栈 → smoke 通过 → `deploy/dev-releases/latest-success.env` 更新

### 3. Prod 发布

```bash
.shared-skills/scripts/release-prod.sh
```

预期结果：prod preflight 通过 → commit 匹配最近 dev release → 部署完成 → smoke 通过

### 4. 回滚

```bash
.shared-skills/scripts/release-rollback.sh --stage prod
.shared-skills/scripts/release-rollback.sh --stage dev
```

## 常用标志

| 命令 | 标志 |
|------|------|
| release-dev.sh | `--skip-build`、`--skip-smoke`、`--no-rollback-on-fail` |
| release-prod.sh | `--allow-without-dev`、`--skip-smoke`、`--admin-token <jwt>`、`--no-rollback-on-fail` |

## 完成后检查清单

部署完成后在回复中包含：

- 服务器路径
- 部署的 commit
- dev/prod 快照路径
- smoke 结果
- 是否触发回滚
- 遗留的访问或环境风险
