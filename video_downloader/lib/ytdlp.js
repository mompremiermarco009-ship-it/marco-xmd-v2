const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'tmp');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Trouver yt-dlp (plusieurs emplacements) ───
function findYtdlp() {
    // 1. Chemin explicite dans bin/ (téléchargé par build.sh)
    const localBin = path.join(__dirname, '..', '..', 'bin', 'yt-dlp');
    if (fs.existsSync(localBin)) {
        try { fs.chmodSync(localBin, 0o755); } catch {}
        console.log(`✅ yt-dlp trouvé : ${localBin}`);
        return localBin;
    }

    // 2. Dans le PATH (yt-dlp installé via pip)
    const which = spawnSync('which', ['yt-dlp'], { encoding: 'utf-8' });
    if (which.status === 0 && which.stdout.trim()) {
        console.log(`✅ yt-dlp dans le PATH : ${which.stdout.trim()}`);
        return 'yt-dlp';
    }

    // 3. Chercher dans les emplacements pip classiques
    const possiblePaths = [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        path.join(process.env.HOME || '/root', '.local', 'bin', 'yt-dlp')
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            try { fs.chmodSync(p, 0o755); } catch {}
            console.log(`✅ yt-dlp trouvé : ${p}`);
            return p;
        }
    }

    console.log('⚠️  yt-dlp introuvable, on utilisera "yt-dlp" par défaut');
    return 'yt-dlp';
}

const YTDLP = findYtdlp();

// ─── Trouver ffmpeg ───
function findFfmpeg() {
    const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf-8' });
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();

    const possiblePaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    return 'ffmpeg';
}

const FFMPEG = findFfmpeg();

// Détecter le runtime JS (deno prioritaire, sinon node)
function detectJsRuntime() {
    try {
        const deno = spawnSync('deno', ['--version'], { stdio: 'ignore' });
        if (deno.status === 0) return 'deno';
    } catch {}
    return 'node';
}

const JS_RUNTIME = detectJsRuntime();

// ─── Vérification ───
function check() {
    return new Promise((resolve) => {
        const p = spawn(YTDLP, ['--version']);
        p.on('close', (code) => resolve(code === 0));
        p.on('error', () => resolve(false));
    });
}

// ─── Métadonnées ───
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

// ─── Téléchargement ───
function download({ url, formatArgs, token }) {
    return new Promise((resolve, reject) => {
        const outTpl = path.join(OUTPUT_DIR, `${token}.%(ext)s`);
        const args = [...formatArgs];
        args.push('--js-runtimes', JS_RUNTIME);
        if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
        args.push('--ffmpeg-location', FFMPEG);
        args.push('--no-playlist', '-o', outTpl, url);

        const before = new Set(fs.readdirSync(OUTPUT_DIR));

        console.log(`⬇️  yt-dlp: ${YTDLP}`);
        console.log(`📁 Output: ${outTpl}`);
        console.log(`🎬 ffmpeg: ${FFMPEG}`);

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

// ─── Suppression ───
function removeByToken(token) {
    try {
        const safe = String(token).replace(/[^a-f0-9]/gi, '');
        const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith(safe));
        files.forEach((f) => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
        return true;
    } catch { return false; }
}

// ─── Nettoyage ───
function cleanup(maxAgeMs = 30 * 60 * 1000) {
    try {
        const now = Date.now();
        let count = 0;
        fs.readdirSync(OUTPUT_DIR).forEach((f) => {
            const full = path.join(OUTPUT_DIR, f);
            try {
                const stat = fs.statSync(full);
                if (now - stat.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(full);
                    count++;
                }
            } catch {}
        });
        if (count > 0) console.log(`🧹 ${count} fichier(s) supprimé(s)`);
    } catch {}
}

module.exports = {
    check, getInfo, download, removeByToken, cleanup,
    OUTPUT_DIR, COOKIES_FILE, JS_RUNTIME,
    YTDLP, FFMPEG
};
