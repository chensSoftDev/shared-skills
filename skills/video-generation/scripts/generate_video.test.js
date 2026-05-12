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
  loadExternalScript,
  writeSrt,
} = require('./generate_video');

const { DEFAULTS } = require('./config');
const { allocateDurations, pickVariant, applyTopic, DEFAULT_SCENE_ROLES } = require('./scene_templates');

test('buildVideoScript creates a script within the configured duration range', () => {
  const scenes = buildVideoScript('为什么人赚不到钱', { seed: 0 });
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const [minDuration, maxDuration] = DEFAULTS.durationRange;

  assert.ok(scenes.length >= 6 && scenes.length <= 8);
  assert.ok(totalDuration >= minDuration && totalDuration <= maxDuration,
    `total ${totalDuration}s outside ${minDuration}-${maxDuration}s range`);
  assert.equal(new Set(scenes.map((scene) => scene.scene)).size, scenes.length);

  for (const scene of scenes) {
    assert.ok(scene.dialogue.length >= 20);
    assert.ok(scene.duration >= 5);
    assert.match(scene.palette.bg, /^0x[0-9A-F]{6}$/);
    assert.match(scene.palette.accent, /^0x[0-9A-F]{6}$/);
    assert.ok(scene.role, 'scene should have a role field');
  }
});

test('buildVideoScript substitutes topic into dialogue via templates', () => {
  const scenes = buildVideoScript('时间管理', { seed: 0 });
  const hasTopicInDialogue = scenes.some((s) => s.dialogue.includes('时间管理'));
  assert.ok(hasTopicInDialogue, 'at least one scene dialogue should mention the topic');
});

test('buildVideoScript respects maxScenes option', () => {
  const scenes = buildVideoScript('测试', { maxScenes: 3, seed: 0 });
  assert.equal(scenes.length, 3);
  assert.deepEqual(scenes.map((s) => s.scene), [1, 2, 3]);
});

test('buildVideoScript uses seed for deterministic variant selection', () => {
  const a = buildVideoScript('话题', { seed: 42 });
  const b = buildVideoScript('话题', { seed: 42 });
  assert.deepEqual(a, b);
});

test('allocateDurations distributes time by weight', () => {
  const roles = [
    { durationWeight: 1 },
    { durationWeight: 2 },
    { durationWeight: 1 },
  ];
  const durations = allocateDurations(roles, 100);
  assert.equal(durations.length, 3);
  assert.ok(Math.abs(durations.reduce((a, b) => a + b, 0) - 100) < 1);
  assert.ok(durations[1] > durations[0]);
});

test('pickVariant uses seed for deterministic selection', () => {
  const variants = [{ a: 1 }, { a: 2 }, { a: 3 }];
  const result = pickVariant(variants, 0);
  assert.deepEqual(result, variants[0]);
  const result2 = pickVariant(variants, 1);
  assert.deepEqual(result2, variants[1]);
});

test('applyTopic replaces all {{topic}} placeholders', () => {
  const template = { dialogue: '聊聊{{topic}}', description: '{{topic}}的分析', action: '不变' };
  const filled = applyTopic(template, '赚钱');
  assert.equal(filled.dialogue, '聊聊赚钱');
  assert.equal(filled.description, '赚钱的分析');
  assert.equal(filled.action, '不变');
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

test('loadExternalScript loads AI-generated script and fills defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douyin-script-'));
  const scriptFile = path.join(dir, 'script.json');
  const externalScenes = [
    { role: 'hook', title: '开场', dialogue: '这是AI生成的开场白', description: '描述', action: '动作', duration: 12 },
    { role: 'myth', title: '误区', dialogue: '这是AI生成的误区分析', description: '描述', action: '动作' },
  ];
  fs.writeFileSync(scriptFile, JSON.stringify(externalScenes), 'utf8');

  const scenes = loadExternalScript(scriptFile);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].scene, 1);
  assert.equal(scenes[0].duration, 12);
  assert.equal(scenes[1].scene, 2);
  assert.equal(scenes[1].duration, 15); // default when missing
  assert.ok(scenes[0].palette, 'should have auto-assigned palette');
  assert.ok(scenes[1].palette, 'should have auto-assigned palette');
  assert.equal(scenes[0].dialogue, '这是AI生成的开场白');
});
