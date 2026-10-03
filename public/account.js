/* MARCO-XMD — Supabase Auth / Profil / Historique */
(() => {
  const DEFAULT_URL = 'https://btavjbuzreapisdnmetv.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_jsB_dReXYCm-SH-qULKVCw_yTC-yCWm';
  let clientPromise;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = fetch('/api/config').then(response => response.json()).then(config => {
        const url = config.supabaseUrl || DEFAULT_URL;
        const key = config.supabaseKey || DEFAULT_KEY;
        if (!window.supabase?.createClient) throw new Error('Client Supabase indisponible.');
        return window.supabase.createClient(url, key);
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
    const user = await currentUser();
    if (!user) {
      window.location.href = redirect;
      return null;
    }
    return user;
  }

  async function addHistory(userId, eventType, title, details = '', metadata = {}) {
    const supabase = await getClient();
    const { error } = await supabase.from('activity_history').insert({
      user_id: userId, event_type: eventType, title, details, metadata
    });
    if (error) console.warn('Historique non enregistré:', error.message);
  }

  async function signOut() {
    const supabase = await getClient();
    await supabase.auth.signOut();
    window.location.href = '/auth.html';
  }

  window.MarcoAccount = { getClient, currentUser, requireUser, addHistory, signOut };
})();
