// backend/video_downloader/routes.js — API Video Downloader (jobs + SSE)
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const router = express.Router();

// ─── Chemin yt-dlp (binaire local en priorité) ───
const YTDLP_PATH = path.join(__dirname, '..', '..', 'bin', 'yt-dlp');
const YTDLP = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp';

// ─── Dossier temporaire ───
const DOWNLOAD_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ─── Charger plugins plateformes ───
const PLUGINS = [];
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir).forEach((file) => {
        if (!file.endsWith('.js')) return;
        PLUGINS.push(require(path.join(pluginsDir, file)));
    });
}

// ─── Map des jobs en cours ───
const jobs = new Map();

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════

function fmtDuration(sec) {
    if (!sec && sec !== 0) return '—';
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec / 60) % 60);
    const h = Math.floor(sec / 3600);
    return h > 0 ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
        : m + ':' + String(s).padStart(2, '0');
}

function fmtViews(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

function normalizeThumbnail(url) {
    if (!url) return '';
    return String(url)
        .replace(/\/vi_webp\//, '/vi/')
        .replace(/\.webp($|\?)/i, '.jpg$1');
}

function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
    if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
    return null;
}

function buildArgs(platform, format, outputTemplate, url) {
    const common = [
        '--newline', '--no-warnings', '--no-colors',
        '--progress-delta', '0.05',
        '--progress-template',
        'download:PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str)s',
        '--no-playlist'
    ];
    // Utilise les cookies si disponibles
    const cookiesFile = path.join(__dirname, 'cookies.txt');
    if (fs.existsSync(cookiesFile)) common.push('--cookies', cookiesFile);

    const simple = (sel) => [...common, '-f', sel, '--merge-output-format', 'mp4', '-o', outputTemplate, url];
    const audio = () => [...common, '-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputTemplate, url];

    if (format === 'mp3') return audio();

    // Plateformes sociales : format simple
    if (platform === 'tiktok' || platform === 'instagram' || platform === 'twitter') {
        return simple('best[ext=mp4]/best');
    }

    if (format === '1080') return simple('bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best');
    if (format === '720') return simple('bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best');
    if (format === 'auto') return simple('bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    return simple('bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best');
}

function parseProgress(chunk, cb) {
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
        let m = line.match(/PROGRESS:\s*([\d.]+)%\|([^|]*)\|([^|]*)\|([^|]*)/);
        if (m) {
            cb({ percent: parseFloat(m[1]), speed: m[2].trim(), eta: m[3].trim(), size: m[4].trim() });
            continue;
        }
        m = line.match(/\[download\]\s+([\d.]+)%/);
        if (m) cb({ percent: parseFloat(m[1]), speed: '', eta: '', size: '' });
    }
}

function runYtDlp(args, onProgress, jobId) {
    return new Promise((resolve, reject) => {
        console.log('[video] spawn ' + args.slice(0, 6).join(' '));
        const proc = spawn(YTDLP, args);
        let stdout = '', stderr = '';

        proc.stdout.on('data', (d) => {
            const s = d.toString();
            stdout += s;
            if (onProgress) parseProgress(s, onProgress);
        });
        proc.stderr.on('data', (d) => {
            const s = d.toString();
            stderr += s;
            if (onProgress) parseProgress(s, onProgress);
        });
        proc.on('close', (code) => {
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr.split('\n').slice(-2).join(' ') || ('exit ' + code)));
        });
        proc.on('error', reject);
    });
}

function broadcast(job, data) {
    const payload = 'data: ' + JSON.stringify(data) + '\n\n';
    job.clients.forEach((r) => { try { r.write(payload); } catch (e) {} });
}

