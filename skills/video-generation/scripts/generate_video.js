#!/usr/bin/env node

/**
 * video-generation 编排器 — 一键生成 CLI
 *
 * 内部调用各子 skill 脚本完成 TTS、渲染、合成。
 * 同时保留快速模式（内置模板直接生成）的向后兼容。
 */

const fs = require('node:fs');
const path = require('node:path');

const { DEFAULTS, PALETTES } = require('./config');
const { loadTemplates, pickVariant, applyTopic, allocateDurations } = require('./scene_templates');

// --- Sub-skill imports (sibling skill directories) ---
const skillsRoot = path.resolve(__dirname, '..', '..');
const { generateSceneAudio, padAudio, probeDuration } = require(path.join(skillsRoot, 'video-tts', 'scripts', 'tts'));
const { renderAllClips, findSceneAsset } = require(path.join(skillsRoot, 'video-clip-render', 'scripts', 'render_clip'));
const { buildTimeline, writeSrt, compose, formatSrtTime, roundMs: composeRoundMs } = require(path.join(skillsRoot, 'video-compose', 'scripts', 'compose'));
const { fillMissingAssets } = require(path.join(skillsRoot, 'video-asset', 'scripts', 'asset'));

// ---------------------------------------------------------------------------
// Utilities (kept for backward compat exports)
// ---------------------------------------------------------------------------

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function normalizeKeyword(keyword) {
  const value = String(keyword || '').trim();
  return value || '一个知识点';
}

function createSlug(value) {
  const slug = normalizeKeyword(value)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'video';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Script generation (quick mode — uses built-in templates)
// ---------------------------------------------------------------------------

function buildVideoScript(keyword, options = {}) {
  const topic = normalizeKeyword(keyword);
  const durationScale = Number(options.durationScale || 1);
  const roles = loadTemplates(options.templates);
  const limit = options.maxScenes ? Math.max(1, Number(options.maxScenes)) : roles.length;
  const activeRoles = roles.slice(0, limit);
  const totalDuration = Number(options.targetTotalDuration || DEFAULTS.targetTotalDuration);
  const durations = allocateDurations(activeRoles, totalDuration);
  const palettes = options.palettes || PALETTES;

  return activeRoles.map((role, index) => {
    const variant = pickVariant(role.variants, options.seed);
    const filled = applyTopic(variant, topic);
    return {
      scene: index + 1,
      title: role.title,
      role: role.role,
      description: filled.description,
      action: filled.action,
      dialogue: filled.dialogue,
      palette: palettes[index % palettes.length],
      duration: roundMs(durations[index] * durationScale),
    };
  });
}

function loadExternalScript(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const scenes = JSON.parse(raw);
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error(`Invalid script file: expected a non-empty array of scenes`);
  }
  return scenes.map((scene, index) => ({
    ...scene,
    scene: scene.scene || index + 1,
    palette: scene.palette || PALETTES[index % PALETTES.length],
    duration: Number(scene.duration) || 15,
  }));
}

// ---------------------------------------------------------------------------
// Orchestrated pipeline
// ---------------------------------------------------------------------------

