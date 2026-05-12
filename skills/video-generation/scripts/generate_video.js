#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { DEFAULTS, PALETTES, FONT_CANDIDATES } = require('./config');
const { loadTemplates, pickVariant, applyTopic, allocateDurations } = require('./scene_templates');

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

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

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

function buildTimeline(scenes, audioDurations = []) {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const audioDuration = Number(audioDurations[index] || 0);
    const duration = roundMs(Math.max(Number(scene.duration), audioDuration));
    const start = roundMs(cursor);
    const end = roundMs(start + duration);
    cursor = end;
    return {
      ...scene,
      start,
      end,
      duration,
    };
  });
}

function formatSrtTime(seconds) {
  const totalMs = Math.max(0, Math.round(Number(seconds) * 1000));
  const h = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const m = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  const ms = String(totalMs % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

function writeSrt(timeline, outputFile) {
  const body = timeline.map((scene, index) => {
    return `${index + 1}\n${formatSrtTime(scene.start)} --> ${formatSrtTime(scene.end)}\n${scene.dialogue}\n`;
  }).join('\n') + '\n';
  fs.writeFileSync(outputFile, body, 'utf8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function commandExists(command) {
  const paths = String(process.env.PATH || '').split(path.delimiter);
  return paths.some((dir) => {
    const fullPath = path.join(dir, command);
    try {
      fs.accessSync(fullPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function requireCommands(commands) {
  const missing = commands.filter((command) => !commandExists(command));
  if (missing.length > 0) {
    throw new Error(`Missing required command(s): ${missing.join(', ')}`);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (!options.quiet) process.stderr.write(chunk);
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} exited with ${code}\n${stderr}`));
      }
    });
  });
}

async function probeDuration(file) {
  const result = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { quiet: true });
  const duration = Number.parseFloat(result.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Unable to read duration for ${file}`);
  }
  return roundMs(duration);
}

function findFont() {
  return FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || null;
}

function findSceneAsset(assetDir, sceneNumber) {
  if (!assetDir || !fs.existsSync(assetDir)) return null;
  const padded = String(sceneNumber).padStart(2, '0');
  const names = [
    `scene_${padded}`,
    `scene-${padded}`,
    `${padded}`,
    `scene_${sceneNumber}`,
    `scene-${sceneNumber}`,
  ];
  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
  for (const name of names) {
    for (const extension of extensions) {
      const file = path.join(assetDir, `${name}${extension}`);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

function splitText(text, maxChars = 18, maxLines = 5) {
  const chars = Array.from(String(text));
  const lines = [];
  let line = '';
  for (const char of chars) {
    line += char;
    if (line.length >= maxChars || /[，。！？；]/.test(char)) {
      lines.push(line.trim());
      line = '';
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, maxLines).join('\n');
}

function escapeFilterValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function writeSceneTextFiles(scene, textDir) {
  ensureDir(textDir);
  const titleFile = path.join(textDir, `scene_${String(scene.scene).padStart(2, '0')}_title.txt`);
  const bodyFile = path.join(textDir, `scene_${String(scene.scene).padStart(2, '0')}_body.txt`);
  const tagFile = path.join(textDir, `scene_${String(scene.scene).padStart(2, '0')}_tag.txt`);
  fs.writeFileSync(titleFile, `${scene.title}\n${scene.description}`, 'utf8');
  fs.writeFileSync(bodyFile, splitText(scene.dialogue), 'utf8');
  fs.writeFileSync(tagFile, `第 ${scene.scene} 幕`, 'utf8');
  return { titleFile, bodyFile, tagFile };
}

function buildSceneFilter(scene, options) {
  const fontFile = options.fontFile;
  const width = options.width || DEFAULTS.width;
  const height = options.height || DEFAULTS.height;
  const text = writeSceneTextFiles(scene, options.textDir);
  const titleSize = Math.round(height * 0.035);
  const bodySize = Math.round(height * 0.033);
  const tagSize = Math.round(height * 0.026);

  const filters = [
    `drawbox=x=0:y=0:w=iw:h=ih:color=${scene.palette.accent}@0.12:t=fill`,
    `drawbox=x=70:y=110:w=${width - 140}:h=${Math.round(height * 0.25)}:color=black@0.24:t=fill`,
    `drawbox=x=70:y=${Math.round(height * 0.55)}:w=${width - 140}:h=${Math.round(height * 0.27)}:color=black@0.34:t=fill`,
    `drawtext=fontfile=${escapeFilterValue(fontFile)}:textfile=${escapeFilterValue(text.tagFile)}:fontcolor=${scene.palette.accent}:fontsize=${tagSize}:x=86:y=70`,
    `drawtext=fontfile=${escapeFilterValue(fontFile)}:textfile=${escapeFilterValue(text.titleFile)}:fontcolor=white:fontsize=${titleSize}:line_spacing=18:x=92:y=150`,
    `drawtext=fontfile=${escapeFilterValue(fontFile)}:textfile=${escapeFilterValue(text.bodyFile)}:fontcolor=white:fontsize=${bodySize}:line_spacing=20:x=(w-text_w)/2:y=${Math.round(height * 0.60)}`,
  ];

  if (options.assetFile) {
    return [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      'eq=brightness=-0.08:saturation=1.1',
      ...filters,
    ].join(',');
  }
  return filters.join(',');
}

async function generateNarration(scene, outputFile, options) {
  await run('say', [
    '-v', options.voice || DEFAULTS.voice,
    '-r', String(options.rate || DEFAULTS.rate),
    '-o', outputFile,
    scene.dialogue,
  ], { quiet: true });
}

async function padAudio(inputFile, outputFile, duration) {
  await run('ffmpeg', [
    '-y',
    '-i', inputFile,
    '-af', 'apad',
    '-t', String(duration),
    '-ac', '2',
    '-ar', '44100',
    '-c:a', 'aac',
    outputFile,
  ], { quiet: true });
}

async function renderSceneClip(scene, audioFile, outputFile, options) {
  const width = options.width || DEFAULTS.width;
  const height = options.height || DEFAULTS.height;
  const fps = options.fps || DEFAULTS.fps;
  const filter = buildSceneFilter(scene, options);

  const args = ['-y'];
  if (options.assetFile) {
    args.push('-loop', '1', '-framerate', String(fps), '-t', String(scene.duration), '-i', options.assetFile);
  } else {
    args.push('-f', 'lavfi', '-i', `color=c=${scene.palette.bg}:s=${width}x${height}:r=${fps}:d=${scene.duration}`);
  }
  args.push(
    '-i', audioFile,
    '-vf', filter,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', String(scene.duration),
    '-r', String(fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputFile,
  );
  await run('ffmpeg', args, { quiet: true });
}

function concatListLine(file) {
  return `file '${String(file).replace(/'/g, "'\\''")}'`;
}

async function concatClips(clipFiles, listFile, outputFile) {
  fs.writeFileSync(listFile, `${clipFiles.map(concatListLine).join('\n')}\n`, 'utf8');
  await run('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    outputFile,
  ], { quiet: true });
}

async function generateVideo(options) {
  const keyword = normalizeKeyword(options.keyword);
  requireCommands(['say', 'ffmpeg', 'ffprobe']);
  const fontFile = options.fontFile || findFont();
  if (!fontFile) {
    throw new Error('Missing CJK-capable font. Expected PingFang, STHeiti, Hiragino Sans GB, or Arial Unicode.');
  }

  const outputRoot = path.resolve(options.outputRoot || path.join(process.cwd(), 'output', 'video-generation'));
  const projectDir = path.join(outputRoot, createSlug(keyword));
  const audioDir = path.join(projectDir, 'audio');
  const clipDir = path.join(projectDir, 'clips');
  const textDir = path.join(projectDir, 'text');
  ensureDir(audioDir);
  ensureDir(clipDir);
  ensureDir(textDir);

  const scenes = options.scriptFile
    ? loadExternalScript(options.scriptFile)
    : buildVideoScript(keyword, {
        durationScale: options.durationScale || 1,
        maxScenes: options.maxScenes,
        templates: options.templates,
        targetTotalDuration: options.targetTotalDuration,
      });
  fs.writeFileSync(path.join(projectDir, 'script.json'), JSON.stringify(scenes, null, 2), 'utf8');

  const rawAudioFiles = [];
  const audioDurations = [];
  for (const scene of scenes) {
    const padded = String(scene.scene).padStart(2, '0');
    const rawAudio = path.join(audioDir, `scene_${padded}.aiff`);
    await generateNarration(scene, rawAudio, options);
    rawAudioFiles.push(rawAudio);
    audioDurations.push(await probeDuration(rawAudio));
  }

  const timeline = buildTimeline(scenes, audioDurations);
  fs.writeFileSync(path.join(projectDir, 'timeline.json'), JSON.stringify(timeline, null, 2), 'utf8');
  writeSrt(timeline, path.join(projectDir, 'subtitles.srt'));

  const clipFiles = [];
  for (const scene of timeline) {
    const padded = String(scene.scene).padStart(2, '0');
    const paddedAudio = path.join(audioDir, `scene_${padded}.m4a`);
    const clipFile = path.join(clipDir, `scene_${padded}.mp4`);
    await padAudio(rawAudioFiles[scene.scene - 1], paddedAudio, scene.duration);
    const assetFile = findSceneAsset(options.assetsDir, scene.scene);
    await renderSceneClip(scene, paddedAudio, clipFile, {
      width: options.width || DEFAULTS.width,
      height: options.height || DEFAULTS.height,
      fps: options.fps || DEFAULTS.fps,
      fontFile,
      textDir,
      assetFile,
    });
    clipFiles.push(clipFile);
  }

  const finalFile = path.join(projectDir, 'final.mp4');
  await concatClips(clipFiles, path.join(projectDir, 'clips.txt'), finalFile);

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
  --voice <name>           macOS say voice, default: ${DEFAULTS.voice}
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
