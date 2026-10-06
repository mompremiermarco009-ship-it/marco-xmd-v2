/* MARCO-XMD — contrôle du dashboard public */
(() => {
  const guest = localStorage.getItem('marco-guest') === 'true';
  const banner = document.getElementById('guest-banner');
  const greeting = document.getElementById('dashboard-greeting');
  const accountLink = document.getElementById('dashboard-account-link');
  const logout = document.getElementById('dashboard-logout');
  const statSearch = document.getElementById('stat-search');
  const statDownload = document.getElementById('stat-download');
  const statVoice = document.getElementById('stat-voice');

  const showDashboard = (user) => {
    document.documentElement.classList.add('dashboard-ready');
    if (guest && !user) {
      banner?.classList.add('show');
      if (greeting) greeting.textContent = 'Bonjour, invité';
      if (accountLink) { accountLink.href = '/auth.html'; accountLink.innerHTML = '<i class="fa-solid fa-user-plus"></i> Créer un compte'; }
      return;
    }
    if (!user) {
      window.location.replace('/auth.html');
      return;
    }
    localStorage.removeItem('marco-guest');
    if (greeting) greeting.textContent = `Bonjour, ${user.user_metadata?.display_name || user.email?.split('@')[0] || 'utilisateur'}`;
    if (accountLink) { accountLink.href = '/profile.html'; accountLink.innerHTML = '<i class="fa-solid fa-user"></i> Mon profil'; }
    if (logout) logout.hidden = false;
    (async () => {
      try {
        const client = await window.MarcoAccount.getClient();
        const { data } = await client.from('activity_history').select('event_type').eq('user_id', user.id).limit(500);
        const rows = data || [];
        if (statSearch) statSearch.textContent = rows.filter(r => ['lyrics_search','search'].includes(r.event_type)).length;
        if (statDownload) statDownload.textContent = rows.filter(r => ['video_download','download'].includes(r.event_type)).length;
        if (statVoice) statVoice.textContent = rows.filter(r => ['voice_generate','voice'].includes(r.event_type)).length;
      } catch {}
    })();
  };

  // Attend que MarcoAccount soit disponible (max 3s)
  const waitForAccount = (maxWait = 3000) => new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (window.MarcoAccount && typeof window.MarcoAccount.currentUser === 'function') {
        resolve(window.MarcoAccount);
      } else if (Date.now() - start > maxWait) {
        resolve(null);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  (async () => {
    try {
      const account = await waitForAccount();
      if (!account) {
        console.warn('[dashboard] MarcoAccount non disponible');
        showDashboard(null);
        return;
      }
      const user = await account.currentUser();
      showDashboard(user);
    } catch (err) {
      console.error('[dashboard]', err);
      showDashboard(null);
    }
  })();

  logout?.addEventListener('click', async () => {
    await window.MarcoAccount?.signOut();
  });
})();
