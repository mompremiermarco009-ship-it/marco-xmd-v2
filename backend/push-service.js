const fs = require('fs-extra');
const path = require('path');
const webpush = require('web-push');

const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

function getVapidConfig() {
    const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
    const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
    const subject = String(process.env.VAPID_SUBJECT || '').trim();
    if (!publicKey || !privateKey || !subject) return null;
    return { publicKey, privateKey, subject };
}

function configureWebPush() {
    const vapid = getVapidConfig();
    if (vapid) webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    return vapid;
}

function readSubscriptions() {
    try {
        const value = fs.readJsonSync(SUBSCRIPTIONS_FILE);
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writeSubscriptions(subscriptions) {
    fs.ensureDirSync(DATA_DIR);
    fs.writeJsonSync(SUBSCRIPTIONS_FILE, subscriptions, { spaces: 2 });
}

function isValidSubscription(subscription) {
    return Boolean(
        subscription &&
        typeof subscription.endpoint === 'string' &&
        subscription.endpoint.startsWith('https://') &&
        subscription.keys &&
        typeof subscription.keys.p256dh === 'string' &&
        typeof subscription.keys.auth === 'string'
    );
}

function upsertSubscription(subscription) {
    if (!isValidSubscription(subscription)) throw new Error('Abonnement push invalide.');
    const subscriptions = readSubscriptions().filter(item => item.endpoint !== subscription.endpoint);
    subscriptions.push({ ...subscription, updatedAt: new Date().toISOString() });
    writeSubscriptions(subscriptions);
    return subscriptions.length;
}

function removeSubscription(endpoint) {
    const subscriptions = readSubscriptions();
    const remaining = subscriptions.filter(item => item.endpoint !== endpoint);
    if (remaining.length !== subscriptions.length) writeSubscriptions(remaining);
    return remaining.length;
}

async function broadcastNotification({ title, body, url = '/', icon = '/media/logo192.png' }) {
    const vapid = configureWebPush();
    if (!vapid) {
        const error = new Error('Notifications non configurées : définissez VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT.');
        error.code = 'PUSH_NOT_CONFIGURED';
        throw error;
    }

    const payload = JSON.stringify({
        title: String(title || 'MARCO-XMD').slice(0, 100),
        body: String(body || '').slice(0, 300),
        url: typeof url === 'string' && url.startsWith('/') ? url : '/',
        icon
    });
    const current = readSubscriptions();
    const expired = new Set();
    let sent = 0;
    let failed = 0;

    await Promise.all(current.map(async subscription => {
        try {
            await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 24 });
            sent += 1;
        } catch (error) {
            failed += 1;
            if (error.statusCode === 404 || error.statusCode === 410) expired.add(subscription.endpoint);
            console.error('❌ Envoi push échoué:', error.statusCode || error.message);
        }
    }));

    if (expired.size) writeSubscriptions(current.filter(item => !expired.has(item.endpoint)));
    return { total: current.length, sent, failed, removed: expired.size };
}

module.exports = {
    configureWebPush,
    getVapidConfig,
    readSubscriptions,
    upsertSubscription,
    removeSubscription,
    broadcastNotification
};
