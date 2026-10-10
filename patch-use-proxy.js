const fs = require('fs');
const path = 'frontend/public/tools/watch/app.js';
let js = fs.readFileSync(path, 'utf8');

if (js.includes('/api/watch/proxy')) {
  console.log('INFO deja patche');
  process.exit(0);
}

// Remplacer l'URL de l'iframe par le proxy
const oldUrl = "this.frame.src = 'https://www.youtube.com/embed/' + id +";
const newUrl = "this.frame.src = '/api/watch/proxy?id=' + id + '&t=' + Date.now();\n    this.frame.dataset.originalUrl = 'https://www.youtube.com/embed/' + id +";

// Chercher la ligne exacte
const regex = /this\.frame\.src = `https:\/\/www\.youtube\.com\/embed\/\$\{id\}\?[^`]*`;/;
const match = js.match(regex);

if (match) {
  const original = match[0];
  const replacement = `this.frame.src = '/api/watch/proxy?id=' + id + '&t=' + Date.now();`;
  js = js.replace(regex, replacement);
  console.log('OK URL remplacee par proxy');
  console.log('   Ancienne :', original.slice(0, 60) + '...');
  console.log('   Nouvelle :', replacement);
} else {
  console.log('ERREUR: URL iframe introuvable');
  process.exit(1);
}

fs.writeFileSync(path, js);
console.log('SAVE app.js');
