---
name: video-clip-render
description: 视频片段渲染：将素材、音频和场景元数据合成为单个视频片段。在需要渲染视频场景片段时使用。
---

# 视频片段渲染

## 角色

将单个场景的素材（图片或视频）、音频和元数据合成为一段视频片段 `.mp4`。素材来源由 `video-asset` skill 负责，本 skill 只负责合成渲染。

## 约束

### 渲染引擎

使用本地 ffmpeg 合成，根据素材类型自动选择渲染模式：

| 素材类型 | 渲染模式 | 说明 |
|----------|----------|------|
| 视频（`.mp4`） | 视频 + 音频合并 | 缩放裁剪到目标分辨率，合入音频轨 |
| 图片 | 静态图 + 文字叠加 + 音频 | 缩放裁剪 + 半透明文字区 + 标题/正文/标签 |
| 无素材 | 纯色背景 + 文字叠加 + 音频 | 使用调色板背景色 |

### 渲染规格

- 默认输出：1080x1920 竖屏，30fps，H.264 + AAC。
- 每个片段时长以对应场景的 timeline duration 为准。
- 需要系统安装中文字体（PingFang、STHeiti 等），仅图片/纯色模式使用。

### API 安全

- API Key 只从环境变量读取，不硬编码。

## 上下文

### 资源文件

- `scripts/render_clip.js`：主脚本，包含 ffmpeg 合成渲染逻辑。

### 依赖

- `ffmpeg`：视频合成。
- 中文字体文件（仅图片/纯色模式）。

## 工作流

### 1. 检查前置条件

- 检查 `ffmpeg` 命令可用。
- 检查中文字体可用（图片/纯色模式需要）。

### 2. 渲染单个场景

根据素材类型自动选择渲染模式：

**视频素材（`.mp4`）：**

1. 将视频素材缩放裁剪到目标分辨率。
2. 合入音频轨，截取到场景时长。
3. 输出 `clips/scene_XX.mp4`。

**图片素材或无素材：**

1. 查找场景素材文件（图片）；无素材时使用调色板纯色背景。
2. 构建 ffmpeg filter：缩放裁剪 + 半透明文字区 + 标题/正文/标签叠加。
3. 合成音频轨和视频轨，输出 `clips/scene_XX.mp4`。

### 3. 批量渲染

- 按场景顺序逐个渲染，输出到 `clips/` 目录。
- 每个场景渲染完成后输出进度信息。

执行命令：

```bash
node .shared-skills/skills/video-clip-render/scripts/render_clip.js \
  --timeline <outputDir>/timeline.json \
  --audio-dir <outputDir>/audio \
  --clip-dir <outputDir>/clips \
  --assets <outputDir>/assets
```

## 输入

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--timeline <file>` | timeline JSON 文件路径 | 必填 |
| `--audio-dir <dir>` | 音频文件目录 | 必填 |
| `--clip-dir <dir>` | 片段输出目录 | 必填 |
| `--assets <dir>` | 素材目录 | 可选 |
| `--provider <name>` | 渲染引擎 | `ffmpeg-local` |
| `--width <px>` | 视频宽度 | `1080` |
| `--height <px>` | 视频高度 | `1920` |
| `--fps <number>` | 帧率 | `30` |

## 输出

- `<clipDir>/scene_XX.mp4`：各场景视频片段。

## 自检

- [ ] 每个场景都生成了对应的视频片段。
- [ ] 片段分辨率和帧率符合配置。
- [ ] 音频轨已正确合入每个片段。
- [ ] API Key 未出现在代码或日志中。
