const fs = require('fs');
const path = 'backend/server.js';
let s = fs.readFileSync(path, 'utf8');

if (s.includes('watch/proxy.js')) {
  console.log('INFO deja monte');
  process.exit(0);
}

// Trouver le bloc watch pour ajouter proxy juste apres
const marker = 'app.use(generalApiLimiter, require("./watch/routes.js"));';

if (!s.includes(marker)) {
  console.log('ERREUR: marqueur watch/routes introuvable');
  process.exit(1);
}

const newBlock = marker + '\n    app.use("/api/watch", generalApiLimiter, require("./watch/proxy.js"));';

s = s.replace(marker, newBlock);
fs.writeFileSync(path, s);
console.log('OK route proxy montee');
