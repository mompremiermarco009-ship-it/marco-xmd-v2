const fs = require('fs');
const path = 'frontend/public/index.html';
let html = fs.readFileSync(path, 'utf8');

// Carte exacte (grille Services, sur 5 lignes)
const oldCard = `            <a class="tool-card" href="/tools/watch/">
                <div class="tool-icon pink"><i class="fas fa-clapperboard"></i></div>
                <div class="tool-info"><h3>MARCO Watch</h3><p>Films, documentaires et live.</p></div>
                <span class="tool-tag new" data-i18n="services.available">Disponible</span>
            </a>`;

const newCard = `            <a class="tool-card" href="https://business-gestion.onrender.com" target="_blank" rel="noopener">
                <div class="tool-icon pink"><i class="fas fa-briefcase"></i></div>
                <div class="tool-info"><h3>GestionPro</h3><p>Aplikasyon pou jere biznis ou</p></div>
                <span class="tool-tag new" data-i18n="services.available">Disponible</span>
            </a>`;

if (!html.includes(oldCard)) {
  console.log('ERREUR: carte exacte introuvable');
  console.log('Recherche manuelle necessaire');
  process.exit(1);
}

html = html.replace(oldCard, newCard);
fs.writeFileSync(path, html);
console.log('OK carte Services : Watch -> GestionPro');
console.log('');
console.log('Verification finale :');
console.log('- MARCO Watch restants : ' + (html.match(/MARCO Watch/g) || []).length);
console.log('- /tools/watch/ restants : ' + (html.match(/\/tools\/watch\//g) || []).length);
console.log('- GestionPro presents : ' + (html.match(/GestionPro/g) || []).length);
