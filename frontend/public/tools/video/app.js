// ═══════════════════════════════════════════════════════════
//  MARCO-XMD — Video Downloader (Option C : temporaire)
// ═══════════════════════════════════════════════════════════

let currentVideo = null;
let currentDownload = null;

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('marco-theme', next);
}

function toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast ' + type, 2500);
}

function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    return null;
}

async function analyzeVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    if (!url) return toast('Veuillez coller un lien', 'error');
    if (!detectPlatform(url)) return toast('Plateforme non supportée', 'error');

    // Cacher les résultats précédents
    document.getElementById('downloadResult').classList.remove('show');
    if (currentDownload) {
        fetch(`/api/video/${currentDownload.token}`, { method: 'DELETE' }).catch(() => {});
        currentDownload = null;
    }

    document.getElementById('loading').classList.add('show');
    document.getElementById('videoResult').classList.remove('show');
    document.getElementById('analyzeBtn').disabled = true;

    try {
        const res = await fetch(`/api/video/info?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Impossible d\'analyser la vidéo');
        }
        const data = await res.json();

        document.getElementById('videoThumb').style.display = '';
        const thumbUrl = data.thumbnail || '';
        const needProxy = thumbUrl.includes('tiktokcdn') || thumbUrl.includes('tikcdn') || thumbUrl.includes('cdninstagram') || thumbUrl.includes('fbcdn');
        document.getElementById('videoThumb').src = needProxy
            ? '/api/video/thumb?url=' + encodeURIComponent(thumbUrl)
            : thumbUrl;
        document.getElementById('videoTitle').textContent = data.title || 'Vidéo';
        document.getElementById('videoDuration').textContent = data.duration || '—';
        document.getElementById('videoViews').textContent = data.views || '—';
        document.getElementById('videoAuthor').textContent = data.author || '—';

        currentVideo = data;
        document.getElementById('videoResult').classList.add('show');
        toast('Vidéo analysée !', 'success');

        // Scroll vers le résultat
        setTimeout(() => {
            document.getElementById('videoResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('analyzeBtn').disabled = false;
    }
}

let currentJobId = null;

async function downloadVideo(format) {
    if (!currentVideo) return toast('Analysez d\'abord la video', 'error');

    const url = document.getElementById('videoUrl').value.trim();

    // Reset UI
    document.getElementById('downloadResult').classList.remove('show');
    document.getElementById('previewBox').style.display = 'none';
    document.getElementById('progressBox').style.display = 'block';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    document.getElementById('progressSpeed').textContent = '';
    document.getElementById('progressEta').textContent = '';
    document.querySelectorAll('.format-btn').forEach(b => b.disabled = true);

    // Ghost progress
    let ghostPercent = 0;
    const ghostInterval = setInterval(() => {
        if (ghostPercent < 90) {
            ghostPercent += (90 - ghostPercent) * 0.08;
            document.getElementById('progressFill').style.width = ghostPercent + '%';
            document.getElementById('progressPercent').textContent = ghostPercent.toFixed(1) + '%';
        }
    }, 200);

    try {
        const res = await fetch('/api/video/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Echec du telechargement');
        }
        const data = await res.json();
        currentJobId = data.jobId;

        // SSE
        const evtSource = new EventSource('/api/video/progress/' + currentJobId);
        let done = false;

        evtSource.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'progress') {
                clearInterval(ghostInterval);
                if (msg.percent > 0) {
                    document.getElementById('progressFill').style.width = msg.percent + '%';
                    document.getElementById('progressPercent').textContent = msg.percent.toFixed(1) + '%';
                }
                if (msg.speed) document.getElementById('progressSpeed').textContent = msg.speed;
                if (msg.eta) document.getElementById('progressEta').textContent = 'ETA ' + msg.eta;
            } else if (msg.type === 'done') {
                done = true;
                clearInterval(ghostInterval);
                evtSource.close();
                showPreview(msg);
            } else if (msg.type === 'error') {
                done = true;
                clearInterval(ghostInterval);
                evtSource.close();
                onDownloadFail(msg.message);
            }
        };

        evtSource.onerror = () => {
            clearInterval(ghostInterval);
            evtSource.close();
        };

        // Polling fallback
        const pollId = setInterval(async () => {
            if (done) { clearInterval(pollId); return; }
            try {
                const r = await fetch('/api/video/status/' + currentJobId);
                const s = await r.json();
                if (s.status === 'done') {
                    done = true; clearInterval(pollId); clearInterval(ghostInterval);
                    showPreview(s);
                } else if (s.status === 'error') {
                    done = true; clearInterval(pollId); clearInterval(ghostInterval);
                    onDownloadFail(s.error);
                }
            } catch (e) {}
        }, 1500);
        setTimeout(() => clearInterval(pollId), 300000);

    } catch (err) {
        clearInterval(ghostInterval);
        onDownloadFail(err.message);
    }
}

function showPreview(msg) {
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressPercent').textContent = '100%';
    document.getElementById('progressSpeed').textContent = '';
    document.getElementById('progressEta').textContent = '';

    setTimeout(() => {
        document.getElementById('progressBox').style.display = 'none';
        const video = document.getElementById('previewVideo');
        const audio = document.getElementById('previewAudio');
        const info = document.getElementById('previewInfo');
        const saveBtn = document.getElementById('saveBtn');

        const sizeMb = msg.size ? (msg.size / 1024 / 1024).toFixed(2) + ' Mo' : '';
        info.textContent = (msg.fileName || 'fichier') + (sizeMb ? ' • ' + sizeMb : '');

        if (msg.isVideo !== false) {
            video.src = msg.downloadUrl;
            video.style.display = 'block';
            audio.style.display = 'none';
            audio.pause();
            audio.removeAttribute('src');
        } else {
            audio.src = msg.downloadUrl;
            audio.style.display = 'block';
            video.style.display = 'none';
            video.pause();
            video.removeAttribute('src');
        }

        saveBtn.href = msg.saveUrl || msg.downloadUrl;
        saveBtn.setAttribute('download', msg.fileName || 'video');
        document.getElementById('previewBox').style.display = 'block';
        document.getElementById('previewBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.querySelectorAll('.format-btn').forEach(b => b.disabled = false);
        toast('Telechargement pret !', 'success');
    }, 400);
}

function onDownloadFail(message) {
    document.getElementById('progressBox').style.display = 'none';
    toast('Erreur : ' + message, 'error');
    document.querySelectorAll('.format-btn').forEach(b => b.disabled = false);
}

function downloadFile() {
    if (!currentDownload) return;
    window.location.href = currentDownload.downloadUrl;
    toast('📥 Téléchargement vers votre appareil...', 'success');
}

function resetDownload() {
    // Supprimer le fichier du serveur
    if (currentDownload && currentDownload.token) {
        fetch(`/api/video/${currentDownload.token}`, { method: 'DELETE' }).catch(() => {});
    }

    const player = document.getElementById('dlPlayer');
    if (player) {
        player.pause();
        player.src = '';
    }

    currentDownload = null;
    currentVideo = null;

    document.getElementById('downloadResult').classList.remove('show');
    document.getElementById('videoResult').classList.remove('show');
    document.getElementById('videoUrl').value = '';
    document.getElementById('videoUrl').focus();
}

// Nettoyage à la fermeture de la page
window.addEventListener('beforeunload', () => {
    if (currentDownload && currentDownload.token) {
        navigator.sendBeacon(`/api/video/${currentDownload.token}`);
    }
});

// ═══════════════════════════════════════════════════════════
//  AUTO-START depuis les paramètres URL
//  Ex: /video_downloader/?url=https://youtu.be/...&format=mp4&quality=720
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    const format = params.get('format');
    const quality = params.get('quality');

    if (url) {
        const input = document.getElementById('videoUrl');
        if (input) {
            input.value = url;

            // Attendre 300ms pour que tout soit bien chargé
            setTimeout(async () => {
                await analyzeVideo();

                // Si format + quality fournis → lancer le téléchargement
                if (format && quality) {
                    setTimeout(() => {
                        downloadVideo(format, quality);
                    }, 1500);
                }
            }, 300);
        }
    }
});
