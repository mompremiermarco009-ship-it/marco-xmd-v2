/* ═══════════════════════════════════════════════════════════ */
/*  MARCO Watch — Application                                    */
/* ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ─── Utilitaires ─── */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const escapeHtml = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
const extractYoutubeId = (input) => {
  if (!input) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const patterns = [/[?&]v=([A-Za-z0-9_-]{11})/, /youtu\.be\/([A-Za-z0-9_-]{11})/, /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/];
  for (const re of patterns) { const m = String(input).match(re); if (m) return m[1]; }
  return null;
};
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const toast = (msg, type = 'info', duration = 2600) => {
  const c = $('#toastContainer'); if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, duration);
};

/* ─── State ─── */
const KEYS = { theme: 'marco-theme', myList: 'marco-watch-my-list' };
const State = {
  theme: localStorage.getItem(KEYS.theme) || 'dark',
  myList: new Set(JSON.parse(localStorage.getItem(KEYS.myList) || '[]')),
  filterCategory: 'all',
  searchQuery: '',
  showMyListOnly: false,
  data: { sections: [] },
  currentPlayer: { id: null, title: '', channel: '' },
  playerMode: 'normal'
};
const saveMyList = () => localStorage.setItem(KEYS.myList, JSON.stringify([...State.myList]));

/* ─── Thème ─── */
const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', State.theme);
  const i = $('#btnTheme i');
  if (i) i.className = State.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem(KEYS.theme, State.theme);
};
const toggleTheme = () => { State.theme = State.theme === 'dark' ? 'light' : 'dark'; applyTheme(); };

/* ─── Rendu carte ─── */
const renderCard = (item) => {
  const inList = State.myList.has(item.id);
  const badgeHtml = item.badge ? `<span class="film-badge ${item.badge}">${item.badge === 'hd' ? 'HD' : item.badge === 'new' ? 'Nouveau' : 'Top'}</span>` : '';
  const liveHtml = item.live ? `<span class="film-badge live"><i class="fas fa-circle" style="font-size:0.4rem;"></i> LIVE</span>` : '';
  const durHtml = item.duration ? `<span class="film-duration">${escapeHtml(item.duration)}</span>` : '';
  return `
    <article class="film-card" data-video-id="${escapeHtml(item.id)}">
      <button class="film-thumb-btn"
              data-video-id="${escapeHtml(item.id)}"
              data-video-title="${escapeHtml(item.title)}"
              data-video-channel="${escapeHtml(item.channel)}"
              aria-label="Lire : ${escapeHtml(item.title)}">
        <img class="film-thumb" src="${YT_THUMB(item.id)}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0">
        ${liveHtml}${badgeHtml}${durHtml}
        <span class="film-overlay"><i class="fas fa-play-circle"></i></span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${escapeHtml(item.title)}</h3>
        <div class="film-channel">${escapeHtml(item.channel)}</div>
        <div class="film-actions">
          <button class="film-action" data-action="download" data-video-id="${escapeHtml(item.id)}" aria-label="Télécharger">
            <i class="fas fa-download"></i> DL
          </button>
          <button class="film-action" data-action="toggle-list" data-video-id="${escapeHtml(item.id)}" data-video-title="${escapeHtml(item.title)}" data-video-channel="${escapeHtml(item.channel)}" aria-pressed="${inList}">
            <i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i> ${inList ? 'Dans la liste' : 'Liste'}
          </button>
        </div>
      </div>
    </article>`;
};

const renderSection = (section, items) => {
  if (!items.length) return '';
  const isGrid = section.layout === 'grid';
  const cls = isGrid ? 'films-grid' : 'films-row';
  return `
    <section class="section" data-section-id="${escapeHtml(section.id)}">
      <div class="section-head">
        <h2 class="section-title">
          <i class="fas ${section.icon}" style="color:${section.iconColor};"></i>
          ${escapeHtml(section.title)}
        </h2>
        <button class="section-see-all">Tout voir <i class="fas fa-chevron-right"></i></button>
      </div>
      <div class="${cls}">${items.map(renderCard).join('')}</div>
    </section>`;
};

