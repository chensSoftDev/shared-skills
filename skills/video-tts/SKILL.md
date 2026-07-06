---
name: video-tts
description: 文本转语音(TTS)：将视频脚本对白转为语音文件。在需要为视频场景生成配音、语音合成时使用。
---

# 视频配音（TTS）

## 角色

将视频脚本的逐场景对白文本转换为语音文件，输出标准化的音频文件和时长信息，供后续剪辑环节消费。支持多 provider 切换，默认使用 macOS `say`，可扩展为云端 TTS API。

## 约束

### Provider 体系

通过 `--provider` 参数或配置选择 TTS 引擎，每个 provider 遵循统一的输入输出契约。

| Provider | 说明 | 依赖 | 成本 |
|----------|------|------|------|
| `macos-say` | macOS 系统 TTS，默认 | macOS + `say` 命令 | 免费 |
| `doubao-tts` | 豆包（火山引擎）TTS API | 网络 + API Key | 按量付费 |

新增 provider 时，在 `scripts/tts.js` 的 `PROVIDERS` 对象中注册即可。

### 音频规格

- 输出格式：原始 `.aiff`（macOS say）或 `.mp3`（API），统一转为 `.m4a`（AAC, 44100Hz, 双声道）。
- 音频时长以 `ffprobe` 实测为准，不依赖 TTS 引擎返回值。
- 当场景计划时长短于实际语音时长时，以语音为准。
- 音频补齐（pad）到场景最终时长。

### API 安全

- API Key 只从环境变量读取（`DOUBAO_API_KEY`），不硬编码、不写入配置文件。
- 调用失败时输出清晰错误信息，不吞异常。

## 上下文

### 资源文件

- `scripts/tts.js`：主脚本，包含多 provider 的 TTS 生成、音频探测和补齐逻辑。

### 依赖

- `ffmpeg` 和 `ffprobe`：音频格式转换和时长探测。
- macOS `say`（仅 `macos-say` provider）。
- 网络访问（仅 API 类 provider）。

## 工作流

### 1. 选择 Provider

- 默认使用 `macos-say`。
- 用户指定 `--provider doubao-tts` 时切换为豆包 TTS。
- 检查对应 provider 的前置依赖（命令或环境变量）。

### 2. 逐场景生成语音

对 `script.json` 中的每个场景：

1. 读取 `dialogue` 文本。
2. 调用选定 provider 生成原始音频文件 `audio/scene_XX.aiff`。
3. 用 `ffprobe` 读取真实时长。
4. 将原始音频补齐到场景时长，输出 `audio/scene_XX.m4a`。

### 3. 输出结果

- `audio/scene_XX.aiff`：原始语音。
- `audio/scene_XX.m4a`：补齐后的标准音频。
- 返回每个场景的真实音频时长数组，供 timeline 构建使用。

执行命令：

```bash
node .shared-skills/skills/video-tts/scripts/tts.js \
  --script <outputDir>/script.json \
  --audio-dir <outputDir>/audio

# 使用豆包 TTS
DOUBAO_API_KEY=xxx node .shared-skills/skills/video-tts/scripts/tts.js \
  --script <outputDir>/script.json \
  --audio-dir <outputDir>/audio \
  --provider doubao-tts
```

## 输入

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--script <file>` | 脚本 JSON 文件路径 | 必填 |
| `--audio-dir <dir>` | 音频输出目录 | 必填 |
| `--provider <name>` | TTS 引擎 | `macos-say` |
| `--voice <name>` | 语音角色 | `Tingting` |
| `--rate <number>` | 语速 | `185` |

## 输出

- `<audioDir>/scene_XX.aiff`：原始语音文件。
- `<audioDir>/scene_XX.m4a`：补齐后的标准音频文件。
- stdout JSON：`{ "durations": [12.3, 14.5, ...], "files": ["scene_01.m4a", ...] }`。

## 自检

- [ ] 每个场景都生成了对应音频文件。
- [ ] 音频时长已用 `ffprobe` 实测，非估算值。
- [ ] API Key 未出现在代码或日志中。
- [ ] 失败场景有明确错误信息。