// ═══════════════════════════════════════════════════════════
//  GET /api/video/info
// ═══════════════════════════════════════════════════════════
router.get('/api/video/info', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Parametre url manquant' });

    const plugin = PLUGINS.find((p) => p.match(url));
    if (!plugin) return res.status(400).json({ error: 'Plateforme non supportee' });

    try {
        const out = await runYtDlp(['-J', '--no-warnings', url]);
        const info = JSON.parse(out);
        res.json({
            title: info.title || 'Video',
            thumbnail: normalizeThumbnail(info.thumbnail || (info.thumbnails && info.thumbnails.slice(-1)[0] ? info.thumbnails.slice(-1)[0].url : '')),
            duration: fmtDuration(info.duration),
            views: fmtViews(info.view_count),
            author: info.uploader || info.channel || info.creator || '—',
            platform: plugin.name
        });
    } catch (err) {
        console.error('[video] info error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/video/download — cree un job
// ═══════════════════════════════════════════════════════════
router.post('/api/video/download', (req, res) => {
    const { url, format } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    const platform = detectPlatform(url);
    if (!platform) return res.status(400).json({ error: 'Plateforme non supportee' });

    const jobId = crypto.randomUUID();
    const targetDir = path.join(DOWNLOAD_DIR, jobId);
    fs.mkdirSync(targetDir, { recursive: true });

    const outputTemplate = path.join(targetDir, 'video.%(ext)s');
    const args = buildArgs(platform, format || 'auto', outputTemplate, url);

    const job = {
        id: jobId, status: 'running', percent: 0,
        speed: '', eta: '', size: '',
        downloadUrl: null, saveUrl: null, error: null,
        fileName: null, friendlyName: null, fileSize: 0,
        isVideo: true, clients: new Set(), platform
    };
    jobs.set(jobId, job);

    runYtDlp(args, (p) => {
        job.percent = p.percent;
        job.speed = p.speed;
        job.eta = p.eta;
        job.size = p.size;
        broadcast(job, { type: 'progress', percent: p.percent, speed: p.speed, eta: p.eta, size: p.size });
    }, jobId)
        .then(() => {
            const files = fs.readdirSync(targetDir);
            if (!files.length) throw new Error('Aucun fichier telecharge');
            const fileName = files[0];
            const fullPath = path.join(targetDir, fileName);
            const size = fs.statSync(fullPath).size;
            const isVideo = /\.(mp4|webm|mkv|mov)$/i.test(fileName);
            const ext = path.extname(fileName).slice(1);

            job.status = 'done';
            job.percent = 100;
            job.fileName = fileName;
            job.friendlyName = 'marco_' + jobId.slice(0, 6) + '.' + ext;
            job.fileSize = size;
            job.isVideo = isVideo;
            job.downloadUrl = '/api/video/stream/' + jobId;
            job.saveUrl = '/api/video/save/' + jobId;

            broadcast(job, {
                type: 'done',
                downloadUrl: job.downloadUrl,
                saveUrl: job.saveUrl,
                fileName: job.friendlyName,
                size, isVideo
            });

            setTimeout(() => {
                job.clients.forEach((r) => { try { r.end(); } catch (e) {} });
                job.clients.clear();
            }, 800);
        })
        .catch((err) => {
            fs.rmSync(targetDir, { recursive: true, force: true });
            job.status = 'error';
            job.error = err.message;
            broadcast(job, { type: 'error', message: err.message });
            setTimeout(() => {
                job.clients.forEach((r) => { try { r.end(); } catch (e) {} });
                job.clients.clear();
            }, 500);
        });

    res.json({ success: true, jobId });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/video/progress/:jobId — SSE
// ═══════════════════════════════════════════════════════════
router.get('/api/video/progress/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).end();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write('data: ' + JSON.stringify({ type: 'progress', percent: job.percent, speed: job.speed, eta: job.eta, size: job.size }) + '\n\n');

    if (job.status === 'done') {
        res.write('data: ' + JSON.stringify({ type: 'done', downloadUrl: job.downloadUrl, saveUrl: job.saveUrl, fileName: job.friendlyName, size: job.fileSize, isVideo: job.isVideo }) + '\n\n');
        setTimeout(() => res.end(), 200);
        return;
    }
    if (job.status === 'error') {
        res.write('data: ' + JSON.stringify({ type: 'error', message: job.error }) + '\n\n');
        setTimeout(() => res.end(), 200);
        return;
    }

    job.clients.add(res);
    req.on('close', () => job.clients.delete(res));
});

// ═══════════════════════════════════════════════════════════
//  GET /api/video/status/:jobId — polling fallback
// ═══════════════════════════════════════════════════════════
router.get('/api/video/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job introuvable' });
    res.json({
        status: job.status, percent: job.percent, speed: job.speed, eta: job.eta,
        downloadUrl: job.downloadUrl, saveUrl: job.saveUrl,
        fileName: job.friendlyName, size: job.fileSize, isVideo: job.isVideo, error: job.error
    });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/video/stream/:jobId — pour le preview
// ═══════════════════════════════════════════════════════════
router.get('/api/video/stream/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).end();
    const targetDir = path.join(DOWNLOAD_DIR, req.params.jobId);
    if (!fs.existsSync(targetDir)) return res.status(404).end();
    const files = fs.readdirSync(targetDir);
    if (!files.length) return res.status(404).end();

    const filePath = path.join(targetDir, files[0]);
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunkSize = (end - start) + 1;
        res.status(206);
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', job.isVideo ? 'video/mp4' : 'audio/mpeg');
        fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
        res.setHeader('Content-Length', total);
        res.setHeader('Content-Type', job.isVideo ? 'video/mp4' : 'audio/mpeg');
        fs.createReadStream(filePath).pipe(res);
    }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/video/save/:jobId — force download
// ═══════════════════════════════════════════════════════════
router.get('/api/video/save/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).send('Job introuvable');
    const targetDir = path.join(DOWNLOAD_DIR, req.params.jobId);
    if (!fs.existsSync(targetDir)) return res.status(404).send('Fichier introuvable');
    const files = fs.readdirSync(targetDir);
    if (!files.length) return res.status(404).send('Aucun fichier');

    const filePath = path.join(targetDir, files[0]);
    const friendly = job.friendlyName || 'video.mp4';
    res.setHeader('Content-Disposition', 'attachment; filename="' + friendly + '"');
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
});

// ═══════════════════════════════════════════════════════════
//  DELETE /api/video/:jobId
// ═══════════════════════════════════════════════════════════
router.delete('/api/video/:jobId', (req, res) => {
    const jobId = String(req.params.jobId).replace(/[^a-f0-9-]/gi, '');
    const targetDir = path.join(DOWNLOAD_DIR, jobId);
    try {
        if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
        jobs.delete(jobId);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/video/thumb — proxy thumbnails (TikTok/IG)
// ═══════════════════════════════════════════════════════════
router.get('/api/video/thumb', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).end('url manquant');

    const allowed = ['i.ytimg.com', 'img.youtube.com', 'ytimg.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tikcdn.com', 'cdninstagram.com', 'fbcdn.net'];
    let hostname;
    try { hostname = new URL(url).hostname; } catch { return res.status(400).end('url invalide'); }
    if (!allowed.some(d => hostname.includes(d))) return res.status(403).end('domaine non autorise');

    try {
        const axios = require('axios');
        const isTiktok = hostname.includes('tiktok') || hostname.includes('tikcdn');
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'
        };
        if (isTiktok) {
            headers['Referer'] = 'https://www.tiktok.com/';
            headers['Origin'] = 'https://www.tiktok.com';
        }
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxRedirects: 5, headers, decompress: true });
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Length', response.data.length);
        res.end(Buffer.from(response.data));
    } catch (err) {
        if (err.response && (err.response.status === 403 || err.response.status === 404)) return res.redirect(url);
        res.status(502).end('erreur');
    }
});

// ═══════════════════════════════════════════════════════════
//  Nettoyage auto toutes les 5 min (fichiers > 1h)
// ═══════════════════════════════════════════════════════════
setInterval(() => {
    const now = Date.now();
    if (!fs.existsSync(DOWNLOAD_DIR)) return;
    fs.readdirSync(DOWNLOAD_DIR).forEach((entry) => {
        const p = path.join(DOWNLOAD_DIR, entry);
        try {
            const stats = fs.statSync(p);
            if (now - stats.mtimeMs > 3600000) {
                fs.rmSync(p, { recursive: true, force: true });
                jobs.delete(entry);
                console.log('[video] cleanup ' + entry.slice(0, 8));
            }
        } catch (e) {}
    });
}, 5 * 60 * 1000);

module.exports = router;
