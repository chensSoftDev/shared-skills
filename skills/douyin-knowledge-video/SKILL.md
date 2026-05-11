---
name: douyin-knowledge-video
description: Use when the user asks to generate a Douyin/TikTok-style knowledge video from a single topic keyword and expects a local MP4 output.
---

# 抖音知识视频

从单个主题关键词一键生成竖屏知识短视频。默认本地执行，不依赖 npm 包或在线 API。

## 一键生成

在项目根目录运行：

```bash
node .shared-skills/skills/douyin-knowledge-video/scripts/generate_video.js "为什么人赚不到钱"
```

在本仓库内调试时运行：

```bash
node skills/douyin-knowledge-video/scripts/generate_video.js "为什么人赚不到钱"
```

## 输出
- `output/douyin-knowledge-video/<主题>/final.mp4`
- `script.json`：7 场景脚本，默认 90-120 秒
- `timeline.json`：按真实语音时长修正后的时间轴
- `subtitles.srt`：同步字幕
- `audio/`：每段旁白和补齐后的音频
- `clips/`：每个场景的中间视频

## 依赖

- macOS `say`：生成中文旁白，默认使用 `Tingting`
- `ffmpeg`：渲染场景并合成 MP4
- `ffprobe`：读取真实音频/视频时长
- 支持中文的系统字体，例如 PingFang、STHeiti、Hiragino Sans GB 或 Arial Unicode

脚本启动时会检查依赖，缺失时直接报错。

## 可选素材

默认会生成安全的动画风格背景卡片，不需要素材也能出片。

如果有自有、授权或可商用素材，可放入目录并按场景命名：

```text
assets/douyin-knowledge-video/
├── scene_01.png
├── scene_02.png
└── scene_03.png
```

运行时传入：

```bash
node .shared-skills/skills/douyin-knowledge-video/scripts/generate_video.js "主题" --assets assets/douyin-knowledge-video
```

## 常用参数

```bash
node .shared-skills/skills/douyin-knowledge-video/scripts/generate_video.js "主题" \
  --out output/douyin-knowledge-video \
  --voice Tingting \
  --rate 185 \
  --assets assets/douyin-knowledge-video
```

调试烟测可缩短输出：

```bash
node skills/douyin-knowledge-video/scripts/generate_video.js "测试主题" --max-scenes 1 --duration-scale 0.1
```

## 辅助脚本

- `scripts/generate_video.js`：主入口，一键生成 MP4
- `scripts/generate_script.js`：仅生成脚本 JSON
- `scripts/subtitle_sync.js`：根据脚本和时间轴生成 SRT
- `scripts/tts_generator.js`：仅根据脚本生成本地 `say` 旁白
- `scripts/video_composer.js`：兼容入口，转调 `generate_video.js`
- `references/animation_templates.md`：素材模板示例
- `references/style_examples.md`：幽默风格示例

## 注意事项
- 不复制受保护角色、具体 IP 形象或未授权截图；用户指定素材时确认其自有、授权或可合法使用。
- 默认生成 7 个场景，总时长约 90-120 秒；若真实语音超过计划时长，以真实语音时长为准。
- 最终字幕按 `ffprobe` 读取到的真实音频时长生成，不用脚本估算时间戳。
