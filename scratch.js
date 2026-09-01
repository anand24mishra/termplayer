const fs = require('fs');
const mm = require('music-metadata');

async function test() {
  const tag = Buffer.alloc(128, 0);
  tag.write('TAG', 0, 3, 'ascii');
  tag.write('Mocked Title', 3, 30, 'ascii');
  tag.write('Mocked Artist', 33, 30, 'ascii');
  tag.write('Mocked Album', 63, 30, 'ascii');
  
  fs.writeFileSync('test1.mp3', tag);
  try {
    const meta = await mm.parseFile('test1.mp3');
    console.log(meta.common);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
