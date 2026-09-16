const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'tmp');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Créer le dossier tmp s'il n'existe pas
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Détecter le runtime JS pour yt-dlp (deno prioritaire, sinon node)
function detectJsRuntime() {
    try {
        const deno = spawnSync('deno', ['--version'], { stdio: 'ignore' });
        if (deno.status === 0) return 'deno';
    } catch {}
    return 'node';
}

const JS_RUNTIME = detectJsRuntime();

// Vérifie que yt-dlp est disponible
function check() {
    return new Promise((resolve) => {
        const p = spawn('yt-dlp', ['--version']);
        p.on('close', (code) => resolve(code === 0));
        p.on('error', () => resolve(false));
    });
}

// Récupère les métadonnées d'une vidéo
function getInfo(url) {
    return new Promise((resolve, reject) => {
        const args = ['-J', '--no-playlist', '--no-warnings', '--js-runtimes', JS_RUNTIME, url];
        if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);

        const yt = spawn('yt-dlp', args);
        let out = '', err = '';

        yt.stdout.on('data', (d) => (out += d.toString()));
        yt.stderr.on('data', (d) => (err += d.toString()));
        yt.on('error', (e) => reject(new Error(`yt-dlp introuvable : ${e.message}`)));
        yt.on('close', (code) => {
            if (code !== 0) return reject(new Error(err.trim() || `yt-dlp code ${code}`));
            try { resolve(JSON.parse(out)); }
            catch { reject(new Error('Réponse JSON invalide de yt-dlp')); }
        });
    });
}

// Télécharge une vidéo dans tmp/ avec un token unique
function download({ url, formatArgs, token }) {
    return new Promise((resolve, reject) => {
        const outTpl = path.join(OUTPUT_DIR, `${token}.%(ext)s`);
        const args = [...formatArgs];
        args.push('--js-runtimes', JS_RUNTIME);
        if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
        args.push('--no-playlist', '-o', outTpl, url);

        const before = new Set(fs.readdirSync(OUTPUT_DIR));

        const proc = spawn('yt-dlp', args);
        proc.stdout.on('data', (d) => process.stdout.write(d));
        proc.stderr.on('data', (d) => process.stderr.write(d));

        proc.on('error', (e) => reject(new Error(e.message)));
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(`yt-dlp a échoué (code ${code})`));

            const after = fs.readdirSync(OUTPUT_DIR);
            const created = after.find((f) => !before.has(f) && f.startsWith(token));

            if (!created) return reject(new Error('Fichier non créé'));

            const fullPath = path.join(OUTPUT_DIR, created);
            const stat = fs.statSync(fullPath);
            const ext = path.extname(created).slice(1);

            resolve({
                token,
                filename: created,
                path: fullPath,
                size: stat.size,
                ext
            });
        });
    });
}

// Supprime les fichiers d'un token
function removeByToken(token) {
    try {
        const safe = String(token).replace(/[^a-f0-9]/gi, '');
        const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith(safe));
        files.forEach((f) => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
        return true;
    } catch { return false; }
}

// Nettoie les fichiers > maxAgeMs (défaut 30 min)
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
        if (count > 0) console.log(`🧹 ${count} fichier(s) vidéo supprimé(s)`);
    } catch {}
}

module.exports = {
    check,
    getInfo,
    download,
    removeByToken,
    cleanup,
    OUTPUT_DIR,
    COOKIES_FILE,
    JS_RUNTIME
};
