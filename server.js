const express = require("express");
const path = require("path");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const config = require("./config.json");

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Render/Cloudflare transmettent l'adresse IP du client via un proxy.
// La valeur 1 évite que le rate limiter utilise l'IP du proxy pour tout le monde.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Protection HTTP de base. Les ressources externes utilisées par la page
// sont autorisées explicitement par la CSP ci-dessous.
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
                imgSrc: ["'self'", "https:", "data:", "blob:"],
                connectSrc: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
            }
        },
        crossOriginEmbedderPolicy: false
    })
);

app.use(express.json({ limit: "5kb" }));
app.use(express.urlencoded({ extended: false, limit: "5kb" }));

const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de requêtes. Réessayez dans quelques minutes." }
});

const connectionLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: { error: "Trop de tentatives de connexion. Réessayez dans 10 minutes." }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de requêtes administratives. Réessayez plus tard." }
});

// Les fichiers statiques ne consomment pas le quota API. Les dotfiles restent
// masqués par défaut afin d'éviter l'exposition accidentelle de fichiers cachés.
app.use(express.static(PUBLIC_DIR, {
    dotfiles: "ignore",
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

// Alias propre pour l'interface d'administration. La protection d'accès doit
// être ajoutée avant la mise en production si cette page contient des données
// sensibles; le rate limiter ne remplace pas une authentification.
app.get("/admin", adminLimiter, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

// Dashboard admin : toutes les routes restent compatibles avec admin-routes.js.
// IMPORTANT : ajouter une authentification/session avant d'exposer ces routes
// sur Internet; la limitation seule ne suffit pas à protéger les données.
app.use("/api/admin", adminLimiter, require("./admin-routes.js"));

const startServer = (startBotFunc, sessionsMap) => {
    // ---------- Pairing code ----------
    app.get("/pair", connectionLimiter, async (req, res) => {
        let num = req.query.number;
        if (!num) return res.status(400).json({ error: "Numéro requis (?number=509...)" });

        num = String(num).replace(/[^0-9]/g, "");
        if (num.length < 10 || num.length > 15) {
            return res.status(400).json({ error: "Numéro invalide." });
        }

        let sock;
        try {
            if (sessionsMap.has(num) && sessionsMap.get(num).isReady) {
                return res.status(400).json({ error: "Cette session est déjà active." });
            }

            sock = await startBotFunc(num, { forcePairing: true });
            const code = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Timeout génération code")), 60_000);
                const onPairingCode = (codeValue) => {
                    clearTimeout(timeout);
                    resolve(codeValue);
                };
                sock.ev.once("pairing-code", onPairingCode);
            });

            res.json({ code });
        } catch (err) {
            console.error(`❌ Erreur Pairing pour ${num}:`, err);
            if (sock) {
                try { sock.end(); sock.ev.removeAllListeners(); } catch {}
                sessionsMap.delete(num);
            }
            res.status(500).json({ error: err.message || "Erreur pairing" });
        }
    });

    // ---------- QR Code ----------
    app.get("/qr", connectionLimiter, async (req, res) => {
        let num = req.query.number;
        if (!num) return res.status(400).json({ error: "Numéro requis" });

        num = String(num).replace(/[^0-9]/g, "");
        if (num.length < 10 || num.length > 15) {
            return res.status(400).json({ error: "Numéro invalide." });
        }

        const QRCode = require("qrcode");
        const oldSock = sessionsMap.get(num);
        if (oldSock) {
            try { oldSock.end(); oldSock.ev.removeAllListeners(); } catch {}
            sessionsMap.delete(num);
        }

        let sock;
        try {
            sock = await startBotFunc(num, { needQR: true });
            const rawQR = await sock._qrPromise;
            const qrImage = await QRCode.toDataURL(rawQR, { width: 300 });
            res.json({ qr: qrImage });
        } catch (err) {
            console.error(`❌ Erreur QR pour ${num}:`, err);
            if (sock) {
                try { sock.end(); sock.ev.removeAllListeners(); } catch {}
                sessionsMap.delete(num);
            }
            res.status(500).json({ error: err.message || "Erreur QR" });
        }
    });

    // ---------- Statut public ----------
    app.get("/status", generalApiLimiter, (req, res) => {
        if (req.query.json === "1" || req.headers.accept?.includes("application/json")) {
            const active = Array.from(sessionsMap.keys());
            return res.json({
                botName: config.botName,
                activeSessionsCount: active.length,
                sessions: active
            });
        }
        res.sendFile(path.join(PUBLIC_DIR, "status.html"));
    });

    // ---------- Outils ----------
    app.use("/video_downloader", generalApiLimiter, require("./video_downloader/routes.js"));
    app.use("/video_downloader", express.static(path.join(__dirname, "video_downloader", "public")));
    app.get("/video_downloader.html", (req, res) => res.redirect("/video_downloader/"));

    app.use("/voice_studio", generalApiLimiter, require("./voice_studio/routes.js"));
    app.use("/voice_studio", express.static(path.join(__dirname, "voice_studio", "public")));
    app.get("/voice_studio.html", (req, res) => res.redirect("/voice_studio/"));

    app.use("/marco_lyrics", generalApiLimiter, require("./marco_lyrics/routes.js"));
    app.use("/marco_lyrics", express.static(path.join(__dirname, "marco_lyrics", "public")));
    app.get("/marco_lyrics.html", (req, res) => res.redirect("/marco_lyrics/"));

    // ---------- Page d'accueil et 404 ----------
    app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
    app.use((req, res) => {
        res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
    });

    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`🌍 Serveur Web de ${config.botName} sur le port ${PORT}`);
    });
    server.on("error", (err) => console.error("❌ Erreur serveur:", err.message));

    return server;
};

module.exports = { app, startServer };
