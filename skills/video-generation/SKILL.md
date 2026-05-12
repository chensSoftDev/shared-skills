---
name: video-generation
description: 短视频生产全流程：选题→脚本→素材→配音→剪辑→发布→数据复盘。在用户要求生成短视频并期望输出 MP4 时使用。
---

# 短视频生产流程

## 角色

从主题关键词出发，组织「选题、脚本、素材、配音、剪辑、发布、复盘」全流程，最终输出竖屏短视频 `final.mp4` 及配套字幕、时间轴和摘要文件。

## 约束

### 阶段总览

| 阶段 | 步骤 | 执行方 | 用户确认 | 产物 |
|------|------|--------|----------|------|
| 选题 | Step 1 | AI + 用户 | 确认主题 | 确定主题和输出目录 |
| 脚本 | Step 2 | AI | 确认脚本 | `script.json` |
| 素材 | Step 3 | AI + 用户 | 确认素材方案 | `assets/` 素材目录 |
| 配音 | Step 4 | 脚本自动 | 无 | `audio/*.aiff`、`audio/*.m4a` |
| 剪辑 | Step 5 | 脚本自动 | 确认开始和成品 | `clips/*.mp4`、`final.mp4`、`subtitles.srt` |
| 发布 | Step 6 | 用户 | 无 | 发布文案、封面建议、发布检查清单 |
| 复盘 | Step 7 | AI + 用户 | 无 | `review.md` |

### 素材规则

- 每个场景必须有实际素材：用户自有素材、AI 生成素材或免费可商用图库素材。
- 不使用纯色卡片作为素材兜底。
- 网络素材仅使用明确标注为可商用的来源，不使用未授权版权图片。
- 素材命名支持 `scene_01.png`、`scene-01.jpg`、`01.webp` 等形式。
- 支持格式：`.png`、`.jpg`、`.jpeg`、`.webp`。

### 版权和合规

- 不复制受保护角色、具体 IP 形象或未授权截图。
- AI 生成图像和图库素材需保持风格统一，并能支撑具体场景内容。

### 渲染规则

- 真实语音超过计划时长时，以真实语音时长为准。
- 字幕时间戳基于 `ffprobe` 读取的真实音频时长。
- 配音和剪辑会一起执行，开始前需向用户确认脚本和素材已就绪。

## 上下文

### 资源文件

- `scripts/generate_video.js`：主入口，一键生成 MP4，包含 TTS、字幕和渲染全流程。
- `scripts/config.js`：集中默认值。
- `scripts/scene_templates.js`：场景角色定义和对白变体参考。
- `references/animation_templates.md`：需要扩展动画表现时按需读取。
- `references/style_examples.md`：需要统一视觉风格时按需读取。

### 依赖

- macOS `say`：中文旁白，默认 `Tingting`。
- `ffmpeg` 和 `ffprobe`：渲染视频和读取音频时长。
- 支持中文的系统字体，例如 PingFang、STHeiti、Hiragino Sans GB 或 Arial Unicode。

## 工作流

### Step 1. 选题

- 用户给出关键词；如果模糊，提炼为 5-8 字的主题短语，例如“为什么你总是存不下钱”。
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

- 检查用户是否提供素材目录，例如 `assets/video/`。
- 有素材目录时，确认是否有按场景编号命名的图片，并列出匹配情况。
- 缺少部分或全部素材时，按优先级补充：

| 优先级 | 方式 | 说明 |
|--------|------|------|
| 1 | 用户自有素材 | 用户已提供的图片或视频 |
| 2 | AI 生成 | 根据场景描述生成统一风格图片 |
| 3 | 可商用图库 | 从 Unsplash、Pexels、Pixabay 等免费可商用图库搜索 |

- AI 生成素材时，根据场景标题和对白构造 prompt，并在 prompt 中约定一致色调、构图和风格。
- 图库搜索时，从场景标题和关键词提取搜索词，下载后保存到 `<outputDir>/assets/` 并按场景编号命名。
- 向用户展示每个场景的素材方案和来源，等待确认后再渲染。

### Step 4. 配音

配音由渲染管道自动完成：