async function generateVideo(options) {
  const keyword = normalizeKeyword(options.keyword);

  const outputRoot = path.resolve(options.outputRoot || path.join(process.cwd(), 'output', 'video-generation'));
  const projectDir = path.join(outputRoot, createSlug(keyword));
  const audioDir = path.join(projectDir, 'audio');
  const clipDir = path.join(projectDir, 'clips');
  const textDir = path.join(projectDir, 'text');
  const assetsDir = options.assetsDir || path.join(projectDir, 'assets');
  ensureDir(audioDir);
  ensureDir(clipDir);
  ensureDir(textDir);
  ensureDir(assetsDir);

  // --- Step 1: Script ---
  const scenes = options.scriptFile
    ? loadExternalScript(options.scriptFile)
    : buildVideoScript(keyword, {
        durationScale: options.durationScale || 1,
        maxScenes: options.maxScenes,
        templates: options.templates,
        targetTotalDuration: options.targetTotalDuration,
        seed: options.seed,
      });
  fs.writeFileSync(path.join(projectDir, 'script.json'), JSON.stringify(scenes, null, 2), 'utf8');

  // --- Step 2: Assets (via video-asset skill) ---
  if (options.assetProvider) {
    await fillMissingAssets(scenes, assetsDir, {
      assetProvider: options.assetProvider,
    });
  }

  // --- Step 3: TTS (via video-tts skill) ---
  const ttsResult = await generateSceneAudio(scenes, audioDir, {
    ttsProvider: options.ttsProvider || 'macos-say',
    voice: options.voice,
    rate: options.rate,
  });

  // --- Step 4: Build timeline & pad audio (via video-compose skill) ---
  const timeline = buildTimeline(scenes, ttsResult.durations);
  fs.writeFileSync(path.join(projectDir, 'timeline.json'), JSON.stringify(timeline, null, 2), 'utf8');
  writeSrt(timeline, path.join(projectDir, 'subtitles.srt'));

  // Pad audio to timeline durations
  for (const scene of timeline) {
    const padded = String(scene.scene).padStart(2, '0');
    const rawAudio = ttsResult.rawFiles[scene.scene - 1];
    const paddedAudio = path.join(audioDir, `scene_${padded}.m4a`);
    await padAudio(rawAudio, paddedAudio, scene.duration);
  }

  // --- Step 5: Render clips (via video-clip-render skill) ---
  await renderAllClips(timeline, {
    audioDir,
    clipDir,
    assetsDir,
    textDir,
    width: options.width,
    height: options.height,
    fps: options.fps,
  });

  // --- Step 6: Compose final video (via video-compose skill) ---
  const clipFiles = timeline.map((scene) => {
    const padded = String(scene.scene).padStart(2, '0');
    return path.join(clipDir, `scene_${padded}.mp4`);
  });

  const listFile = path.join(projectDir, 'clips.txt');
  const finalFile = path.join(projectDir, 'final.mp4');

  // Use concat directly since timeline and srt are already written
  const { concatClips } = require(path.join(skillsRoot, 'video-compose', 'scripts', 'compose'));
  await concatClips(clipFiles, listFile, finalFile);

  // --- Summary ---
  const summary = {
    keyword,
    outputDir: projectDir,
    finalFile,
    subtitlesFile: path.join(projectDir, 'subtitles.srt'),
    scriptFile: path.join(projectDir, 'script.json'),
    totalDuration: roundMs(timeline[timeline.length - 1].end),
    scenes: timeline.length,
  };
  fs.writeFileSync(path.join(projectDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out' || arg === '--output-root') {
      options.outputRoot = argv[++index];
    } else if (arg === '--assets' || arg === '--assets-dir') {
      options.assetsDir = argv[++index];
    } else if (arg === '--voice') {
      options.voice = argv[++index];
    } else if (arg === '--rate') {
      options.rate = Number(argv[++index]);
    } else if (arg === '--width') {
      options.width = Number(argv[++index]);
    } else if (arg === '--height') {
      options.height = Number(argv[++index]);
    } else if (arg === '--duration-scale') {
      options.durationScale = Number(argv[++index]);
    } else if (arg === '--max-scenes') {
      options.maxScenes = Number(argv[++index]);
    } else if (arg === '--script') {
      options.scriptFile = argv[++index];
    } else if (arg === '--templates') {
      options.templates = argv[++index];
    } else if (arg === '--target-duration') {
      options.targetTotalDuration = Number(argv[++index]);
    } else if (arg === '--tts-provider') {
      options.ttsProvider = argv[++index];
    } else if (arg === '--asset-provider') {
      options.assetProvider = argv[++index];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      positional.push(arg);
    }
  }
  options.keyword = positional.join(' ');
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate_video.js "主题关键词"
  node scripts/generate_video.js "主题关键词" --script <script.json>

Options:
  --script <file>          Use an externally generated script JSON (skips built-in template)
  --out <dir>              Output root directory
  --assets <dir>           Optional directory containing scene_01.png, scene_02.png, ...
  --tts-provider <name>    TTS provider: macos-say (default), doubao-tts
  --asset-provider <name>  Asset provider for missing scenes: ai-video-gen
  --voice <name>           Voice name, default: ${DEFAULTS.voice}
  --rate <number>          Speech rate, default: ${DEFAULTS.rate}
  --width <px>             Video width, default: ${DEFAULTS.width}
  --height <px>            Video height, default: ${DEFAULTS.height}
  --duration-scale <num>   Scale planned scene durations, useful for smoke tests
  --max-scenes <num>       Limit scene count, useful for smoke tests
  --templates <file>       Custom scene templates JSON file (see scene_templates.js)
  --target-duration <sec>  Target total duration in seconds, default: ${DEFAULTS.targetTotalDuration}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.keyword) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const summary = await generateVideo(options);
  console.log(`视频已生成: ${summary.finalFile}`);
  console.log(`字幕文件: ${summary.subtitlesFile}`);
  console.log(`总时长: ${summary.totalDuration}s, 场景数: ${summary.scenes}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildTimeline,
  buildVideoScript,
  createSlug,
  findSceneAsset,
  formatSrtTime,
  generateVideo,
  loadExternalScript,
  parseArgs,
  writeSrt,
};
