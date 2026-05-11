const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildVideoScript,
  buildTimeline,
  createSlug,
  findSceneAsset,
  formatSrtTime,
  writeSrt,
} = require('./generate_video');

test('buildVideoScript creates a 90-120 second multi-scene script', () => {
  const scenes = buildVideoScript('为什么人赚不到钱');
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  assert.ok(scenes.length >= 6 && scenes.length <= 8);
  assert.ok(totalDuration >= 90 && totalDuration <= 120);
  assert.equal(new Set(scenes.map((scene) => scene.scene)).size, scenes.length);

  for (const scene of scenes) {
    assert.ok(scene.description.includes('为什么人赚不到钱'));
    assert.ok(!scene.dialogue.includes('为什么为什么'));
    assert.ok(scene.dialogue.length >= 24);
    assert.ok(scene.duration >= 10);
    assert.match(scene.palette.bg, /^0x[0-9A-F]{6}$/);
    assert.match(scene.palette.accent, /^0x[0-9A-F]{6}$/);
  }
});

test('buildTimeline uses real audio durations when they exceed planned durations', () => {
  const scenes = [
    { scene: 1, duration: 12, dialogue: '第一段', description: '第一幕' },
    { scene: 2, duration: 10, dialogue: '第二段', description: '第二幕' },
  ];

  const timeline = buildTimeline(scenes, [8.2, 14.4]);

  assert.deepEqual(
    timeline.map((scene) => [scene.scene, scene.start, scene.end, scene.duration]),
    [
      [1, 0, 12, 12],
      [2, 12, 26.4, 14.4],
    ],
  );
});

test('writeSrt writes synchronized subtitles from the timeline', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douyin-srt-'));
  const outputFile = path.join(dir, 'subtitles.srt');

  writeSrt([
    { scene: 1, start: 0, end: 1.25, dialogue: '第一句' },
    { scene: 2, start: 1.25, end: 63.5, dialogue: '第二句' },
  ], outputFile);

  assert.equal(formatSrtTime(63.5), '00:01:03,500');
  assert.equal(
    fs.readFileSync(outputFile, 'utf8'),
    '1\n00:00:00,000 --> 00:00:01,250\n第一句\n\n2\n00:00:01,250 --> 00:01:03,500\n第二句\n\n',
  );
});

test('findSceneAsset resolves numbered scene assets and createSlug is filesystem-safe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douyin-assets-'));
  const assetDir = path.join(dir, 'assets');
  fs.mkdirSync(assetDir);
  fs.writeFileSync(path.join(assetDir, 'scene_02.png'), '');

  assert.equal(createSlug('为什么人赚不到钱？'), '为什么人赚不到钱');
  assert.equal(findSceneAsset(assetDir, 1), null);
  assert.equal(findSceneAsset(assetDir, 2), path.join(assetDir, 'scene_02.png'));
});
