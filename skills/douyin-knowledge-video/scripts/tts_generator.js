const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function probeDuration(file) {
  const output = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Math.round(Number(output.trim()) * 1000) / 1000;
}

function generateTTS(scriptFile, outputDir='audio', voice='Tingting', rate=185) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const script = JSON.parse(fs.readFileSync(scriptFile, 'utf-8'));
  let currentTime = 0;
  const audioTimestamps = [];

  script.forEach(scene => {
    const filename = path.join(outputDir, `scene_${String(scene.scene).padStart(2, '0')}.aiff`);
    run('say', ['-v', voice, '-r', String(rate), '-o', filename, scene.dialogue]);
    const duration = Math.max(Number(scene.duration || 0), probeDuration(filename));
    audioTimestamps.push({scene: scene.scene, file: filename, start: currentTime, end: currentTime + duration, duration});
    currentTime += duration;
    console.log(`生成语音: ${filename}`);
  });

  fs.writeFileSync(path.join(outputDir, 'timestamps.json'), JSON.stringify(audioTimestamps, null, 2), 'utf-8');
  console.log('音频时间戳已生成');
}

if (require.main === module) {
  const scriptFile = process.argv[2] || 'script.json';
  generateTTS(scriptFile);
}
