# Shared Skills

跨项目通用 AI Agent Skills 仓库。

## 设计理念

**Skill-First**：所有通用 skill 抽离到此仓库，各项目通过 `.agents/shared-skills` git submodule 引用，并在项目内的 `AGENTS.md` 按需声明入口。

## 目录结构

```
shared-skills/
├── README.md
├── scripts/
│   ├── bootstrap-project.sh
│   └── bootstrap-project.test.sh
└── skills/
    ├── stock-daily-review/ # A 股每日涨停复盘
    │   ├── SKILL.md
    │   ├── examples/
    │   ├── references/
    │   └── tracking/
    ├── coding-miniapp/     # 小程序端编码规则
    │   └── SKILL.md
    ├── coding-nestjs/      # NestJS 服务端通用编码规则
    │   └── SKILL.md
    ├── coding-nextjs/      # Next.js 前端编码规则
    │   └── SKILL.md
    ├── create-skill/       # Skill 创建与维护流程
    │   ├── SKILL.md
    │   └── assets/
    ├── testing-miniapp-e2e/ # 小程序 E2E 测试编写
    │   └── SKILL.md
    ├── video-asset/         # 视频素材获取
    │   └── SKILL.md
    ├── video-clip-render/   # 视频片段渲染
    │   ├── SKILL.md
    │   └── scripts/
    ├── video-compose/       # 视频合成
    │   ├── SKILL.md
    │   └── scripts/
    ├── video-generation/   # 短视频生产编排器
    │   ├── SKILL.md
    │   ├── references/
    │   └── scripts/
    ├── video-script-generation/ # 短视频脚本生成
    │   └── SKILL.md
    ├── video-tts/           # 视频配音（TTS）
    │   ├── SKILL.md
    │   └── scripts/
    ├── workflow-backlog/    # 需求进度管理（参数化）
    │   ├── SKILL.md
    │   └── references/
    │       ├── change-registration.md
    │       ├── migration-gate.md
    │       └── release-planning.md
    ├── workflow-commit/     # Git 提交规范（参数化）
    │   └── SKILL.md
    ├── workflow-deploy/     # Docker 部署流程
    │   ├── SKILL.md
    │   └── scripts/
    └── workflow-release/    # 发布流程（参数化）
        └── SKILL.md
```

## Skills 索引

| Skill | 典型触发 | 职责 | subagent 调用 |
|-------|----------|------|---------------|
| `stock-daily-review` | 复盘 A 股涨停、分析题材归类、硬逻辑/擦边逻辑和短线情景推演 | 约束 A 股每日复盘的数据核验、涨停池口径、逻辑分层、风险声明和追踪沉淀 | 否 |
| `coding-miniapp` | 编写或修改 `miniapp/` 小程序代码 | 约束小程序 UI、API 基址、交互、数量格式和写操作配套要求 | 否 |
| `coding-nestjs` | 编写或修改 NestJS 服务端代码 | 约束安全、鉴权、迁移、精度、审计日志、事务和验证要求 | 否 |
| `coding-nextjs` | 编写或修改 `apps/web`、`apps/admin` 前端代码 | 约束设计系统、token、双语、环境变量和确认交互 | 否 |
| `create-skill` | 新建、更新、改造或校验 skill | 维护 skill 结构、模板、资源引用、注册同步和格式校验 | 是 |
| `testing-miniapp-e2e` | 创建、拆分或重构小程序 E2E 测试 | 指导 miniprogram-automator 用例拆分、步骤化实现和 helper 提取 | 否 |
| `video-asset` | 为视频场景准备素材 | 从用户素材、AI 生成或图库获取场景素材 | 是 |
| `video-clip-render` | 渲染视频场景片段 | 将素材+音频+元数据合成为视频片段（ffmpeg/AI API） | 是 |
| `video-compose` | 合并视频片段为完整视频 | 拼接片段、生成字幕和摘要 | 是 |
| `video-generation` | 用户要求生成短视频并输出 MP4 | 编排器：串联脚本、素材、配音、渲染、合成全流程 | 否 |
| `video-script-generation` | 用户要求写视频脚本、视频文案或短视频对白 | 生成结构化 `script.json`，供视频生产管道消费 | 是 |
| `video-tts` | 为视频场景生成配音 | 多 provider TTS（macOS say / 豆包 TTS） | 是 |
| `workflow-backlog` | 评审需求、推进需求状态、处理 `BACKLOG.md` | 编排变更登记 → 迁移门禁 → 发布规划全流程（子流程在 references/ 中） | 否 |
| `workflow-commit` | 生成 commit message 或执行 git commit | 规范 commit type、scope 和自动提交策略 | 否 |
| `workflow-deploy` | 执行 Docker 部署、重启或回滚 | 使用 release 脚本完成 dev/prod 发布、门禁、smoke 和回滚 | 否 |
| `workflow-release` | 准备上线、创建 Release、执行生产发布 | 维护 Release 目录、变更日志、迁移、生产计划和健康检查 | 否 |

## 使用方式

### 1. 一行命令快速接入

```bash
# 在项目根目录执行
curl -fsSL <shared-skills-raw-url>/scripts/bootstrap-project.sh \
  | bash -s -- --repo <shared-skills-git-url>
```

脚本会将本仓库作为 `.agents/shared-skills` submodule 接入，生成 `.agents/skills-config.json`，并创建或更新项目根目录的 `AGENTS.md`。

只接入部分 skill 时，使用 `--skills`：

```bash
# 短视频项目示例
bash /path/to/shared-skills/scripts/bootstrap-project.sh \
  --repo /path/to/shared-skills \
  --skills video-generation,video-script-generation
```

可选参数：

| 参数 | 说明 |
|------|------|
| `--repo <url-or-path>` | shared-skills git URL 或本地仓库路径，必填 |
| `--path <submodule-path>` | submodule 路径，默认 `.agents/shared-skills` |
| `--skills <names>` | 逗号分隔的 skill 名称，仅在 `AGENTS.md` 引用这些 skill |
| `--force` | 兼容参数；`AGENTS.md` 的托管区块每次都会重建 |

### 2. 手动以 git submodule 引入项目

```bash
# 在项目根目录
git submodule add <repo-url> .agents/shared-skills
```

### 3. 项目 AGENTS.md 中声明引用

脚本会自动创建或更新下面这个托管区块。已有 `AGENTS.md` 中该区块之外的内容不会被修改。

```markdown
<!-- shared-skills:start -->
## Shared Skills

This project uses shared skills from `.agents/shared-skills`.

| Skill | Entry | Description |
|-------|-------|-------------|
| `coding-nestjs` | `.agents/shared-skills/skills/coding-nestjs/SKILL.md` | NestJS 服务端编码规则 |
| `workflow-commit` | `.agents/shared-skills/skills/workflow-commit/SKILL.md` | Git 提交规范 |
<!-- shared-skills:end -->
```

### 4. 项目内提供参数配置

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

项目差异较大的流程仍可保留在各项目本地 `.agents/skills/` 下。若本地 skill 与 shared skill 同名，项目 `AGENTS.md` 应明确优先使用哪一个入口。

## 更新 Shared Skills

```bash
# 在项目中更新 submodule 到最新
cd .agents/shared-skills
git pull origin main
cd ..
cd ..
git add .agents/shared-skills
git commit -m "chore: update shared-skills submodule"
```
