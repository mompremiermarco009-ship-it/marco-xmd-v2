const fs = require('fs');
const path = 'frontend/public/index.html';
let html = fs.readFileSync(path, 'utf8');
let ok = 0;

const URL = 'https://business-gestion.onrender.com';
const TITLE = 'GestionPro';
const DESC = 'Aplikasyon pou jere biznis ou';
const ICON = 'fa-briefcase';

/* ═══════════════════════════════════════════════════════════ */
/*  1) MENU MOBILE — remplacer le <a> watch                    */
/* ═══════════════════════════════════════════════════════════ */
const menuRegex = /<a\s+href="\/tools\/watch\/"[^>]*>\s*<i class="[^"]*fa-clapperboard[^"]*"><\/i>\s*<span>MARCO Watch<\/span>\s*<\/a>/;

const menuNew = `<a href="${URL}" target="_blank" rel="noopener" onclick="closeMenu()">
        <i class="fas ${ICON}"></i> <span>${TITLE}</span>
    </a>`;

if (menuRegex.test(html)) {
  html = html.replace(menuRegex, menuNew);
  ok++;
  console.log('OK menu mobile');
}

/* ═══════════════════════════════════════════════════════════ */
/*  2) GRILLE OUTILS — remplacer la tool-card watch           */
/* ═══════════════════════════════════════════════════════════ */
// Pattern qui capture le bloc complet de la tool-card Watch
const cardOutilsRegex = /<a class="tool-card" href="\/tools\/watch\/">[\s\S]*?<\/a>/;

// On remplace la PREMIÈRE occurrence (grille Outils)
let cardCount = 0;
html = html.replace(cardOutilsRegex, (match) => {
  cardCount++;
  if (cardCount === 1) {
    // Grille Outils
    return `<a class="tool-card" href="${URL}" target="_blank" rel="noopener">
                <div class="tool-icon pink"><i class="fas ${ICON}"></i></div>
                <div class="tool-info">
                    <h3>${TITLE}</h3>
                    <p>${DESC}</p>
                </div>
                <span class="tool-tag new"><i class="fas fa-sparkles"></i> Nouveau</span>
            </a>`;
  } else {
    // Grille Services
    return `<a class="tool-card" href="${URL}" target="_blank" rel="noopener">
                <div class="tool-icon pink"><i class="fas ${ICON}"></i></div>
                <div class="tool-info"><h3>${TITLE}</h3><p>${DESC}</p></div>
                <span class="tool-tag new" data-i18n="services.available">Disponible</span>
            </a>`;
  }
});

if (cardCount >= 2) {
  ok += 2;
  console.log('OK grille Outils + Services (' + cardCount + ' cartes remplacées)');
} else if (cardCount === 1) {
  ok++;
  console.log('ATTENTION : 1 seule carte remplacée (vérifier manuellement)');
}

/* ═══════════════════════════════════════════════════════════ */
/*  3) Vérifier qu'il ne reste plus rien                       */
/* ═══════════════════════════════════════════════════════════ */
const watchLeft = (html.match(/MARCO Watch/g) || []).length;
const urlLeft = (html.match(/\/tools\/watch\//g) || []).length;

fs.writeFileSync(path, html);
console.log('');
console.log('════════════════════════════════════════');
console.log(' Résultat');
console.log('════════════════════════════════════════');
console.log('Remplacements effectués : ' + ok);
console.log('"MARCO Watch" restants    : ' + watchLeft);
console.log('"/tools/watch/" restants  : ' + urlLeft);
console.log('"GestionPro" présents     : ' + (html.match(/GestionPro/g) || []).length);
