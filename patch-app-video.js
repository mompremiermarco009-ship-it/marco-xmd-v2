const fs = require('fs');
const path = 'frontend/public/tools/watch/app.js';
let js = fs.readFileSync(path, 'utf8');

if (js.includes('playerVideo')) {
  console.log('INFO deja patche');
  process.exit(0);
}

// Remplacer la référence à playerFrame par playerVideo dans Player
js = js.split("this.frame = $('#playerFrame')").join("this.frame = $('#playerVideo')");

// Adapter open() pour utiliser video.src au lieu de iframe.src
const oldSetSrc = /this\.frame\.src = '\/api\/watch\/proxy\?id=' \+ id \+ '&t=' \+ Date\.now\(\);/;
const newSetSrc = `this.frame.src = '/api/watch/proxy?id=' + id + '&t=' + Date.now();
    this.frame.load();`;

if (oldSetSrc.test(js)) {
  js = js.replace(oldSetSrc, newSetSrc);
  console.log('OK open() adapte pour video');
}

// Adapter close() pour arreter la video
const oldClose = "this.frame.src = '';";
const newClose = "try { this.frame.pause(); } catch(e) {}\n    this.frame.src = '';\n    this.frame.removeAttribute('src');\n    this.frame.load();";

if (js.includes(oldClose)) {
  js = js.split(oldClose).join(newClose);
  console.log('OK close() adapte pour video');
}

// Supprimer la ligne onload (n\'existe pas sur video)
js = js.replace(/this\.frame\.onload = \(\) => \{\s*this\.box\.classList\.remove\('loading'\);\s*\};/, 
  "this.frame.addEventListener('loadeddata', () => this.box.classList.remove('loading'), { once: true });");

// sendCommand n\'existe plus (pas d\'API YT) - remplacer par video.play/pause
js = js.replace(/sendCommand\(func\) \{[\s\S]*?\}/, `sendCommand(func) {
    try {
      if (func === 'pauseVideo') {
        this.frame.paused ? this.frame.play() : this.frame.pause();
      }
    } catch {}
  }`);

fs.writeFileSync(path, js);
console.log('SAVE app.js');
