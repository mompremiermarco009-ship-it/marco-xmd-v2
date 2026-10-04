/* MARCO-XMD — Moteur i18n (fr / ht / en) */
(function () {
  var STORAGE_KEY = 'marco-lang';
  var DEFAULT_LANG = 'fr';
  var SUPPORTED = ['fr', 'ht', 'en'];

  // Détecte la langue au chargement
  function detectLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;

    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    // Kreyòl haïtien : "ht", "ht-HT"
    if (nav.indexOf('ht') === 0) return 'ht';
    // Anglais : "en", "en-US", "en-GB"
    if (nav.indexOf('en') === 0) return 'en';
    // Français ou autre → français
    return DEFAULT_LANG;
  }

  // Traduit un texte
  function t(key, lang) {
    lang = lang || getCurrentLang();
    var pack = window.MARCO_I18N && window.MARCO_I18N[lang];
    if (!pack) return key;
    return pack[key] || key;
  }

  function getCurrentLang() {
    return localStorage.getItem(STORAGE_KEY) || detectLang();
  }

  // Applique la langue à toute la page
  function applyLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    localStorage.setItem(STORAGE_KEY, lang);

    // Attribut lang sur <html>
    document.documentElement.setAttribute('lang', lang);

    // Traduire tous les éléments [data-i18n]
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      var val = t(key, lang);
      if (val) nodes[i].textContent = val;
    }

    // [data-i18n-title] → attribut title
    var titles = document.querySelectorAll('[data-i18n-title]');
    for (var j = 0; j < titles.length; j++) {
      var k2 = titles[j].getAttribute('data-i18n-title');
      titles[j].setAttribute('title', t(k2, lang));
    }

    // Mettre à jour les boutons de langue (actif)
    var btns = document.querySelectorAll('.marco-lang-btn');
    for (var k = 0; k < btns.length; k++) {
      btns[k].classList.toggle('active', btns[k].getAttribute('data-lang') === lang);
    }

    // Émettre un événement pour les autres scripts
    document.dispatchEvent(new CustomEvent('marco-lang-change', { detail: { lang: lang } }));
  }

  function setLang(lang) {
    applyLang(lang);
  }

  // Expose l'API
  window.marcoI18n = {
    t: t,
    setLang: setLang,
    getLang: getCurrentLang,
    supported: SUPPORTED.slice()
  };

  // Applique la langue dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyLang(getCurrentLang()); });
  } else {
    applyLang(getCurrentLang());
  }
})();
