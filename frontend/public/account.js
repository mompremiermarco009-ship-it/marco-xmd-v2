/* MARCO-XMD — Supabase Auth / Profil / Historique */
(() => {
  const DEFAULT_URL = 'https://btavjbuzreapisdnmetv.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_jsB_dReXYCm-SH-qULKVCw_yTC-yCWm';
  const CLIENT_ERROR = 'Le chargement du module d’authentification a échoué. Vérifiez votre connexion internet. Si le problème persiste, essayez de changer de réseau (Wi-Fi ↔ données mobiles).';
  let clientPromise;
  let sdkPromise;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Échec du chargement de ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabaseSDK() {
    if (window.supabase?.createClient) return window.supabase;
    if (!sdkPromise) {
      sdkPromise = (async () => {
        const sources = [
          'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
          'https://unpkg.com/@supabase/supabase-js@2',
          'https://esm.sh/@supabase/supabase-js@2'
        ];
        for (const source of sources) {
          try {
            await loadScript(source);
            if (window.supabase?.createClient) return window.supabase;
          } catch (error) {
            console.error('[MARCO-XMD] Erreur chargement Supabase:', error);
          }
        }
        throw new Error(CLIENT_ERROR);
      })();
    }
    return sdkPromise;
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const sdk = await ensureSupabaseSDK();
        let config;
        try {
          const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error(`Configuration Supabase HTTP ${response.status}`);
          config = await response.json();
        } catch (error) {
          console.error('[MARCO-XMD] Erreur récupération configuration Supabase:', error);
          throw new Error(CLIENT_ERROR);
        }
        const url = config.supabaseUrl || DEFAULT_URL;
        const key = config.supabaseKey || DEFAULT_KEY;
        if (!url || !key || !sdk?.createClient) throw new Error(CLIENT_ERROR);
        return sdk.createClient(url, key);
      })().catch(error => {
        console.error('[MARCO-XMD] Initialisation Supabase impossible:', error);
        clientPromise = null;
        throw error instanceof Error ? error : new Error(CLIENT_ERROR);
      });
    }
    return clientPromise;
  }

  async function currentUser() {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  }

  async function requireUser(redirect = '/auth.html') {
    try {
      const user = await currentUser();
      if (!user) {
        window.location.href = redirect;
        return null;
      }
      return user;
    } catch (error) {
      console.error('[MARCO-XMD] Vérification utilisateur impossible:', error);
      const target = document.querySelector('[data-auth-error]');
      if (target) { target.textContent = error.message || CLIENT_ERROR; target.hidden = false; }
      return null;
    }
  }

  async function addHistory(userId, eventType, title, details = '', metadata = {}) {
    const supabase = await getClient();
    const { error } = await supabase.from('activity_history').insert({
      user_id: userId, event_type: eventType, title, details, metadata
    });
    if (error) console.warn('[MARCO-XMD] Historique non enregistré:', error.message);
  }

  async function signOut() {
    const supabase = await getClient();
    await supabase.auth.signOut();
    window.location.href = '/auth.html';
  }

  window.MarcoAccount = { getClient, ensureSupabaseSDK, currentUser, requireUser, addHistory, signOut, CLIENT_ERROR };
})();
