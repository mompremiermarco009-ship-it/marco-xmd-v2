// backend/watch/proxy.js — Stream vidéo YouTube via yt-dlp
const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const router = express.Router();

const YTDLP_PATH = path.join(__dirname, '..', '..', 'bin', 'yt-dlp');
const YTDLP = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp';

// Cache des URLs directes (5 min) pour éviter de relancer yt-dlp à chaque seek
const urlCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getDirectUrl(videoId) {
    return new Promise((resolve, reject) => {
        const cached = urlCache.get(videoId);
        if (cached && Date.now() - cached.t < CACHE_TTL) return resolve(cached.url);

        const args = [
            '-f', 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
            '--no-playlist', '--no-warnings', '-g',
            'https://www.youtube.com/watch?v=' + videoId
        ];

        execFile(YTDLP, args, { timeout: 30000 }, (err, stdout) => {
            if (err) return reject(err);
            const url = String(stdout).trim().split('\n')[0];
            if (!url) return reject(new Error('No URL'));
            urlCache.set(videoId, { url, t: Date.now() });
            resolve(url);
        });
    });
}

// GET /api/watch/stream?id=VIDEO_ID
router.get('/stream', async (req, res) => {
    const videoId = String(req.query.id || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (!videoId) return res.status(400).json({ error: 'ID manquant' });

    try {
        const directUrl = await getDirectUrl(videoId);
        const parsed = new URL(directUrl);
        const client = parsed.protocol === 'https:' ? https : http;

        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        if (req.headers.range) headers.Range = req.headers.range;

        const upstream = client.get({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers
        }, (upstreamRes) => {
            if (upstreamRes.statusCode >= 400) {
                console.error('[stream] upstream', upstreamRes.statusCode);
                res.status(upstreamRes.statusCode).end();
                return;
            }

            res.status(upstreamRes.statusCode);
            ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag', 'cache-control']
                .forEach(h => { if (upstreamRes.headers[h]) res.setHeader(h, upstreamRes.headers[h]); });

            upstreamRes.pipe(res);
        });

        upstream.on('error', (err) => {
            console.error('[stream] upstream error:', err.message);
            if (!res.headersSent) res.status(502).end();
        });

        req.on('close', () => { try { upstream.destroy(); } catch {} });
    } catch (err) {
        console.error('[stream] error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Erreur streaming' });
    }
});

module.exports = router;
