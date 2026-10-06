/* MARCO-XMD — Authentification, profil et historique */
(() => {
  const DEFAULT_URL = 'https://btavjbuzreapisdnmetv.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_jsB_dReXYCm-SH-qULKVCw_yTC-yCWm';
  const MESSAGES = {
    invalid_credentials: 'Email ou mot de passe incorrect.',
    email_exists: 'Cet email est déjà utilisé.',
    weak_password: 'Mot de passe trop court (6 caractères minimum).',
    network: 'Problème de connexion. Vérifiez votre réseau.',
    oauth_failed: 'La connexion avec Google est temporairement indisponible.',
    default: 'Une erreur est survenue. Réessayez plus tard.'
  };
  let clientPromise;
  let sdkPromise;
  const friendlyError = error => {
    const code = String(error?.code || error?.name || '').toLowerCase();
    if (code.includes('invalid') || code.includes('credential')) return MESSAGES.invalid_credentials;
    if (code.includes('already') || code.includes('exist')) return MESSAGES.email_exists;
    if (code.includes('weak') || code.includes('password')) return MESSAGES.weak_password;
    if (code.includes('network') || code.includes('fetch') || !navigator.onLine) return MESSAGES.network;
    if (code.includes('oauth')) return MESSAGES.oauth_failed;
    return MESSAGES.default;
  };
  const loadScript = src => new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.async = false; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
  function browserSDK() { if (window.supabase?.createClient) return window.supabase; try { if (typeof supabase !== 'undefined' && supabase?.createClient) { window.supabase = supabase; return supabase; } } catch (_) {} return null; }
  async function ensureSupabaseSDK() {
    const existing = browserSDK(); if (existing) return existing;
    if (!sdkPromise) sdkPromise = (async () => { for (const src of ['/vendor/supabase/supabase.js']) { try { await loadScript(src); const sdk = browserSDK(); if (sdk) return sdk; } catch (_) {} } throw new Error('service_unavailable'); })();
    return sdkPromise;
  }
  async function getClient() {
    if (!clientPromise) clientPromise = (async () => { const sdk = await ensureSupabaseSDK(); const response = await fetch('/api/config', { cache: 'no-store' }); if (!response.ok) throw new Error('service_unavailable'); const config = await response.json(); return sdk.createClient(config.supabaseUrl || DEFAULT_URL, config.supabaseKey || DEFAULT_KEY); })().catch(error => { clientPromise = null; throw error; });
    return clientPromise;
  }
  async function currentUser() { try { const { data, error } = await (await getClient()).auth.getUser(); return error ? null : data.user; } catch (_) { return null; } }
  async function requireUser(redirect = '/auth.html') { try { const user = await currentUser(); if (!user) location.href = redirect; return user; } catch (_) { const target = document.querySelector('[data-auth-error]'); if (target) { target.textContent = MESSAGES.default; target.hidden = false; } return null; } }
  async function addHistory(userId, eventType, title, details = '', metadata = {}) { try { await (await getClient()).from('activity_history').insert({ user_id: userId, event_type: eventType, title, details, metadata }); } catch (_) {} }
  async function signInWithGoogle() { try { const result = await (await getClient()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth.html`, queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (result.error) throw new Error('oauth_failed'); } catch (_) { throw new Error('oauth_failed'); } }
  async function signOut() { await (await getClient()).auth.signOut(); location.href = '/auth.html'; }
  window.MarcoAccount = { getClient, ensureSupabaseSDK, currentUser, requireUser, addHistory, signInWithGoogle, signOut, friendlyError, messages: MESSAGES };
})();
