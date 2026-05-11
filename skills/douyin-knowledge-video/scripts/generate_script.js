const fs = require('fs');
const { buildVideoScript } = require('./generate_video');

if (require.main === module) {
  const keyword = process.argv[2] || '为什么人赚不到钱';
  const script = buildVideoScript(keyword);
  fs.writeFileSync('script.json', JSON.stringify(script, null, 2), 'utf-8');
  console.log('视频脚本已生成: script.json');
}