1. 用 macOS `say` 逐场景生成旁白 `.aiff`。
2. 用 `ffprobe` 读取每段语音真实时长。
3. 若真实语音时长大于脚本计划时长，以语音为准。
4. 补齐音频到场景时长并输出 `.m4a`。
5. 生成 `timeline.json` 和 `subtitles.srt`。

### Step 5. 剪辑

剪辑由渲染管道自动完成：

1. 检查 `say`、`ffmpeg`、`ffprobe`，缺失时报错提示安装。
2. 逐场景渲染视频片段，使用素材背景、标题和旁白文字叠加。
3. 合并所有片段为 1080 x 1920 竖屏 `final.mp4`。

执行命令：

```bash
# 无外部素材目录时，使用脚本和已准备的输出目录素材
node .shared-skills/skills/video-generation/scripts/generate_video.js "主题关键词" \
  --script <outputDir>/script.json

# 有素材目录时
node .shared-skills/skills/video-generation/scripts/generate_video.js "主题关键词" \
  --script <outputDir>/script.json \
  --assets <素材目录>
```

验证产物：

| 文件 | 说明 |
|------|------|
| `final.mp4` | 最终视频 |
| `subtitles.srt` | 同步字幕 |
| `script.json` | 使用的脚本 |
| `timeline.json` | 时间轴，含真实时长修正 |
| `summary.json` | 生成摘要 |
| `audio/` | 各场景语音文件 |
| `clips/` | 各场景视频片段 |

- 渲染完成后读取 `summary.json`，向用户报告视频路径、总时长和场景数。
- 如渲染失败，明确指出失败阶段和缺失依赖或输入。
- 请用户查看 `final.mp4`；如需调整，对白问题回到 Step 2，素材问题回到 Step 3，配音语速或语音问题加 `--voice` 或 `--rate` 重跑。

### Step 6. 发布

- 根据脚本和目标平台生成标题、话题标签、简介文案。
- 建议封面场景或指出 `clips/` 中适合做封面的时间点。
- 提供发布检查清单：视频、标题、话题、字幕、封面、发布时间。

### Step 7. 数据复盘

- 当用户反馈数据时，收集播放量、完播率、点赞数、评论数、转发数。
- 分析开场钩子、互动场景和时长是否有效。
- 写入 `<outputDir>/review.md`，包含数据快照、做得好的点和下次改进建议。
- 基于复盘给出下一条视频选题建议。

## 输入

- 主题关键词、目标平台、目标时长、语气、素材目录和输出目录。
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

## 工具与权限

- `node .shared-skills/skills/video-generation/scripts/generate_video.js`。
- macOS `say`、`ffmpeg`、`ffprobe`。
- 图像生成或图库检索能力，仅在用户确认素材方案后用于补素材。

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--script <file>` | 外部脚本 JSON，跳过内置模板 | 无 |
| `--out <dir>` | 输出根目录 | `output/video-generation` |
| `--assets <dir>` | 场景素材目录 | 无 |
| `--voice <name>` | macOS say 语音 | `Tingting` |
| `--rate <number>` | 语速 | `185` |
| `--width <px>` | 视频宽度 | `1080` |
| `--height <px>` | 视频高度 | `1920` |
| `--templates <file>` | 自定义模板 JSON，仅快速模式 | 内置模板 |
| `--target-duration <sec>` | 目标总时长，仅快速模式 | `105` |
| `--max-scenes <num>` | 限制场景数 | 全部 |
| `--duration-scale <num>` | 时长缩放，烟测用 | `1` |

## 示例

快速模式可直接运行 CLI 使用内置模板一键生成：

```bash
node .shared-skills/skills/video-generation/scripts/generate_video.js "主题关键词"
```

## 自检

- [ ] 主题关键词和输出目录已让用户确认。
- [ ] 脚本已由用户确认后才进入素材阶段。
- [ ] 每个场景都有实际素材来源，未使用纯色卡片兜底。
- [ ] 渲染前已确认脚本和素材都已就绪。
- [ ] `final.mp4`、`subtitles.srt`、`timeline.json`、`summary.json` 已生成并汇报。
- [ ] 使用网络素材时已确认免费可商用授权。
