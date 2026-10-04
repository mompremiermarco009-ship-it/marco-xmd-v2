/* MARCO-XMD — barre d’annonce interne, sans notification système */
(() => {
  const config = window.MARCO_APP_BANNER || { enabled: false };
  const bar = document.getElementById('marco-app-banner');
  if (!bar || !config.enabled || !config.text) return;

  const text = bar.querySelector('[data-banner-text]');
  const link = bar.querySelector('[data-banner-link]');
  const close = bar.querySelector('[data-banner-close]');
  if (text) text.textContent = config.text;
  if (link && config.url) {
    link.href = config.url;
    link.hidden = false;
    link.textContent = config.linkText || 'En savoir plus';
  }
  if (close) close.addEventListener('click', () => {
    bar.hidden = true;
    sessionStorage.setItem('marco-banner-dismissed', '1');
  });
  if (sessionStorage.getItem('marco-banner-dismissed') !== '1') bar.hidden = false;
})();
