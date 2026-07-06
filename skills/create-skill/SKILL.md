---
name: create-skill
description: 创建或更新 skill：负责需求理解、结构规划、SKILL.md 编写、资源文件创建、README/AGENTS 注册同步与格式校验。当用户要求新建 skill、更新已有 skill、改造 skill 结构或校验 skills 变更时触发。
---

# Skill 创建与维护

## 角色

创建、更新和校验当前仓库的 skill，确保目录结构、`SKILL.md` 内容、资源引用和注册信息一致。默认适配本仓库 `skills/<name>/`，在项目本地仓库中也可按已有约定适配 `.ai/skills/<name>/`。

## 约束

### 目录规范

优先识别当前仓库使用的 skill 根目录：

- shared-skills 仓库：`skills/<name>/`。
- 项目本地 AI 目录：`.ai/skills/<name>/`。

标准结构：

```text
<skills-root>/<name>/
├── SKILL.md              # 必须，skill 定义
├── scripts/              # 可选，确定性可执行脚本
├── references/           # 可选，按需加载的参考文档
└── assets/               # 可选，模板、图片等输出资源
```

### SKILL.md 格式

内容格式以 [assets/skill-template.md](./assets/skill-template.md) 为准。必填项：

- YAML Frontmatter：`name` 与目录名一致，`description` 包含触发关键词。
- 角色：标题加一段话，说明该 skill 是什么、解决什么问题、何时适用。
- 工作流：编号步骤，每步明确输入、动作和输出。

推荐项：

- 约束：必须遵守的硬规则。
- 上下文：执行所需背景知识或资源文件。
- 输入输出：可接受输入和产出格式。
- 工具与权限：需要使用的命令、脚本或外部能力。
- 自检：执行完成后的验收清单。

### 渐进式上下文

skill 使用三级加载体系：

| 层级 | 何时加载 | 大小建议 |
|------|----------|----------|
| Frontmatter | 始终在上下文中 | 约 100 词 |
| `SKILL.md` 正文 | skill 被触发时 | 少于 5000 词 |
| `references/`、`scripts/`、`assets/` | 按需加载或执行 | 不限 |

保持 `SKILL.md` 精简。详细参考材料、大段示例、schema 定义放入 `references/`；核心流程和约束留在 `SKILL.md`。

### 注册同步

新增或删除 skill 后，必须同步仓库内的注册或索引位置：

- 若存在 `AGENTS.md` 的 Skills 表，更新 `AGENTS.md`。
- 若不存在 `AGENTS.md`，更新 `README.md` 的目录结构或 Skills 列表。

注册项至少说明：

| 字段 | 说明 |
|------|------|
| Skill | skill 名称，与目录名一致 |
| 典型触发 | 用户何时会用到 |
| 职责 | 一句话描述 |
| subagent 调用 | 是否支持被其他 skill 以 subagent 方式调用 |

### 目录治理

- 共享规则只在被 2 个及以上 skill 复用时放入公共 docs/rules；单消费者规则就近放到 skill 自己目录。
- 修改 skill 相关文件后，用搜索命令扫描引用，避免断链。
- 引用资源文件时写最终路径，不依赖历史别名目录。

## 工作流

### 1. 理解需求

- 明确 skill 要解决的问题。
- 明确典型触发方式，例如用户会说什么话触发。
- 收集具体使用示例。
- 判断是否需要以 subagent 方式被其他 skill 调用。
- 信息足够后进入规划，避免一次问太多问题。

### 2. 规划结构

- 确定 `SKILL.md` 需要包含的章节。
- 判断是否需要 `scripts/`、`references/` 或 `assets/`。
- 识别是否需要引用外部共享规则。
- 对新增、删除或重命名 skill，确定需要同步的 `AGENTS.md` 或 `README.md` 条目。

### 3. 创建或更新文件

- 创建或更新 `<skills-root>/<name>/SKILL.md`。
- 必要时创建资源文件。
- 删除不需要的空目录。
- 保持资源文件在 `SKILL.md` 中有明确引用路径。

### 4. 注册与校验

- 同步更新 `AGENTS.md` 或 `README.md`。
- 检查 `SKILL.md` 的 `name` 与目录名一致。
- 检查 `description` 是否包含关键触发词。
- 检查必填章节是否齐全。
- 搜索仓库内引用，确认无断链。

### 5. 迭代

- 根据用户测试或校验结果回到对应步骤修改。
- 大幅修改时重新执行注册和链接校验。

## 输入

- 用户的新建、更新、迁移、改造或校验 skill 请求。
- 当前仓库的 skill 根目录、已有 skill、README 或 AGENTS 注册表。
- 可选的模板、参考文档、脚本或项目规范。

## 输出

- 新增或更新的 skill 目录。
- 符合模板的 `SKILL.md`。
- 必要的 `scripts/`、`references/`、`assets/` 文件。
- 同步后的 `README.md` 或 `AGENTS.md`。
- 格式、注册和链接校验结果。

## 工具与权限

- 文件读取与搜索，用于识别仓库结构和现有注册信息。
- 文件编辑，用于更新 `SKILL.md`、资源文件和注册表。
- shell 校验命令，用于检查格式、路径和引用。

## 自检

- [ ] `SKILL.md` 的 `name` 与目录名一致。
- [ ] `description` 包含关键触发词。
- [ ] 必填章节齐全：Frontmatter、角色、工作流。
- [ ] 资源文件在 `SKILL.md` 中有明确引用路径。
- [ ] 新增、删除或重命名 skill 已同步 `README.md` 或 `AGENTS.md`。
- [ ] 仓库内无断链引用。
