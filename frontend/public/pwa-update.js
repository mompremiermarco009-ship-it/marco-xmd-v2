/* MARCO-XMD — mise à jour PWA sans cache obsolète */
(() => {
  if (!('serviceWorker' in navigator)) return;

  const showUpdate = (registration) => {
    if (document.getElementById('marco-update-toast')) return;
    const toast = document.createElement('aside');
    toast.id = 'marco-update-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span>Nouvelle version disponible</span><button type="button">Recharger</button>';
    Object.assign(toast.style, {
      position: 'fixed', left: '16px', right: '16px', bottom: '16px', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      padding: '12px 14px', borderRadius: '12px', background: '#111827', color: '#f8fafc',
      border: '1px solid #3b82f6', boxShadow: '0 12px 32px #0008', font: '600 14px system-ui,sans-serif'
    });
    const button = toast.querySelector('button');
    Object.assign(button.style, { border: 0, borderRadius: '8px', padding: '8px 12px', background: '#3b82f6', color: '#fff', fontWeight: '700' });
    button.onclick = () => {
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      else window.location.reload();
    };
    document.body.appendChild(toast);
  };

  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    if (registration.waiting) showUpdate(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
      });
    });
  }).catch(error => console.error('[MARCO-XMD] Service Worker indisponible:', error));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.__marcoReloading) return;
    window.__marcoReloading = true;
    window.location.reload();
  });
})();
