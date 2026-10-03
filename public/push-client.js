/* MARCO-XMD — inscription Web Push côté téléphone */
(() => {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  const style = document.createElement('style');
  style.textContent = `
    #marco-push-widget { position:fixed; right:16px; bottom:16px; z-index:100000; max-width:340px;
      padding:14px 16px; border:1px solid rgba(13,110,253,.35); border-radius:14px;
      background:var(--surface,#fff); color:var(--text,#0f172a); box-shadow:0 10px 35px rgba(0,0,0,.18); font:14px Inter,system-ui,sans-serif; }
    #marco-push-widget p { margin:0 0 10px; line-height:1.4; }
    #marco-push-widget button { border:0; border-radius:9px; padding:9px 12px; background:#0d6efd; color:#fff; font-weight:700; cursor:pointer; }
    #marco-push-widget button.secondary { background:transparent; color:inherit; margin-left:6px; }
  `;
  document.head.appendChild(style);

  const base64ToBytes = (value) => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  };

  async function registerSubscription() {
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await fetch('/api/push/public-key');
    const keyData = await keyResponse.json();
    if (!keyResponse.ok) throw new Error(keyData.error || 'Notifications indisponibles');
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(keyData.publicKey)
      });
    }
    const response = await fetch('/api/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Impossible d’enregistrer ce téléphone');
    }
    localStorage.setItem('marco-push-enabled', '1');
  }

  function render() {
    if (localStorage.getItem('marco-push-enabled') === '1') return;
    const box = document.createElement('div');
    box.id = 'marco-push-widget';
    box.innerHTML = '<p><strong>Recevoir les actualités MARCO-XMD ?</strong><br><span>Activez les notifications sur ce téléphone.</span></p>' +
      '<button id="marco-push-enable">Activer</button><button class="secondary" id="marco-push-later">Plus tard</button>';
    document.body.appendChild(box);
    document.getElementById('marco-push-later').onclick = () => box.remove();
    document.getElementById('marco-push-enable').onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Activation…';
      try {
        let permission;
        try {
          permission = await Notification.requestPermission();
        } catch (error) {
          const blockedByOverlay = error && (error.name === 'NotAllowedError' || /overlay|superposition|bulle|autorisation/i.test(error.message || ''));
          if (blockedByOverlay) {
            throw new Error('Android bloque cette demande lorsqu’une bulle ou une superposition est active. Fermez les bulles flottantes, puis appuyez de nouveau sur Activer.');
          }
          throw error;
        }
        if (permission !== 'granted') throw new Error('Autorisation refusée. Vous pouvez l’activer dans les paramètres de notifications de Chrome.');
        await registerSubscription();
        box.innerHTML = '<strong>Notifications activées.</strong><br><span>Vous recevrez les prochaines informations.</span>';
        setTimeout(() => box.remove(), 3500);
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Réessayer';
        const oldMessage = box.querySelector('.marco-push-error');
        if (oldMessage) oldMessage.remove();
        const message = document.createElement('small');
        message.className = 'marco-push-error';
        message.textContent = error.message;
        message.style.display = 'block'; message.style.marginTop = '8px'; message.style.lineHeight = '1.35'; message.style.color = '#dc2626';
        box.appendChild(message);
      }
    };
  }

  window.addEventListener('load', () => setTimeout(render, 1200));
})();
