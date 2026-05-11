const { generateVideo, parseArgs } = require('./generate_video');

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.keyword) options.keyword = '一个知识点';
  generateVideo(options).then((summary) => {
    console.log(`视频已生成: ${summary.finalFile}`);
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