const render = () => {
  const main = $('#mainContent');
  const q = State.searchQuery.toLowerCase().trim();
  const filtered = State.data.sections.map(sec => {
    if (State.filterCategory !== 'all' && sec.id !== State.filterCategory) return { sec, items: [] };
    let items = sec.items;
    if (q) items = items.filter(i => i.title.toLowerCase().includes(q) || i.channel.toLowerCase().includes(q));
    if (State.showMyListOnly) items = items.filter(i => State.myList.has(i.id));
    return { sec, items };
  }).filter(x => x.items.length);

  if (!filtered.length) {
    main.innerHTML = `<div class="empty-state"><i class="fas fa-film"></i><h3>Aucun résultat</h3><p>${State.showMyListOnly ? 'Votre liste est vide.' : 'Essayez un autre mot-clé.'}</p></div>`;
    return;
  }
  main.innerHTML = filtered.map(({ sec, items }) => renderSection(sec, items)).join('');
  syncListButtons();
};

const syncListButtons = () => {
  $$('[data-action="toggle-list"]').forEach(btn => {
    const inList = State.myList.has(btn.dataset.videoId);
    btn.setAttribute('aria-pressed', String(inList));
    btn.innerHTML = `<i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i> ${inList ? 'Dans la liste' : 'Liste'}`;
  });
};

/* ─── Actions ─── */
const toggleMyList = (v) => {
  if (State.myList.has(v.id)) { State.myList.delete(v.id); toast('Retiré de ma liste', 'info'); }
  else { State.myList.add(v.id); toast('Ajouté à ma liste', 'success'); }
  saveMyList();
  syncListButtons();
  const inList = State.myList.has(v.id);
  const btn = $('#btnAddToList');
  if (btn) {
    btn.setAttribute('aria-pressed', String(inList));
    btn.innerHTML = `<i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i> ${inList ? 'Dans la liste' : 'Ma liste'}`;
  }
};

const downloadVideo = (id) => {
  if (!id) return;
  // Ouvre le Video Downloader
  window.location.href = `/tools/video/?url=${encodeURIComponent('https://youtu.be/' + id)}`;
};

/* ─── Player ─── */
const Player = {
  modal: null, box: null, frame: null, btnFs: null, btnRotate: null, iconFs: null, iconRotate: null, hint: null,
  init() {
    this.modal = $('#playerModal');
    this.box = $('#playerBox');
    this.frame = $('#playerFrame');
    this.btnFs = $('#btnFullscreen');
    this.btnRotate = $('#btnRotate');
    this.iconFs = $('#fsIcon');
    this.iconRotate = $('#rotateIcon');
    this.hint = $('#rotateHint');

    $('#btnClosePlayer').addEventListener('click', () => this.close());
    this.btnFs.addEventListener('click', () => this.toggleFullscreen());
    this.btnRotate.addEventListener('click', () => this.toggleLandscape());

    $('#btnAddToList').addEventListener('click', () => {
      if (State.currentPlayer.id) toggleMyList(State.currentPlayer);
    });

    $('#btnDownload').addEventListener('click', () => {
      if (State.currentPlayer.id) downloadVideo(State.currentPlayer.id);
    });

    $('#btnShare').addEventListener('click', async () => {
      const v = State.currentPlayer;
      if (!v.id) return;
      const url = `https://youtu.be/${v.id}`;
      try {
        if (navigator.share) await navigator.share({ title: v.title, url });
        else { await navigator.clipboard.writeText(url); toast('Lien copié !', 'success'); }
      } catch {}
    });

    this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        e.preventDefault();
        if (State.playerMode !== 'normal') this.resetMode();
        else this.close();
      }
      if (!this.isOpen()) return;
      if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
      if (e.key === 'r' || e.key === 'R') this.toggleLandscape();
    });
  },
  open(id, title, channel) {
    if (!id) return;
    State.currentPlayer = { id, title, channel };
    this.frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
    $('#playerTitle').textContent = title;
    $('#playerChannel').textContent = channel;
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const inList = State.myList.has(id);
    const b = $('#btnAddToList');
    b.setAttribute('aria-pressed', String(inList));
    b.innerHTML = `<i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i> ${inList ? 'Dans la liste' : 'Ma liste'}`;
    this.resetMode();
    setTimeout(() => $('#btnClosePlayer')?.focus(), 100);
    if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
  },
  close() {
    this.frame.src = '';
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.resetMode();
    State.currentPlayer = { id: null, title: '', channel: '' };
    try { screen.orientation?.unlock?.(); } catch {}
  },
  isOpen() { return this.modal.getAttribute('aria-hidden') === 'false'; },
  resetMode() {
    State.playerMode = 'normal';
    this.box.classList.remove('mode-fullscreen', 'mode-landscape');
    this.iconFs.className = 'fas fa-expand';
    this.iconRotate.className = 'fas fa-rotate';
    this.btnFs.setAttribute('aria-pressed', 'false');
    this.btnRotate.setAttribute('aria-pressed', 'false');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  },
  toggleFullscreen() {
    if (State.playerMode === 'fullscreen') return this.resetMode();
    State.playerMode = 'fullscreen';
    this.box.classList.remove('mode-landscape');
    this.box.classList.add('mode-fullscreen');
    this.iconFs.className = 'fas fa-compress';
    this.iconRotate.className = 'fas fa-rotate';
    this.btnFs.setAttribute('aria-pressed', 'true');
    this.btnRotate.setAttribute('aria-pressed', 'false');
    this.box.requestFullscreen?.().catch(() => {});
  },
  toggleLandscape() {
    if (State.playerMode === 'landscape') return this.resetMode();
    State.playerMode = 'landscape';
    this.box.classList.remove('mode-fullscreen');
    this.box.classList.add('mode-landscape');
    this.iconRotate.className = 'fas fa-rotate-left';
    this.iconFs.className = 'fas fa-expand';
    this.btnRotate.setAttribute('aria-pressed', 'true');
    this.btnFs.setAttribute('aria-pressed', 'false');
    this.hint.classList.add('show');
    setTimeout(() => this.hint.classList.remove('show'), 2500);
  }
};

