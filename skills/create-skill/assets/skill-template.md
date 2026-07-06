# Skill 内容格式规范

新建或修改 `.ai/skills/<name>/SKILL.md` 时，应按以下结构组织内容。各章节按需使用，非必填章节可省略，但顺序应保持一致。

## 标准章节

| 顺序 | 章节 | 必须 | 说明 |
|:---:|:---|:---:|:---|
| 1 | **YAML Frontmatter** | ✅ | `name`、`description`，可选 `model`、`readonly`、`disable-model-invocation` 等 |
| 2 | **角色（Identity）** | ✅ | 标题 + 一段话说明该 Skill 是什么、解决什么问题 |
| 3 | **约束（Rules）** | 推荐 | 该 Skill 必须遵守的硬约束，以及引用的外部规则（`rules/` 路径） |
| 4 | **上下文（Knowledge）** | 可选 | 执行所需的背景知识，引用 `context/` 路径或内联关键概念 |
| 5 | **工作流（Workflow）** | ✅ | 按编号步骤描述执行流程，每步明确输入/动作/输出 |
| 6 | **输入输出（Schema）** | 推荐 | 明确输入参数和输出产物的格式要求 |
| 7 | **示例（Examples）** | 可选 | 典型输入输出示例，帮助理解预期行为 |
| 8 | **工具（Tools）** | 可选 | 该 Skill 可使用的工具和权限声明（如 `git_write`、MCP 调用等） |
| 9 | **自检（Evaluation）** | 推荐 | 执行完成后的自检清单，用于验证输出是否符合预期 |

## 章节详细说明

### 1. YAML Frontmatter

```yaml
---
name: <skill-name>
description: <一句话描述 Skill 用途和触发场景>
---
```

- `name` 与目录名保持一致。
- `description` 应包含关键触发词，便于 AI 路由匹配。

### 2. 角色（Identity）

用标题和一段话说明：
- 该 Skill **是什么**
- 解决**什么问题**
- **适用场景**

```markdown
# Git Commit Assistant（Git 提交助手）

## 目标

根据用户提供的路径，分析已暂存变更，生成符合 commitlint 规范的 commit 信息并执行提交。
```

### 3. 约束（Rules）

列出该 Skill 必须遵守的规则，分为：
- **内联约束**：仅本 Skill 使用的约束，直接写在此处
- **外部引用**：引用 `docs/` 下各分类的共享规则，使用相对路径

```markdown
## 约束

- subject 和 body 必须使用中文撰写
- body 每行不超过 100 字符
- 遵循 [编码规则](../../../docs/coding/rules/index.md) 中当前项目平台对应的命名规范
```

### 4. 上下文（Knowledge）

引用执行所需的背景知识：

```markdown
## 上下文

- 项目架构：`.ai/docs/architecture/knowledge/architecture.md`
- 业务背景：`.ai/docs/knowledge/business.md`（涉及业务模块时）
```

### 5. 工作流（Workflow）

以编号步骤组织，每步包含：
- **触发条件**（可选）：何时执行该步骤
- **具体动作**：做什么
- **输出**：该步骤产出什么

```markdown
## 工作流程

### 1. 解析输入
- 将用户路径规范化为绝对路径
- 判断是根仓库还是子模块

### 2. 获取数据
- 执行 `git diff --staged` 获取变更内容
- 若无 staged 变更，提示用户并结束
```

### 6. 输入输出（Schema）

明确描述 Skill 接受的输入和产出的输出：

```markdown
## 输入

- **路径**：目录路径，默认为工作区根目录
- **变更范围**：仅 staged 变更

## 输出

- 变更分析报告（变更内容、影响范围、测试策略）
- 格式化的 commit message
```

### 7. 示例（Examples）

提供 1-2 个典型场景的输入输出示例：

```markdown
## 示例

### 普通提交
输入：`提交根目录`
输出：分析 staged diff → 生成 commit message → 用户确认 → 执行提交

### Bug 修复提交
输入：`提交根目录`（分支名含 fix/bugfix）
输出：额外产出问题现象、根因、修复点、回归策略
```

### 8. 工具（Tools）

声明该 Skill 需要的工具和权限：

```markdown
## 工具与权限

- `git`（只读：status、diff、log）
- `git_write`（提交：commit）
- 文件读取（read_file、grep_search）
```

### 9. 自检（Evaluation）

执行完成后的检查清单：

```markdown
## 自检

- [ ] commit message 符合 commitlint 规范
- [ ] body 每行 ≤ 100 字符
- [ ] 影响范围描述准确，无遗漏
- [ ] 用户已确认后才执行提交
```

## 注意事项

- 章节顺序应保持上述标准顺序，便于快速定位。
- 可选章节在不需要时直接省略，不要留空章节。
- 已有 Skill 不强制立即重构，新建和大改时遵循本规范。
