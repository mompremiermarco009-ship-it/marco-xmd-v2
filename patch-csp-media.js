const fs = require('fs');
const path = 'backend/server.js';
let s = fs.readFileSync(path, 'utf8');

if (s.includes('mediaSrc')) {
  console.log('INFO mediaSrc deja present');
  process.exit(0);
}

// Ajouter mediaSrc apres frameSrc
const marker = `frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],`;

if (!s.includes(marker)) {
  console.log('ERREUR: frameSrc introuvable');
  process.exit(1);
}

const newBlock = marker + `
                mediaSrc: ["'self'", "https://*.googlevideo.com", "blob:", "data:"],`;

s = s.replace(marker, newBlock);
fs.writeFileSync(path, s);
console.log('OK mediaSrc ajoute au CSP');
