#!/usr/bin/env node

/**
 * video-asset — 多 provider 素材获取脚本
 *
 * 为视频脚本的每个场景获取视觉素材（图片或视频片段）。
 * 支持 provider 切换：user-provided（默认扫描）、ai-video-gen（豆包等）、stock-photo。
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

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

// ---------------------------------------------------------------------------
// Asset discovery
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4'];
const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

function findSceneAsset(assetDir, sceneNumber) {
  if (!assetDir || !fs.existsSync(assetDir)) return null;
  const padded = String(sceneNumber).padStart(2, '0');
  const names = [
    `scene_${padded}`, `scene-${padded}`, `${padded}`,
    `scene_${sceneNumber}`, `scene-${sceneNumber}`,
  ];
  for (const name of names) {
    for (const ext of ALL_EXTENSIONS) {
      const file = path.join(assetDir, `${name}${ext}`);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

/**
 * 盘点现有素材，返回每个场景的匹配结果。
 */
function inventoryAssets(scenes, assetDir) {
  return scenes.map((scene) => {
    const file = findSceneAsset(assetDir, scene.scene);
    return {
      scene: scene.scene,
      title: scene.title,
      found: !!file,
      file,
      provider: file ? 'user-provided' : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Provider: AI Video Generation (豆包 / 火山引擎)
// ---------------------------------------------------------------------------

async function generateVideoDoubao(scene, outputFile, options = {}) {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    throw new Error('DOUBAO_API_KEY environment variable is required for ai-video-gen provider.');
  }

  const endpoint = options.doubaoVideoEndpoint || 'https://visual.volcengineapi.com/v1/video/generation';

  // Build prompt from scene metadata
  const prompt = [scene.description, scene.action].filter(Boolean).join('。');

  const payload = {
    model: options.doubaoVideoModel || 'doubao-video-gen',
    prompt,
    duration: Math.min(Math.round(scene.duration || 5), 5), // API typically limits to ~5s per clip
  };

  // If a reference image exists (e.g. user provided a partial set), use image-to-video mode
  if (options.referenceImage && fs.existsSync(options.referenceImage)) {
    const imageData = fs.readFileSync(options.referenceImage);
    payload.image = imageData.toString('base64');
  }

  // Submit task
  const submitResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  if (!submitResponse.ok) {
    throw new Error(`Doubao Video API submit error: ${submitResponse.status} ${submitResponse.statusText}`);
  }
  const submitResult = await submitResponse.json();
  const taskId = submitResult.task_id;
  if (!taskId) {
    throw new Error(`Doubao Video API returned no task_id: ${JSON.stringify(submitResult)}`);
  }

  // Poll for completion
  const pollEndpoint = options.doubaoPollEndpoint || `${endpoint}/task`;
  const maxAttempts = 60;
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const pollResponse = await fetch(`${pollEndpoint}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollResponse.ok) continue;
    const pollResult = await pollResponse.json();

    if (pollResult.status === 'completed' && pollResult.video_url) {
      const videoResponse = await fetch(pollResult.video_url);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download generated video: ${videoResponse.status}`);
      }
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      fs.writeFileSync(outputFile, videoBuffer);
      return;
    }
    if (pollResult.status === 'failed') {
      throw new Error(`Doubao Video generation failed for scene ${scene.scene}: ${JSON.stringify(pollResult)}`);
    }
  }
  throw new Error(`Doubao Video generation timed out after ${maxAttempts * pollInterval / 1000}s for scene ${scene.scene}`);
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDERS = {
  'ai-video-gen': generateVideoDoubao,
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * 为缺失素材的场景生成视频素材。
 * 返回更新后的 inventory（每项含 file 和 provider）。
 */
async function fillMissingAssets(scenes, assetDir, options = {}) {
  ensureDir(assetDir);
  const inventory = inventoryAssets(scenes, assetDir);
  const provider = options.assetProvider || 'ai-video-gen';
  const fn = PROVIDERS[provider];

  if (!fn) {
    throw new Error(`Unknown asset provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  for (const item of inventory) {
    if (item.found) continue;

    const scene = scenes.find((s) => s.scene === item.scene);
    const padded = String(item.scene).padStart(2, '0');
    const ext = (provider === 'ai-video-gen') ? '.mp4' : '.png';
    const outputFile = path.join(assetDir, `scene_${padded}${ext}`);

    console.error(`  generating asset for scene ${item.scene}/${scenes.length} via ${provider}...`);
    await fn(scene, outputFile, options);

    item.file = outputFile;
    item.found = true;
    item.provider = provider;
  }

  return inventory;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--script') options.scriptFile = argv[++i];
    else if (arg === '--assets-dir') options.assetsDir = argv[++i];
    else if (arg === '--provider') options.assetProvider = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/asset.js --script <script.json> --assets-dir <dir>

Options:
  --script <file>       Script JSON file path (required)
  --assets-dir <dir>    Assets output directory (required)
  --provider <name>     Asset provider: ai-video-gen (default for missing assets)`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.scriptFile || !options.assetsDir) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const scenes = JSON.parse(fs.readFileSync(options.scriptFile, 'utf8'));

  // First inventory existing assets
  const existing = inventoryAssets(scenes, options.assetsDir);
  const missing = existing.filter((item) => !item.found);

  if (missing.length === 0) {
    console.log(JSON.stringify({ status: 'complete', inventory: existing }, null, 2));
    return;
  }

  console.error(`Found ${existing.length - missing.length}/${existing.length} assets, generating ${missing.length} missing...`);
  const inventory = await fillMissingAssets(scenes, options.assetsDir, options);
  console.log(JSON.stringify({ status: 'complete', inventory }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  fillMissingAssets,
  findSceneAsset,
  inventoryAssets,
  PROVIDERS,
};
