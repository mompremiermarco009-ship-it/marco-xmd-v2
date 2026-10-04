const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'tmp');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════
//  Gestion des cookies YouTube
// ═══════════════════════════════════════════════════════════
function ensureCookies() {
    // 1. Si le fichier existe déjà → OK
    if (fs.existsSync(COOKIES_FILE)) {
        console.log(`✅ Cookies présents : ${COOKIES_FILE}`);
        return true;
    }

    // 2. Sinon, chercher dans la variable d'environnement
    const b64 = process.env.YOUTUBE_COOKIES_B64;
    if (!b64) {
        console.log('⚠️  Aucun cookie YouTube trouvé (ni fichier, ni variable d\'env)');
        return false;
    }

    try {
        const content = Buffer.from(b64, 'base64').toString('utf-8');
        fs.writeFileSync(COOKIES_FILE, content);
        console.log(`✅ Cookies décodés depuis YOUTUBE_COOKIES_B64 → ${COOKIES_FILE}`);
        return true;
    } catch (err) {
        console.error('❌ Erreur décodage cookies :', err.message);
        return false;
    }
}

// Appeler au démarrage
ensureCookies();

// ═══════════════════════════════════════════════════════════
//  Localisation des binaires
// ═══════════════════════════════════════════════════════════
function findYtdlp() {
    const localBin = path.join(__dirname, '..', '..', 'bin', 'yt-dlp');
    if (fs.existsSync(localBin)) {
        try { fs.chmodSync(localBin, 0o755); } catch {}
        return localBin;
    }
    const which = spawnSync('which', ['yt-dlp'], { encoding: 'utf-8' });
    if (which.status === 0 && which.stdout.trim()) return 'yt-dlp';

    const possiblePaths = [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        path.join(process.env.HOME || '/root', '.local', 'bin', 'yt-dlp')
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            try { fs.chmodSync(p, 0o755); } catch {}
            return p;
        }
    }
    return 'yt-dlp';
}

const YTDLP = findYtdlp();

function findFfmpeg() {
    const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf-8' });
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
    for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
        if (fs.existsSync(p)) return p;
    }
    return 'ffmpeg';
}

const FFMPEG = findFfmpeg();

function detectJsRuntime() {
    try {
        const deno = spawnSync('deno', ['--version'], { stdio: 'ignore' });
        if (deno.status === 0) return 'deno';
    } catch {}
    return 'node';
}

const JS_RUNTIME = detectJsRuntime();

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function check() {
    return new Promise((resolve) => {
        const p = spawn(YTDLP, ['--version']);
        p.on('close', (code) => resolve(code === 0));
        p.on('error', () => resolve(false));
    });
}

function getInfo(url) {
    return new Promise((resolve, reject) => {
        const args = ['-J', '--no-playlist', '--no-warnings', '--js-runtimes', JS_RUNTIME, url];
        if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
        args.push('--ffmpeg-location', FFMPEG);

        const yt = spawn(YTDLP, args);
        let out = '', err = '';
        yt.stdout.on('data', (d) => (out += d.toString()));
        yt.stderr.on('data', (d) => (err += d.toString()));
        yt.on('error', (e) => reject(new Error(`yt-dlp introuvable (${YTDLP}) : ${e.message}`)));
        yt.on('close', (code) => {
            if (code !== 0) return reject(new Error(err.trim() || `yt-dlp code ${code}`));
            try { resolve(JSON.parse(out)); }
            catch { reject(new Error('Réponse JSON invalide')); }
        });
    });
}

function download({ url, formatArgs, token }) {
    return new Promise((resolve, reject) => {
        const outTpl = path.join(OUTPUT_DIR, `${token}.%(ext)s`);
        const args = [...formatArgs];
        args.push('--js-runtimes', JS_RUNTIME);
        if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
        args.push('--ffmpeg-location', FFMPEG);
        args.push('--no-playlist', '-o', outTpl, url);

        const before = new Set(fs.readdirSync(OUTPUT_DIR));

        const proc = spawn(YTDLP, args);
        proc.stdout.on('data', (d) => process.stdout.write(d));
        proc.stderr.on('data', (d) => process.stderr.write(d));

        proc.on('error', (e) => reject(new Error(`Erreur spawn yt-dlp : ${e.message}`)));
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(`yt-dlp a échoué (code ${code})`));

            const after = fs.readdirSync(OUTPUT_DIR);
            const created = after.find((f) => !before.has(f) && f.startsWith(token));
            if (!created) return reject(new Error('Fichier non créé'));

            const fullPath = path.join(OUTPUT_DIR, created);
            const stat = fs.statSync(fullPath);
            const ext = path.extname(created).slice(1);
            resolve({ token, filename: created, path: fullPath, size: stat.size, ext });
        });
    });
}

function removeByToken(token) {
    try {
        const safe = String(token).replace(/[^a-f0-9]/gi, '');
        const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith(safe));
        files.forEach((f) => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
        return true;
    } catch { return false; }
}

function cleanup(maxAgeMs = 30 * 60 * 1000) {
    try {
        const now = Date.now();
        let count = 0;
        fs.readdirSync(OUTPUT_DIR).forEach((f) => {
            const full = path.join(OUTPUT_DIR, f);
            try {
                const stat = fs.statSync(full);
                if (now - stat.mtimeMs > maxAgeMs) { fs.unlinkSync(full); count++; }
            } catch {}
        });
        if (count > 0) console.log(`🧹 ${count} fichier(s) supprimé(s)`);
    } catch {}
}

module.exports = {
    check, getInfo, download, removeByToken, cleanup,
    OUTPUT_DIR, COOKIES_FILE, JS_RUNTIME, YTDLP, FFMPEG,
    ensureCookies
};