/* ─── Chargement des données ─── */
const loadData = async () => {
  try {
    const res = await fetch('/api/watch/data', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.ok && Array.isArray(json.sections)) {
      State.data = { sections: json.sections };
    } else {
      throw new Error('Format invalide');
    }
  } catch (err) {
    console.warn('[watch] Impossible de charger les données:', err.message);
    State.data = { sections: [] };
  }
  render();
};

/* ─── Init ─── */
const init = async () => {
  applyTheme();
  $('#btnTheme').addEventListener('click', toggleTheme);

  // Chargement initial
  await loadData();

  // Délégation globale des clics
  document.addEventListener('click', (e) => {
    const thumbBtn = e.target.closest('.film-thumb-btn');
    if (thumbBtn) {
      e.preventDefault();
      Player.open(thumbBtn.dataset.videoId, thumbBtn.dataset.videoTitle, thumbBtn.dataset.videoChannel);
      return;
    }
    const playBtn = e.target.closest('.btn-play-main');
    if (playBtn) {
      e.preventDefault();
      Player.open(playBtn.dataset.videoId, playBtn.dataset.videoTitle, playBtn.dataset.videoChannel);
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      e.preventDefault();
      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.videoId;
      if (action === 'download') downloadVideo(id);
      else if (action === 'toggle-list') toggleMyList({ id, title: actionBtn.dataset.videoTitle, channel: actionBtn.dataset.videoChannel });
      return;
    }
    const chip = e.target.closest('.cat-chip');
    if (chip) {
      State.filterCategory = chip.dataset.category;
      $$('.cat-chip').forEach(c => {
        const on = c === chip;
        c.setAttribute('aria-pressed', String(on));
        c.setAttribute('aria-selected', String(on));
      });
      render();
      return;
    }
  });

  // Recherche live
  const input = $('#searchInput');
  input?.addEventListener('input', debounce((e) => {
    State.searchQuery = e.target.value;
    render();
  }, 180));
  $('#btnSearch')?.addEventListener('click', () => {
    State.searchQuery = input.value;
    render();
  });

  // Focus recherche
  $('#btnFocusSearch')?.addEventListener('click', () => input?.focus());
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input?.focus();
    }
  });

  // Ma liste
  $('#btnMyList')?.addEventListener('click', (e) => {
    State.showMyListOnly = !State.showMyListOnly;
    e.currentTarget.setAttribute('aria-pressed', String(State.showMyListOnly));
    if (State.showMyListOnly) toast(`Ma liste : ${State.myList.size} vidéo${State.myList.size > 1 ? 's' : ''}`, 'info');
    render();
  });

  // Rotation physique
  window.addEventListener('orientationchange', () => {
    if (State.playerMode === 'landscape' && window.orientation === 0) Player.resetMode();
  });

  // Deep-link
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) {
    const id = extractYoutubeId(hash);
    if (id) {
      for (const s of State.data.sections) {
        const it = s.items.find(i => i.id === id);
        if (it) { setTimeout(() => Player.open(it.id, it.title, it.channel), 500); break; }
      }
    }
  }

  Player.init();
  console.log('%c🎬 MARCO Watch chargé', 'color:#3b82f6;font-weight:700');
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
