# Shared Skills

跨项目通用 AI Agent Skills 仓库。

## 设计理念

**Skill-First**：所有通用 skill 抽离到此仓库，各项目通过 git submodule 引用，并在项目内的 `.agents/skills-config.json` 提供参数化配置。

## 目录结构

```
shared-skills/
├── README.md
└── skills/
    ├── coding-miniapp/       # 小程序端编码规则
    │   └── SKILL.md
    ├── coding-nestjs/      # NestJS 服务端通用编码规则
    │   └── SKILL.md
    ├── coding-nextjs/      # Next.js 前端编码规则
    │   └── SKILL.md
    ├── testing-miniapp-e2e/ # 小程序 E2E 测试编写
    │   └── SKILL.md
    ├── workflow-backlog/    # 需求进度管理（参数化）
    │   └── SKILL.md
    ├── workflow-commit/     # Git 提交规范（参数化）
    │   └── SKILL.md
    └── workflow-release/    # 发布流程（参数化）
        └── SKILL.md
```

## 使用方式

### 1. 以 git submodule 引入项目

```bash
# 在项目根目录
git submodule add <repo-url> .shared-skills
```

### 2. 项目 AGENTS.md 中声明引用

```markdown
## Skills

| Skill | 入口 | 来源 |
|-------|------|------|
| NestJS 编码规则 | `.shared-skills/skills/coding-nestjs/SKILL.md` | shared |
| 提交规范 | `.shared-skills/skills/workflow-commit/SKILL.md` | shared |
| 项目特有 Skill | `.agents/skills/workflow-deploy/SKILL.md` | local |
```

### 3. 项目内提供参数配置

在项目根目录创建 `.agents/skills-config.json`：

```json
{
  "commit": {
    "scopes": [
      { "scope": "web", "desc": "官网前端变更" },
      { "scope": "api", "desc": "业务 API 变更" }
    ],
    "autoCommit": false
  },
  "release": {
    "keyPrefix": "LUG",
    "healthChecks": {
      "dev": "https://api-dev.example.com/health",
      "prod": "https://api.example.com/health"
    },
    "scripts": {
      "preflight": "./scripts/preflight.sh --mode prod",
      "releaseDev": "./scripts/release-dev.sh",
      "releaseProd": "./scripts/release-prod.sh",
      "rollback": "./scripts/release-rollback.sh"
    },
    "migrationRules": [
      "MySQL schema 变更",
      "TypeORM migration 新增或修改",
      "初始化 SQL / RBAC 数据变更"
    ]
  },
  "coding": {
    "nestjs": {
      "paths": ["apps/api", "apps/account-api", "apps/gateway-api"],
      "verifyCommands": {
        "lint": "pnpm lint",
        "build": "pnpm --filter @luggage/api run build",
        "test": "pnpm --filter @luggage/api run test"
      }
    }
  }
}
```

## 占位符约定

Shared SKILL.md 中使用 `{{PARAM}}` 标记需要项目填充的参数：

| 占位符 | 来源 |
|--------|------|
| `{{RELEASE_KEY_PREFIX}}` | `release.keyPrefix` |
| `{{DEV_HEALTH_URL}}` | `release.healthChecks.dev` |
| `{{PROD_HEALTH_URL}}` | `release.healthChecks.prod` |

Agent 读取 SKILL.md 时应同时读取项目的 `skills-config.json`，将占位符解析为实际值。

## 项目特有 Skills

以下 skill 因项目差异过大，保留在各项目本地 `.agents/skills/` 下：

- `workflow-deploy` — 部署操作（服务器、脚本、路径完全不同）
- `coding-nextjs` — Next.js 前端规则（仅 luggage-platform）
- `coding-miniapp` — 小程序规则（仅 miniapp）
- `testing-miniapp-e2e` — 小程序 E2E 测试（仅 miniapp）

## 更新 Shared Skills

```bash
# 在项目中更新 submodule 到最新
cd .shared-skills
git pull origin main
cd ..
git add .shared-skills
git commit -m "chore: update shared-skills submodule"
```
