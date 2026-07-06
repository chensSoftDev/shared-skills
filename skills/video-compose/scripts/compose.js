#!/usr/bin/env node

/**
 * video-compose — 视频合成脚本
 *
 * 将多个场景片段拼接为最终视频，生成字幕和时间轴文件。
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

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
// Timeline
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Subtitles
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Concat
// ---------------------------------------------------------------------------

function concatListLine(file) {
  return `file '${String(file).replace(/'/g, "'\\''")}'`;
}

async function concatClips(clipFiles, listFile, outputFile) {
  requireCommands(['ffmpeg']);
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

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function writeSummary(options) {
  const summary = {
    keyword: options.keyword || '',
    outputDir: options.outputDir,
    finalFile: options.finalFile,
    subtitlesFile: options.subtitlesFile,
    scriptFile: options.scriptFile,
    totalDuration: options.totalDuration,
    scenes: options.sceneCount,
  };
  fs.writeFileSync(path.join(options.outputDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

// ---------------------------------------------------------------------------
// Compose pipeline
// ---------------------------------------------------------------------------

async function compose(options) {
  const outputDir = options.outputDir;
  const clipDir = options.clipDir;
  ensureDir(outputDir);

  // Load script
  const scenes = JSON.parse(fs.readFileSync(options.scriptFile, 'utf8'));
  const audioDurations = options.durations || [];

  // Build timeline
  const timeline = buildTimeline(scenes, audioDurations);
  const timelineFile = path.join(outputDir, 'timeline.json');
  fs.writeFileSync(timelineFile, JSON.stringify(timeline, null, 2), 'utf8');

  // Write subtitles
  const subtitlesFile = path.join(outputDir, 'subtitles.srt');
  writeSrt(timeline, subtitlesFile);

  // Collect clip files
  const clipFiles = timeline.map((scene) => {
    const padded = String(scene.scene).padStart(2, '0');
    return path.join(clipDir, `scene_${padded}.mp4`);
  });

  // Verify all clips exist
  for (const clip of clipFiles) {
    if (!fs.existsSync(clip)) {
      throw new Error(`Missing clip file: ${clip}`);
    }
  }

  // Concat
  const finalFile = path.join(outputDir, 'final.mp4');
  const listFile = path.join(outputDir, 'clips.txt');
  await concatClips(clipFiles, listFile, finalFile);

  // Summary
  const summary = writeSummary({
    keyword: options.keyword,
    outputDir,
    finalFile,
    subtitlesFile,
    scriptFile: options.scriptFile,
    totalDuration: roundMs(timeline[timeline.length - 1].end),
    sceneCount: timeline.length,
  });

  return summary;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--script') options.scriptFile = argv[++i];
    else if (arg === '--clip-dir') options.clipDir = argv[++i];
    else if (arg === '--output-dir') options.outputDir = argv[++i];
    else if (arg === '--durations') options.durations = argv[++i].split(',').map(Number);
    else if (arg === '--keyword') options.keyword = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/compose.js --script <script.json> --clip-dir <dir> --output-dir <dir>

Options:
  --script <file>       Script JSON file path (required)
  --clip-dir <dir>      Clip files directory (required)
  --output-dir <dir>    Output directory (required)
  --durations <csv>     Real audio durations, comma-separated (optional)
  --keyword <text>      Video topic keyword for summary (optional)`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.scriptFile || !options.clipDir || !options.outputDir) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const summary = await compose(options);
  console.log(`视频已合成: ${summary.finalFile}`);
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
  compose,
  concatClips,
  formatSrtTime,
  roundMs,
  writeSrt,
  writeSummary,
};
