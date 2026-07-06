---
name: video-generation
description: 短视频生产全流程编排器：选题→脚本→素材→配音→剪辑→发布→数据复盘。在用户要求生成短视频并期望输出 MP4 时使用。
---

# 短视频生产流程（编排器）

## 角色

从主题关键词出发，编排「选题、脚本、素材、配音、剪辑、发布、复盘」全流程。本 skill 不包含具体的 TTS、渲染或合成逻辑——这些由独立的子 skill 负责。编排器负责串联各环节、传递参数、校验产物，最终输出竖屏短视频 `final.mp4`。

## 约束

### 架构：管道编排

每个生产环节由独立 skill 实现，编排器按顺序调用并传递中间产物。

| 阶段 | 子 Skill | 输入 | 输出 | 用户确认 |
|------|----------|------|------|----------|
| 选题 | 编排器自身 | 关键词 | 主题 + 输出目录 | ✅ 确认主题 |
| 脚本 | `video-script-generation` | 主题 | `script.json` | ✅ 确认脚本 |
| 素材 | `video-asset` | 脚本 + 风格要求 | `assets/` | ✅ 确认素材方案 |
| 配音 | `video-tts` | 脚本 + provider 配置 | `audio/` + 时长 | 无 |
| 渲染 | `video-clip-render` | 素材 + 音频 + timeline | `clips/` | 无 |
| 合成 | `video-compose` | 片段 + 时长 | `final.mp4` + 字幕 | ✅ 确认成品 |
| 发布 | 编排器自身 | 脚本 + 视频 | 文案 + 封面建议 | 无 |
| 复盘 | 编排器自身 | 用户反馈数据 | `review.md` | 无 |

### Provider 选择

每个子 skill 支持多 provider，编排器将用户选择向下传递：

| 环节 | 可选 Provider | 默认 |
|------|--------------|------|
| TTS | `macos-say`、`doubao-tts` | `macos-say` |
| 素材 | `user-provided`、`ai-image-gen`、`ai-video-gen`、`stock-photo` | `user-provided` |
| 渲染 | `ffmpeg-local` | `ffmpeg-local` |

### 渲染规则

- 真实语音超过计划时长时，以真实语音时长为准。
- 字幕时间戳基于 `ffprobe` 读取的真实音频时长。
- 配音、渲染和合成连续执行，开始前需向用户确认脚本和素材已就绪。

## 上下文

### 子 Skill 入口

- `video-script-generation`：脚本创作。
- `video-asset`：素材获取（用户素材 / AI 图片生成 / AI 视频生成 / 图库）。
- `video-tts`：TTS 配音（macOS say / 豆包 TTS / 其他 API）。
- `video-clip-render`：视频片段渲染（ffmpeg 合成，自动识别图片/视频素材）。
- `video-compose`：片段拼接 + 字幕 + 摘要。

### 本 Skill 资源文件

- `scripts/generate_video.js`：一键生成 CLI，内部调用各子 skill 脚本，保留快速模式兼容。
- `scripts/config.js`：集中默认值。
- `scripts/scene_templates.js`：场景角色定义和对白变体参考（快速模式使用）。
- `references/animation_templates.md`：需要扩展动画表现时按需读取。
- `references/style_examples.md`：需要统一视觉风格时按需读取。

### 依赖

基础依赖由各子 skill 自行声明。编排器本身仅需 Node.js。

## 工作流

### Step 1. 选题

- 用户给出关键词；如果模糊，提炼为 5-8 字的主题短语。
- 创建输出目录：

```bash
mkdir -p output/video-generation/<slug>
```

- 将该目录记为 `<outputDir>`，后续所有产物写入此处。
- 向用户确认主题关键词和输出目录后再继续。

### Step 2. 脚本

- 调用 `video-script-generation` skill 完成脚本创作。
- 产出 `<outputDir>/script.json`。
- 脚本确认后再进入素材阶段，否则后续配音和渲染都要重跑。

### Step 3. 素材

- 调用 `video-asset` skill，传入 `script.json` 和用户素材目录（如有）。
- 该 skill 会盘点现有素材、补充缺失素材、向用户展示方案并等待确认。
- 确认后 `<outputDir>/assets/` 中应有每个场景的素材文件。

### Step 4. 配音

调用 `video-tts` skill：

```bash
node .shared-skills/skills/video-tts/scripts/tts.js \
  --script <outputDir>/script.json \
  --audio-dir <outputDir>/audio \
  --provider <tts-provider> \
  --voice <voice-name>
```

- 输出 `audio/scene_XX.aiff`（或 `.mp3`）和时长信息。
- 读取输出的 durations 数组，供后续 timeline 构建使用。

### Step 5. 补齐音频并构建 Timeline

