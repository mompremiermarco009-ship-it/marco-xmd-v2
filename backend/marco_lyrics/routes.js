// backend/marco_lyrics/routes.js — API Marco Lyrics
const express = require('express');
const lyrics = require('./lib/lyrics');

const router = express.Router();

router.get('/api/lyrics/search', async (req, res) => {
    const q = req.query.q;
    const refresh = req.query.refresh === 'true';
    if (!q || !q.trim()) return res.status(400).json({ error: 'Requete vide' });

    try {
        const result = await lyrics.search(q.trim(), { refresh });
        res.json({
            ok: true,
            query: q.trim(),
            lyrics: result.lyrics || null,
            source: result.source || null,
            video: result.videoInfo,
            alternatives: result.alternatives || [],
            cached: result.cached || false
        });
    } catch (err) {
        console.error('lyrics error:', err.message);
        try {
            const yt = await lyrics.searchYouTubeOnly ? lyrics.searchYouTubeOnly(q.trim()) : null;
            if (yt) {
                return res.json({
                    ok: true,
                    query: q.trim(),
                    lyrics: null,
                    source: null,
                    video: yt,
                    alternatives: [],
                    warning: 'Paroles introuvables'
                });
            }
        } catch (e) {}
        res.status(404).json({ error: err.message });
    }
});

module.exports = router;
