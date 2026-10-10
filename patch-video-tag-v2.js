const fs = require('fs');
const path = 'frontend/public/tools/watch/index.html';
let html = fs.readFileSync(path, 'utf8');

const oldIframe = /<iframe id="playerFrame"[\s\S]*?><\/iframe>/;

const newVideo = `<video id="playerVideo"
              controls
              autoplay
              playsinline
              preload="metadata"
              style="width:100%;height:100%;background:#000;display:block;"></video>`;

if (html.includes('id="playerVideo"')) {
  console.log('INFO video tag deja present');
} else if (oldIframe.test(html)) {
  html = html.replace(oldIframe, newVideo);
  fs.writeFileSync(path, html);
  console.log('OK iframe -> video tag');
} else {
  console.log('ERREUR: iframe introuvable');
  process.exit(1);
}
