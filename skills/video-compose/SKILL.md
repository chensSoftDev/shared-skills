---
name: video-compose
description: 视频合成：将多个视频片段拼接为最终视频并生成字幕文件。在需要合并场景片段为完整视频时使用。
---

# 视频合成

## 角色

将多个场景视频片段按时间轴顺序拼接为最终视频 `final.mp4`，同时生成同步字幕文件 `subtitles.srt` 和时间轴 `timeline.json`。

## 约束

### 合成规格

- 使用 ffmpeg concat demuxer 无损拼接同规格片段。
- 所有片段必须具有相同的分辨率、帧率和编码格式。
- 字幕时间戳基于各片段的真实时长计算，不依赖计划时长。

### Timeline 构建

- 以 `script.json` 的场景时长为基础。
- 当实际音频时长超过计划时长时，以音频时长为准。
- 时间精度保留到毫秒（3 位小数）。

## 上下文

### 资源文件

- `scripts/compose.js`：主脚本，包含 timeline 构建、字幕生成和片段拼接逻辑。

### 依赖

- `ffmpeg`：视频拼接。

## 工作流

### 1. 构建 Timeline

- 读取 `script.json` 场景列表和音频时长数组。
- 计算每个场景的 start、end 和实际 duration。
- 输出 `timeline.json`。

### 2. 生成字幕

- 根据 timeline 为每个场景生成 SRT 条目。
- 时间格式：`HH:MM:SS,mmm`。
- 输出 `subtitles.srt`。

### 3. 拼接片段

- 生成 ffmpeg concat 列表文件。
- 使用 `ffmpeg -f concat` 拼接所有片段。
- 输出 `final.mp4`。

### 4. 输出摘要

- 生成 `summary.json`：关键词、输出目录、最终文件路径、总时长、场景数。

执行命令：

```bash
node .shared-skills/skills/video-compose/scripts/compose.js \
  --script <outputDir>/script.json \
  --clip-dir <outputDir>/clips \
  --output-dir <outputDir> \
  --durations '12.3,14.5,11.2,...'
```

## 输入

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--script <file>` | 脚本 JSON 文件路径 | 必填 |
| `--clip-dir <dir>` | 片段文件目录 | 必填 |
| `--output-dir <dir>` | 输出目录 | 必填 |
| `--durations <csv>` | 各场景真实音频时长（逗号分隔） | 可选 |
| `--keyword <text>` | 视频主题关键词（用于摘要） | 可选 |

## 输出

- `<outputDir>/timeline.json`：时间轴文件。
- `<outputDir>/subtitles.srt`：同步字幕文件。
- `<outputDir>/final.mp4`：最终合成视频。
- `<outputDir>/summary.json`：生成摘要。

## 自检

- [ ] `timeline.json` 中每个场景的 start/end 连续无间隔。
- [ ] `subtitles.srt` 条目数与场景数一致。
- [ ] `final.mp4` 可正常播放，总时长与 timeline 末尾 end 一致。
- [ ] `summary.json` 包含完整的文件路径信息。