- 根据 `video-tts` 返回的真实时长和脚本计划时长，构建 timeline。
- 逐场景补齐音频到最终时长，输出 `audio/scene_XX.m4a`。

### Step 6. 渲染片段

调用 `video-clip-render` skill：

```bash
node .shared-skills/skills/video-clip-render/scripts/render_clip.js \
  --timeline <outputDir>/timeline.json \
  --audio-dir <outputDir>/audio \
  --clip-dir <outputDir>/clips \
  --assets <outputDir>/assets \
  --provider <render-provider>
```

### Step 7. 合成

调用 `video-compose` skill：

```bash
node .shared-skills/skills/video-compose/scripts/compose.js \
  --script <outputDir>/script.json \
  --clip-dir <outputDir>/clips \
  --output-dir <outputDir> \
  --durations '12.3,14.5,...' \
  --keyword "主题关键词"
```

验证产物：

| 文件 | 说明 |
|------|------|
| `final.mp4` | 最终视频 |
| `subtitles.srt` | 同步字幕 |
| `script.json` | 使用的脚本 |
| `timeline.json` | 时间轴 |
| `summary.json` | 生成摘要 |
| `audio/` | 各场景语音文件 |
| `clips/` | 各场景视频片段 |

- 渲染完成后读取 `summary.json`，向用户报告视频路径、总时长和场景数。
- 如渲染失败，明确指出失败阶段和缺失依赖或输入。
- 请用户查看 `final.mp4`；如需调整，对白问题回到 Step 2，素材问题回到 Step 3，配音问题重跑 Step 4。

### Step 8. 发布

- 根据脚本和目标平台生成标题、话题标签、简介文案。
- 建议封面场景或指出 `clips/` 中适合做封面的时间点。
- 提供发布检查清单：视频、标题、话题、字幕、封面、发布时间。

### Step 9. 数据复盘

- 当用户反馈数据时，收集播放量、完播率、点赞数、评论数、转发数。
- 分析开场钩子、互动场景和时长是否有效。
- 写入 `<outputDir>/review.md`，包含数据快照、做得好的点和下次改进建议。
- 基于复盘给出下一条视频选题建议。

## 输入

- 主题关键词、目标平台、目标时长、语气、素材目录和输出目录。
- 可选的 provider 配置：TTS provider、渲染 provider。
- 可选的现成 `script.json` 或用户自有素材。

## 输出

- `<outputDir>/script.json`。
- `<outputDir>/assets/`。
- `<outputDir>/audio/`。
- `<outputDir>/clips/`。
- `<outputDir>/timeline.json`。
- `<outputDir>/subtitles.srt`。
- `<outputDir>/summary.json`。
- `<outputDir>/final.mp4`。
- 发布文案、封面建议和复盘笔记。

## 快速模式（一键 CLI）

保留旧版一键生成入口，内部自动串联所有子 skill 脚本：

```bash
# 默认 provider（macos-say + ffmpeg-local）
node .shared-skills/skills/video-generation/scripts/generate_video.js "主题关键词"

# 使用豆包 TTS + AI 视频素材
DOUBAO_API_KEY=xxx node .shared-skills/skills/video-generation/scripts/generate_video.js "主题关键词" \
  --script <outputDir>/script.json \
  --tts-provider doubao-tts \
  --asset-provider ai-video-gen
```

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--script <file>` | 外部脚本 JSON，跳过内置模板 | 无 |
| `--out <dir>` | 输出根目录 | `output/video-generation` |
| `--assets <dir>` | 场景素材目录 | 无 |
| `--tts-provider <name>` | TTS 引擎 | `macos-say` |
| `--asset-provider <name>` | 素材生成引擎 | `ai-video-gen` |
| `--voice <name>` | 语音角色 | `Tingting` |
| `--rate <number>` | 语速 | `185` |
| `--width <px>` | 视频宽度 | `1080` |
| `--height <px>` | 视频高度 | `1920` |
| `--templates <file>` | 自定义模板 JSON，仅快速模式 | 内置模板 |
| `--target-duration <sec>` | 目标总时长，仅快速模式 | `105` |
| `--max-scenes <num>` | 限制场景数 | 全部 |
| `--duration-scale <num>` | 时长缩放，烟测用 | `1` |

## 自检

- [ ] 主题关键词和输出目录已让用户确认。
- [ ] 脚本已由用户确认后才进入素材阶段。
- [ ] 每个场景都有实际素材来源，未使用纯色卡片兜底。
- [ ] 渲染前已确认脚本和素材都已就绪。
- [ ] `final.mp4`、`subtitles.srt`、`timeline.json`、`summary.json` 已生成并汇报。
- [ ] 使用网络素材时已确认免费可商用授权。
