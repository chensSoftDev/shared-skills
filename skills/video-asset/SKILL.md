---
name: video-asset
description: 视频素材获取：为视频场景准备图片或视频素材。在需要搜索、生成或管理视频场景素材时使用。
---

# 视频素材获取

## 角色

根据视频脚本的场景描述，通过用户自有素材、AI 生成或可商用图库等方式，为每个场景准备视觉素材。输出标准化命名的素材文件到 `assets/` 目录，供后续渲染环节消费。

## 约束

### Provider 体系

按优先级选择素材来源，支持同一项目中混合使用不同 provider。

| 优先级 | Provider | 说明 | 成本 |
|--------|----------|------|------|
| 1 | `user-provided` | 用户已有素材，按场景编号命名 | 免费 |
| 2 | `ai-image-gen` | AI 图片生成（根据场景描述构造 prompt） | 按量付费 |
| 3 | `ai-video-gen` | AI 视频片段生成（豆包、Kling 等） | 按量付费 |
| 4 | `stock-photo` | 可商用图库（Unsplash、Pexels、Pixabay） | 免费 |

### 素材规格

- 命名规则：`scene_01.png`、`scene-01.jpg`、`01.webp` 等，支持灵活匹配。
- 支持格式：`.png`、`.jpg`、`.jpeg`、`.webp`（图片）；`.mp4`（视频片段）。
- 竖屏视频推荐分辨率不低于 1080x1920。
- 所有场景素材风格应保持统一。

### 版权与合规

- 不复制受保护角色、具体 IP 形象或未授权截图。
- 网络素材仅使用明确标注为可商用的来源。
- AI 生成素材需保持风格统一，并能支撑具体场景内容。
- 不使用纯色卡片作为素材兜底。

## 工作流

### 1. 盘点现有素材

- 检查用户是否提供素材目录。
- 扫描目录中按场景编号命名的文件，列出匹配情况。
- 识别缺失素材的场景列表。

### 2. 补充缺失素材

对每个缺失素材的场景：

1. 读取 `script.json` 中的 `description`、`action` 和 `title`。
2. 按 provider 优先级尝试获取素材。
3. AI 生成时，根据场景描述构造 prompt，约定统一色调、构图和风格。
4. 图库搜索时，从场景标题和关键词提取搜索词。
5. 下载或生成后保存到 `<outputDir>/assets/` 并按场景编号命名。

**AI 视频生成（`ai-video-gen`）流程：**

1. 根据场景 `description` 和 `action` 构造视频生成 prompt。
2. 提交生成任务，轮询直到完成。
3. 下载生成的视频片段到 `assets/scene_XX.mp4`。
4. 视频素材会在后续 `video-clip-render` 环节中与音频合成。

执行命令：

```bash
# 盘点现有素材
node .shared-skills/skills/video-asset/scripts/asset.js \
  --script <outputDir>/script.json \
  --assets-dir <outputDir>/assets

# AI 视频生成补充缺失素材
DOUBAO_API_KEY=xxx node .shared-skills/skills/video-asset/scripts/asset.js \
  --script <outputDir>/script.json \
  --assets-dir <outputDir>/assets \
  --provider ai-video-gen
```

### 3. 用户确认

- 向用户展示每个场景的素材方案和来源。
- 列出素材清单表格：场景编号、来源 provider、文件路径。
- 等待用户确认后，后续渲染环节才能消费素材。

## 上下文

### 资源文件

- `scripts/asset.js`：主脚本，包含素材盘点和 AI 视频生成逻辑。

### 依赖

- 网络访问（仅 API 类 provider）。
- AI 视频生成需要 `DOUBAO_API_KEY` 环境变量。

## 输入

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--script <file>` | 脚本 JSON 文件路径 | 必填 |
| `--assets-dir <dir>` | 素材输出目录 | 必填 |
| `--provider <name>` | 素材生成 provider | `ai-video-gen` |

## 输出

- `<outputDir>/assets/scene_XX.{png,jpg,mp4}`：每个场景的素材文件。
- 素材清单：列出每个场景的素材来源和文件路径。

## 自检

- [ ] 每个场景都有对应素材文件，无遗漏。
- [ ] 未使用纯色卡片兜底。
- [ ] 网络素材均来自可商用来源。
- [ ] 素材风格在各场景间保持统一。
- [ ] 素材方案已获得用户确认。
- [ ] API Key 未出现在代码或日志中。
