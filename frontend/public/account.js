/* MARCO-XMD — Supabase Auth / Profil / Historique */
(() => {
  const DEFAULT_URL = 'https://btavjbuzreapisdnmetv.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_jsB_dReXYCm-SH-qULKVCw_yTC-yCWm';
  const CLIENT_ERROR = 'Le chargement du module d’authentification a échoué. Vérifiez votre connexion internet. Si le problème persiste, essayez de changer de réseau (Wi-Fi ↔ données mobiles).';
  let clientPromise;
  let sdkPromise;

  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = false;
    script.onload = resolve; script.onerror = () => reject(new Error(`Échec du chargement de ${src}`));
    document.head.appendChild(script);
  });

  function browserSDK() {
    if (window.supabase?.createClient) return window.supabase;
    // Le bundle UMD peut exposer `supabase` comme variable globale plutôt
    // que comme propriété enumerable de window selon le navigateur.
    try {
      if (typeof supabase !== 'undefined' && supabase?.createClient) {
        window.supabase = supabase;
        return supabase;
      }
    } catch (_) {}
    return null;
  }

  async function ensureSupabaseSDK() {
    const existing = browserSDK();
    if (existing) return existing;
    if (!sdkPromise) sdkPromise = (async () => {
      for (const src of ['/vendor/supabase/supabase.js', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'https://unpkg.com/@supabase/supabase-js@2']) {
        try { await loadScript(src); const sdk = browserSDK(); if (sdk) return sdk; }
        catch (error) { console.error('[MARCO-XMD] SDK Supabase:', error); }
      }
      throw new Error(CLIENT_ERROR);
    })();
    return sdkPromise;
  }

  async function getClient() {
    if (!clientPromise) clientPromise = (async () => {
      const sdk = await ensureSupabaseSDK();
      let config;
      try {
        const response = await fetch('/api/config', { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Configuration Supabase HTTP ${response.status}`);
        config = await response.json();
      } catch (error) { console.error('[MARCO-XMD] Configuration Supabase:', error); throw new Error(CLIENT_ERROR); }
      const client = sdk.createClient(config.supabaseUrl || DEFAULT_URL, config.supabaseKey || DEFAULT_KEY);
      if (!client) throw new Error(CLIENT_ERROR);
      return client;
    })().catch(error => { clientPromise = null; throw error; });
    return clientPromise;
  }

  async function currentUser() { const { data, error } = await (await getClient()).auth.getUser(); return error ? null : data.user; }
  async function requireUser(redirect = '/auth.html') { try { const user = await currentUser(); if (!user) location.href = redirect; return user; } catch (error) { const target = document.querySelector('[data-auth-error]'); if (target) { target.textContent = error.message || CLIENT_ERROR; target.hidden = false; } return null; } }
  async function addHistory(userId, eventType, title, details = '', metadata = {}) { const { error } = await (await getClient()).from('activity_history').insert({ user_id: userId, event_type: eventType, title, details, metadata }); if (error) console.warn('[MARCO-XMD] Historique:', error.message); }
  async function signOut() { await (await getClient()).auth.signOut(); location.href = '/auth.html'; }

  window.MarcoAccount = { getClient, ensureSupabaseSDK, currentUser, requireUser, addHistory, signOut, CLIENT_ERROR };
})();
