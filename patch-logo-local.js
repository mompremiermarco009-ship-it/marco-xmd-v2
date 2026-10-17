const fs = require('fs');
const path = 'frontend/public/index.html';
let html = fs.readFileSync(path, 'utf8');

const OLD_URL = 'https://business-gestion.onrender.com/android-chrome-192x192.png';
const NEW_URL = '/media/gestionpro-logo.png';

const count = (html.match(new RegExp(OLD_URL.replace(/\./g, '\\.'), 'g')) || []).length;

if (count === 0) {
  console.log('INFO aucune URL externe trouvee (deja en local ?)');
  process.exit(0);
}

html = html.split(OLD_URL).join(NEW_URL);
fs.writeFileSync(path, html);
console.log('OK ' + count + ' URL(s) remplacee(s) par /media/gestionpro-logo.png');
