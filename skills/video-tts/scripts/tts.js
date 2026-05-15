#!/usr/bin/env node

/**
 * video-tts — 多 provider TTS 脚本
 *
 * 从 script.json 逐场景生成语音，输出标准音频文件和时长信息。
 * 支持 provider 切换：macos-say（默认）、doubao-tts 等。
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
// Provider: macOS say
// ---------------------------------------------------------------------------

async function generateNarrationMacosSay(scene, outputFile, options) {
  if (!commandExists('say')) {
    throw new Error('macOS say command not found. Use a different TTS provider or run on macOS.');
  }
  await run('say', [
    '-v', options.voice || 'Tingting',
    '-r', String(options.rate || 185),
    '-o', outputFile,
    scene.dialogue,
  ], { quiet: true });
}

// ---------------------------------------------------------------------------
// Provider: Doubao TTS (火山引擎)
// ---------------------------------------------------------------------------

async function generateNarrationDoubao(scene, outputFile, options) {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    throw new Error('DOUBAO_API_KEY environment variable is required for doubao-tts provider.');
  }
  const endpoint = options.doubaoEndpoint || 'https://openspeech.bytedance.com/api/v1/tts';
  const voiceType = options.voice || 'zh_female_tianmeixiaoyuan';

  const payload = {
    app: { appid: options.doubaoAppId || 'default', token: 'access_token', cluster: options.doubaoCluster || 'volcano_tts' },
    user: { uid: 'video-tts-skill' },
    audio: { voice_type: voiceType, encoding: 'mp3', speed_ratio: options.rate ? Number(options.rate) / 185 : 1.0 },
    request: { reqid: `scene_${scene.scene}_${Date.now()}`, text: scene.dialogue, operation: 'query' },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer;${apiKey}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Doubao TTS API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.data) {
    throw new Error(`Doubao TTS returned no audio data: ${JSON.stringify(result)}`);
  }

  const audioBuffer = Buffer.from(result.data, 'base64');
  fs.writeFileSync(outputFile, audioBuffer);
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDERS = {
  'macos-say': generateNarrationMacosSay,
  'doubao-tts': generateNarrationDoubao,
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

async function generateNarration(scene, outputFile, options = {}) {
  const provider = options.ttsProvider || 'macos-say';
  const fn = PROVIDERS[provider];
  if (!fn) {
    throw new Error(`Unknown TTS provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  await fn(scene, outputFile, options);
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

/**
 * 为一组场景生成全部语音。
 * 返回 { rawFiles, durations } — 原始音频路径数组和对应时长数组。
 */
async function generateSceneAudio(scenes, audioDir, options = {}) {
  requireCommands(['ffprobe']);
  ensureDir(audioDir);

  const rawFiles = [];
  const durations = [];

  for (const scene of scenes) {
    const padded = String(scene.scene).padStart(2, '0');
    const ext = (options.ttsProvider === 'doubao-tts') ? '.mp3' : '.aiff';
    const rawAudio = path.join(audioDir, `scene_${padded}${ext}`);
    await generateNarration(scene, rawAudio, options);
    rawFiles.push(rawAudio);
    durations.push(await probeDuration(rawAudio));
  }

  return { rawFiles, durations };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--script') options.scriptFile = argv[++i];
    else if (arg === '--audio-dir') options.audioDir = argv[++i];
    else if (arg === '--provider') options.ttsProvider = argv[++i];
    else if (arg === '--voice') options.voice = argv[++i];
    else if (arg === '--rate') options.rate = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/tts.js --script <script.json> --audio-dir <dir>

Options:
  --script <file>       Script JSON file path (required)
  --audio-dir <dir>     Audio output directory (required)
  --provider <name>     TTS provider: macos-say (default), doubao-tts
  --voice <name>        Voice name (provider-specific)
  --rate <number>       Speech rate, default: 185`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.scriptFile || !options.audioDir) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const raw = fs.readFileSync(options.scriptFile, 'utf8');
  const scenes = JSON.parse(raw);

  const result = await generateSceneAudio(scenes, options.audioDir, options);
  const output = {
    durations: result.durations,
    files: result.rawFiles.map((f) => path.basename(f)),
  };
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  generateNarration,
  generateSceneAudio,
  padAudio,
  probeDuration,
  roundMs,
  PROVIDERS,
};
