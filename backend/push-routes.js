const express = require('express');
const {
    getVapidConfig,
    upsertSubscription,
    removeSubscription
} = require('./push-service');

const router = express.Router();

router.get('/public-key', (req, res) => {
    const vapid = getVapidConfig();
    if (!vapid) return res.status(503).json({ error: 'Notifications non configurées.' });
    res.json({ publicKey: vapid.publicKey });
});

router.post('/subscribe', (req, res) => {
    try {
        const count = upsertSubscription(req.body);
        res.status(201).json({ success: true, subscribers: count });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/subscribe', (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
        return res.status(400).json({ error: 'Endpoint invalide.' });
    }
    res.json({ success: true, subscribers: removeSubscription(endpoint) });
});

module.exports = router;
