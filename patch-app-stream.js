const fs = require('fs');
const path = 'frontend/public/tools/watch/app.js';
let js = fs.readFileSync(path, 'utf8');

// 1) playerFrame -> playerVideo
js = js.split("$('#playerFrame')").join("$('#playerVideo')");

// 2) URL proxy -> stream
const urlRegex = /this\.frame\.src = '\/api\/watch\/proxy\?id=' \+ id \+ '[^;]*;/;
const newUrl = "this.frame.src = '/api/watch/stream?id=' + id + '&t=' + Date.now();";
if (urlRegex.test(js)) {
  js = js.replace(urlRegex, newUrl);
  console.log('OK URL -> /api/watch/stream');
}

// 3) Retirer .load() (pas utile)
js = js.replace(/\n\s*this\.frame\.load\(\);/g, '');

// 4) onload -> loadeddata
js = js.replace(
  /this\.frame\.onload = \(\) => \{\s*this\.box\.classList\.remove\('loading'\);\s*\};/,
  "this.frame.addEventListener('loadeddata', () => this.box.classList.remove('loading'), { once: true });"
);

// 5) close() : pause video
js = js.replace(
  "try { this.frame.pause(); } catch(e) {}\n    this.frame.src = '';\n    this.frame.removeAttribute('src');\n    this.frame.load();",
  "try { this.frame.pause(); } catch(e) {}\n    this.frame.removeAttribute('src');\n    try { this.frame.load(); } catch(e) {}"
);

// 6) sendCommand -> video play/pause
js = js.replace(/sendCommand\(func\) \{[\s\S]*?\n  \}/, `sendCommand(func) {
    try {
      if (func === 'pauseVideo') {
        this.frame.paused ? this.frame.play() : this.frame.pause();
      }
    } catch {}
  }`);

fs.writeFileSync(path, js);
console.log('SAVE app.js');
