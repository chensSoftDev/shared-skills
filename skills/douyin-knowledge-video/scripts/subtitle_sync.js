const fs = require('fs');
const { buildTimeline, writeSrt } = require('./generate_video');

function generateSubtitles(scriptFile, timestampsFile, outputFile='subtitles.srt') {
  const script = JSON.parse(fs.readFileSync(scriptFile, 'utf-8'));
  const timestamps = JSON.parse(fs.readFileSync(timestampsFile, 'utf-8'));
  const timeline = timestamps.every((item) => typeof item.start === 'number' && typeof item.end === 'number')
    ? script.map((scene, index) => ({ ...scene, start: timestamps[index].start, end: timestamps[index].end }))
    : buildTimeline(script, timestamps.map((item) => item.duration));
  writeSrt(timeline, outputFile);
  console.log(`字幕已生成: ${outputFile}`);
}

if (require.main === module) {
  const scriptFile = process.argv[2] || 'script.json';
  const timestampsFile = process.argv[3] || 'audio/timestamps.json';
  generateSubtitles(scriptFile, timestampsFile);
}
