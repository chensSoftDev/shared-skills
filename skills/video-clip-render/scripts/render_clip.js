#!/usr/bin/env node

/**
 * video-clip-render — 视频片段渲染脚本
 *
 * 将素材（图片或视频）、音频和场景元数据合成为单个视频片段。
 * 素材来源由 video-asset skill 负责，本脚本只负责合成渲染。
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 30,
};

const FONT_CANDIDATES = [
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  '/Library/Fonts/Arial Unicode.ttf',
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (!options.quiet) process.stderr.write(chunk);
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code}\n${stderr}`));
    });
  });
}

function commandExists(command) {
  const paths = String(process.env.PATH || '').split(path.delimiter);
  return paths.some((dir) => {
    try {
      fs.accessSync(path.join(dir, command), fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function requireCommands(commands) {
  const missing = commands.filter((cmd) => !commandExists(cmd));
  if (missing.length > 0) {
    throw new Error(`Missing required command(s): ${missing.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Text & filter helpers
// ---------------------------------------------------------------------------

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
  const padded = String(scene.scene).padStart(2, '0');
  const titleFile = path.join(textDir, `scene_${padded}_title.txt`);
  const bodyFile = path.join(textDir, `scene_${padded}_body.txt`);
  const tagFile = path.join(textDir, `scene_${padded}_tag.txt`);
  fs.writeFileSync(titleFile, `${scene.title}\n${scene.description}`, 'utf8');
  fs.writeFileSync(bodyFile, splitText(scene.dialogue), 'utf8');
  fs.writeFileSync(tagFile, `第 ${scene.scene} 幕`, 'utf8');
  return { titleFile, bodyFile, tagFile };
}

function findFont() {
  return FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || null;
}

function findSceneAsset(assetDir, sceneNumber) {
  if (!assetDir || !fs.existsSync(assetDir)) return null;
  const padded = String(sceneNumber).padStart(2, '0');
  const names = [
    `scene_${padded}`, `scene-${padded}`, `${padded}`,
    `scene_${sceneNumber}`, `scene-${sceneNumber}`,
  ];
  const extensions = ['.png', '.jpg', '.jpeg', '.webp', '.mp4'];
  for (const name of names) {
    for (const ext of extensions) {
      const file = path.join(assetDir, `${name}${ext}`);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider: ffmpeg-local
// ---------------------------------------------------------------------------

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

function isVideoAsset(filePath) {
  return filePath && /\.mp4$/i.test(filePath);
}

async function renderSceneFfmpeg(scene, audioFile, outputFile, options) {
  const width = options.width || DEFAULTS.width;
  const height = options.height || DEFAULTS.height;
  const fps = options.fps || DEFAULTS.fps;

  // Video asset path: use video file directly (no text overlay, merge audio)
  if (isVideoAsset(options.assetFile)) {
    await run('ffmpeg', [
      '-y',
      '-i', options.assetFile,
      '-i', audioFile,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-t', String(scene.duration),
      '-r', String(fps),
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputFile,
    ], { quiet: true });
    return;
  }

  // Image asset or color background path: static image + text overlay
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

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDERS = {
  'ffmpeg-local': renderSceneFfmpeg,
};

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

async function renderSceneClip(scene, audioFile, outputFile, options = {}) {
  const provider = options.renderProvider || 'ffmpeg-local';
  const fn = PROVIDERS[provider];
  if (!fn) {
    throw new Error(`Unknown render provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  if (provider === 'ffmpeg-local') {
    requireCommands(['ffmpeg']);
    if (!options.fontFile) {
      const font = findFont();
      if (!font) throw new Error('Missing CJK-capable font. Expected PingFang, STHeiti, Hiragino Sans GB, or Arial Unicode.');
      options.fontFile = font;
    }
  }
  await fn(scene, audioFile, outputFile, options);
}

/**
 * 批量渲染所有场景。
 * timeline 是带有 start/end/duration 的场景数组。
 */
async function renderAllClips(timeline, options = {}) {
  const audioDir = options.audioDir;
  const clipDir = options.clipDir;
  const assetsDir = options.assetsDir;
  ensureDir(clipDir);

  const textDir = options.textDir || path.join(clipDir, '..', 'text');
  ensureDir(textDir);

  const clipFiles = [];
  for (const scene of timeline) {
    const padded = String(scene.scene).padStart(2, '0');
    const audioFile = path.join(audioDir, `scene_${padded}.m4a`);
    const clipFile = path.join(clipDir, `scene_${padded}.mp4`);
    const assetFile = findSceneAsset(assetsDir, scene.scene);

    await renderSceneClip(scene, audioFile, clipFile, {
      ...options,
      textDir,
      assetFile,
    });
    clipFiles.push(clipFile);
    console.error(`  rendered scene ${scene.scene}/${timeline.length}`);
  }
  return clipFiles;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--timeline') options.timelineFile = argv[++i];
    else if (arg === '--audio-dir') options.audioDir = argv[++i];
    else if (arg === '--clip-dir') options.clipDir = argv[++i];
    else if (arg === '--assets') options.assetsDir = argv[++i];
    else if (arg === '--provider') options.renderProvider = argv[++i];
    else if (arg === '--width') options.width = Number(argv[++i]);
    else if (arg === '--height') options.height = Number(argv[++i]);
    else if (arg === '--fps') options.fps = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/render_clip.js --timeline <timeline.json> --audio-dir <dir> --clip-dir <dir>

Options:
  --timeline <file>     Timeline JSON file path (required)
  --audio-dir <dir>     Audio files directory (required)
  --clip-dir <dir>      Clip output directory (required)
  --assets <dir>        Scene assets directory (optional)
  --provider <name>     Render provider: ffmpeg-local (default)
  --width <px>          Video width, default: ${DEFAULTS.width}
  --height <px>         Video height, default: ${DEFAULTS.height}
  --fps <number>        Frame rate, default: ${DEFAULTS.fps}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.timelineFile || !options.audioDir || !options.clipDir) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const timeline = JSON.parse(fs.readFileSync(options.timelineFile, 'utf8'));
  const clipFiles = await renderAllClips(timeline, options);
  console.log(JSON.stringify({ clips: clipFiles.map((f) => path.basename(f)) }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildSceneFilter,
  escapeFilterValue,
  findFont,
  findSceneAsset,
  isVideoAsset,
  renderAllClips,
  renderSceneClip,
  splitText,
  writeSceneTextFiles,
  DEFAULTS,
  FONT_CANDIDATES,
  PROVIDERS,
};
