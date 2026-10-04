/* MARCO-XMD — contrôle du dashboard public */
(() => {
  const guest = localStorage.getItem('marco-guest') === 'true';
  const banner = document.getElementById('guest-banner');
  const greeting = document.getElementById('dashboard-greeting');
  const accountLink = document.getElementById('dashboard-account-link');
  const logout = document.getElementById('dashboard-logout');

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
  };

  (async () => {
    try {
      const user = await window.MarcoAccount?.currentUser();
      showDashboard(user);
    } catch {
      showDashboard(null);
    }
  })();

  logout?.addEventListener('click', async () => {
    await window.MarcoAccount?.signOut();
  });
})();
