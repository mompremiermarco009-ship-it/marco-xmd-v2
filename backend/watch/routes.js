// backend/watch/routes.js — API MARCO Watch
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Charge les données (une seule fois au démarrage)
let DATA = { sections: [] };
try {
    const dataPath = path.join(__dirname, 'data.json');
    DATA = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
} catch (err) {
    console.error('⚠️  [watch] Impossible de charger data.json :', err.message);
}

// ═══════════════════════════════════════════════════════════
//  GET /api/watch/data — Retourne toutes les vidéos
// ═══════════════════════════════════════════════════════════
router.get('/api/watch/data', (req, res) => {
    res.json({
        ok: true,
        sections: DATA.sections || []
    });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/watch/search?q=... — Recherche live YouTube
// ═══════════════════════════════════════════════════════════
router.get('/api/watch/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
        return res.status(400).json({ ok: false, error: 'Requête vide' });
    }

    try {
        const yts = require('yt-search');
        const { videos } = await yts(q);
        const results = (videos || []).slice(0, 20).map(v => ({
            id: v.videoId,
            title: v.title,
            channel: v.author?.name || '',
            duration: v.timestamp || '',
            views: v.views || 0,
            thumbnail: v.thumbnail || '',
            live: !!v.ago && /stream|live/i.test(v.ago)
        }));
        res.json({ ok: true, query: q, results });
    } catch (err) {
        console.error('[watch] search error:', err.message);
        res.status(500).json({ ok: false, error: 'Erreur de recherche' });
    }
});

module.exports = router;
