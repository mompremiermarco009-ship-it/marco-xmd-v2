# MARCO-XMD v2

Application web évolutive et bot WhatsApp multi-session de **MARCO-XMD**.

> Ce document décrit le code réellement présent dans le dépôt. Il sert à la fois de documentation développeur, de guide de déploiement et de **prompt de reprise** pour une autre IA ou une autre équipe.

Dépôt : `mompremiermarco009-ship-it/marco-xmd-v2`

Production : <https://marco-xmd-v2.onrender.com>

---

## État de la refonte actuelle

La structure cible est maintenant active :

- `backend/` contient le serveur, le bot, les plugins, les API et les migrations ;
- `frontend/public/` contient l’interface et la PWA ;
- `frontend/public/tools/video/`, `tools/voice/` et `tools/lyrics/` contiennent les interfaces des outils ;
- `/` affiche `auth.html` ;
- `/index.html` est le dashboard protégé par le mode connecté ou invité ;
- `/tools/video/`, `/tools/voice/` et `/tools/lyrics/` sont les URL canoniques ;
- les anciennes URL `/video_downloader/`, `/voice_studio/` et `/marco_lyrics/` restent compatibles.

## 1. Vue d’ensemble

MARCO-XMD regroupe plusieurs fonctions dans un seul projet Node.js :

- une page d’accueil web installable comme PWA ;
- un compte utilisateur avec Supabase Auth ;
- un profil personnel ;
- un historique d’activité ;
- une barre d’annonce interne, prévue pour les publicités et actualités ;
- un Video Downloader ;
- un Voice Studio ;
- Marco Lyrics ;
- des mini-jeux ;
- un dashboard administrateur ;
- un bot WhatsApp basé sur Baileys ;
- des sessions WhatsApp multi-numéros ;
- un système de plugins et d’événements par session ;
- des endpoints de pairing code et de QR code.

Le produit doit être présenté d’abord comme une **application web évolutive**. Le bot WhatsApp est un service secondaire et doit rester présenté comme bientôt disponible dans l’interface publique tant qu’il n’est pas activé comme service commercial principal.

---

## 2. Architecture générale

```text
Navigateur / téléphone
        |
        v
Express - server.js
        |
        +-- Fichiers publics PWA : public/
        +-- Compte utilisateur : Supabase Auth + public.account.js
        +-- Dashboard admin : admin-routes.js
        +-- Bot WhatsApp : index.js + Baileys
        +-- Video Downloader : video_downloader/routes.js
        +-- Voice Studio : voice_studio/routes.js
        +-- Marco Lyrics : marco_lyrics/routes.js
        +-- Web Push historique : push-routes.js + push-service.js
        +-- Supabase : profils et historique d'activité
```

### Processus principal

1. Render installe les dépendances avec `build.sh`.
2. Render démarre `node backend/index.js`.
3. `index.js` initialise la map des sessions WhatsApp puis démarre Express via `server.js`.
4. Express sert les pages statiques et enregistre les routes API.
5. Si un numéro WhatsApp est configuré dans `number` ou fourni en argument, une session est démarrée.
6. Sans numéro configuré, le serveur web reste actif sans démarrer de bot.

---

## 3. Arborescence du dépôt

```text
.
├── backend/                         # Code serveur uniquement
│   ├── index.js                     # Point d'entrée : bot WhatsApp + serveur web
│   ├── server.js                    # Application Express, sécurité, routes générales
│   ├── config.json                  # Configuration générale du bot
├── package.json                     # Dépendances et scripts Node
├── package-lock.json                # Verrouillage des versions npm
├── build.sh                         # Build Render : npm, Python, yt-dlp
├── start.sh                         # Script de démarrage historique
├── Dockerfile                       # Variante Docker historique
├── render.yaml                      # Configuration Render
├── requirements.txt                 # Dépendances Python
├── number                            # Numéro WhatsApp optionnel pour l’auto-démarrage
│
├── frontend/public/                 # Interface web principale et PWA
│   ├── index.html                   # Accueil principal
│   ├── auth.html                    # Inscription et connexion
│   ├── profile.html                 # Profil utilisateur
│   ├── history.html                 # Historique personnel
│   ├── admin.html                   # Dashboard administrateur protégé
│   ├── status.html                  # État du bot
│   ├── games.html                   # Hub des mini-jeux
│   ├── 404.html                     # Page introuvable
│   ├── manifest.json                # Manifest PWA
│   ├── service-worker.js            # Cache PWA et notifications historiques
│   ├── account.js                   # Client commun Supabase côté navigateur
│   ├── i18n.js                      # Moteur de changement de langue
│   ├── translations.js              # Textes français, créole haïtien et anglais
│   ├── app-banner.js                # Barre d’annonce interne, sans popup système
│   ├── media/                       # Logos et icônes locales
│   ├── script/                      # Scripts des mini-jeux
│   ├── apk/MARCO-XMD.apk            # APK servi par le site
│   └── .well-known/assetlinks.json  # Association Android/TWA
│
├── admin-routes.js                  # API du dashboard admin
├── push-routes.js                   # API Web Push historique
├── push-service.js                  # Stockage et diffusion Web Push historique
│
├── video_downloader/                # Outil de téléchargement vidéo/audio
│   ├── routes.js                    # API info, téléchargement, streaming, suppression
│   ├── lib/ytdlp.js                 # Exécution de yt-dlp et nettoyage temporaire
│   ├── plugins/                     # Détection YouTube, Facebook, Instagram, TikTok
│   └── public/                      # Interface de l’outil
│
├── voice_studio/                    # Synthèse vocale
│   ├── routes.js                    # API statut, génération, streaming, téléchargement
│   ├── lib/tts.js                   # Appel edge-tts et fichiers temporaires
│   └── public/                      # Interface Voice Studio
│
├── marco_lyrics/                    # Recherche de paroles
│   ├── routes.js                    # API `/api/lyrics/search`
│   ├── lib/lyrics.js                # Recherche paroles et informations YouTube
│   └── public/                      # Interface Marco Lyrics
│
├── template/                        # Modèle copié pour chaque session WhatsApp
│   ├── plugins/                     # Commandes WhatsApp
│   ├── events/                      # Événements Baileys
│   └── utils/                       # Autorisations, configuration, uptime, clés
│
└── supabase/migrations/             # Schéma versionné Supabase
```

Les dossiers temporaires et les sessions ne doivent jamais être poussés dans Git. Les exclusions sont définies dans `.gitignore`.

---

## 4. Serveur Express : `server.js`

`server.js` crée l’application Express et centralise les protections et routes communes.

### Sécurité HTTP

- `helmet` ajoute les en-têtes de sécurité ;
- Content Security Policy limitée aux ressources nécessaires ;
- `trust proxy` est activé pour Render ;
- `x-powered-by` est désactivé ;
- les corps JSON et URL-encoded sont limités à 5 ko ;
- les fichiers cachés sont masqués par défaut ;
- les fichiers statiques sont mis en cache une heure en production.

### Limitation de débit

Trois limiteurs existent :

- API générale : 120 requêtes par 15 minutes ;
- connexion/pairing/QR : 8 tentatives par 10 minutes ;
- administration : 60 requêtes par 15 minutes.

### Configuration publique Supabase

`GET /api/config` renvoie uniquement :

- `SUPABASE_URL` ;
- `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`.

Une clé `service_role` ne doit jamais être placée dans le navigateur, dans Git ou dans `render.yaml`.

### Administration

- `POST /admin/login` vérifie `ADMIN_CODE` ;
- une session signée HMAC est stockée dans le cookie HTTP-only `marco_admin` ;
- la session dure une heure ;
- `/admin` et `/admin.html` sont protégés ;
- `/api/admin/*` est protégé par le même middleware.

### Bot WhatsApp

`startServer(startBot, sessions)` enregistre :

- `GET /pair?number=...` pour demander un code de pairing ;
- `GET /qr?number=...` pour demander un QR code ;
- `GET /status` pour la page d’état ;
- `GET /status?json=1` ou une requête JSON pour l’état des sessions.

### Pages et modules montés

- `/` sert `frontend/public/index.html` ;
- les fichiers de `frontend/public/` sont statiques ;
- `/tools/video/` sert l’interface Video Downloader ;
- `/tools/voice/` sert l’interface Voice Studio ;
- `/tools/lyrics/` sert l’interface Marco Lyrics ;
- toute route inconnue renvoie `public/404.html`.

---

## 5. Point d’entrée WhatsApp : `index.js`

### Sessions

Les sessions sont stockées dans une `Map` globale :

```js
sessions = new Map()
```

Chaque session utilise un identifiant numérique correspondant au numéro WhatsApp. Les fichiers d’authentification sont écrits dans :

```text
sessions/<numero>/
```

Ce dossier est sensible et ignoré par Git.

### Création d’une session

`ensureSessionDir(sessionID)` copie `backend/template/` dans `sessions/<sessionID>/` lorsqu’une nouvelle session est créée.

Chaque session reçoit ensuite :

- son `config.json` ;
- ses plugins ;
- ses événements ;
- ses identifiants Baileys ;
- ses journaux en mémoire.

### Chargement des plugins

`loadPlugins(sessionDir)` parcourt `sessions/<id>/plugins/*.js` et enregistre les modules qui exportent au minimum un nom de commande.

Lorsqu’un message commence par le préfixe configuré, par défaut `.`, le bot :

1. extrait le texte ;
2. ignore les messages trop anciens ;
3. applique `publicMode` ou la restriction propriétaire ;
4. extrait la commande et les arguments ;
5. cherche le plugin par nom ou alias ;
6. appelle `plugin.execute(sock, msg, args, command)` ;
7. ajoute une trace dans `global.botLogs`.

### Événements

Les fichiers de `sessions/<id>/events/` sont chargés dynamiquement. Un événement peut exporter :

```js
{
  name: 'connection.update',
  execute: async (sock, update, context) => {}
}
```

Le contexte fournit notamment les plugins, la configuration, la fonction `startBot` et la map des sessions.

### Reconnexion

Une session se reconnecte automatiquement après une fermeture, sauf si Baileys indique une déconnexion définitive (`loggedOut`).

---

## 6. Modèle de plugin WhatsApp

Les plugins actifs d’une session sont copiés depuis `template/plugins/`.

Familles de commandes présentes :

- administration de groupes : `add`, `kick`, `kickall`, `promote`, `demote`, `open`, `close`, `leaveall`, `groups`, `gstatus` ;
- informations et utilitaires : `menu`, `ping`, `info`, `stats`, `uptime`, `uuid`, `joke`, `lorem`, `translate`, `calc`, `color`, `base64`, `barcode` ;
- médias : `play`, `lyrics`, `sticker`, `togif`, `toimage`, `viewonce`, `gstatus` ;
- jeux : `memory`, `quiz`, `ttt`, `dice`, `flip` ;
- gestion bot : `pair`, `qr`, `repo`, `public`, `setprefix` ;
- gestion des messages et groupes : `reactstatus`, `block`, `jid`, `timer`, `promote`.

Les utilitaires de `template/utils/` fournissent :

- `auth.js` : contrôles propriétaire/admin de groupe/admin bot ;
- `superAuth.js` : super-administrateur ;
- `configManager.js` : lecture et mise à jour de configuration ;
- `apiKeys.js` : chargement de clés hors dépôt ;
- `uptime.js` : temps de fonctionnement et métriques.

Pour ajouter une commande :

1. créer un fichier `.js` dans `template/plugins/` ;
2. exporter `name`, éventuellement `alias` ou `aliases`, et `execute` ;
3. tester la commande sur une nouvelle session ;
4. ne jamais intégrer de clé secrète dans le plugin.

---

## 7. Compte utilisateur et Supabase

### Pages

- `/auth.html` : inscription et connexion e-mail/mot de passe ;
- `/profile.html` : lecture et modification du profil ;
- `/history.html` : affichage des 100 dernières activités ;
- `frontend/public/account.js` : client commun et fonctions d’accès.

### Fonctions de `frontend/public/account.js`

- `MarcoAccount.getClient()` : récupère la configuration `/api/config` puis crée le client Supabase ;
- `MarcoAccount.currentUser()` : récupère l’utilisateur courant ;
- `MarcoAccount.requireUser()` : redirige vers `/auth.html` si aucun utilisateur n’est connecté ;
- `MarcoAccount.addHistory(...)` : ajoute une activité dans `activity_history` ;
- `MarcoAccount.signOut()` : déconnexion puis redirection.

### Tables

La migration `supabase/migrations/20261002221600_marco_xmd_auth_profiles_history.sql` crée :

#### `public.profiles`

- `id` : même UUID que `auth.users.id` ;
- `display_name` ;
- `avatar_url` ;
- `bio` ;
- `created_at` ;
- `updated_at`.

#### `public.activity_history`

- `id` ;
- `user_id` ;
- `event_type` ;
- `title` ;
- `details` ;
- `metadata` JSONB ;
- `created_at`.

### Triggers et RLS

- un trigger crée automatiquement un profil après la création d’un utilisateur Auth ;
- un trigger met à jour `updated_at` ;
- RLS est activé sur les deux tables ;
- un utilisateur ne peut consulter ou modifier que ses propres lignes ;
- les fonctions de trigger ne sont pas exécutables directement par `public`, `anon` ou `authenticated`.

### Important

Le projet Supabase utilisé par MARCO-XMD est le projet configuré par `SUPABASE_URL` dans Render. Avant tout changement de schéma, vérifier que le projet ciblé est bien celui de MARCO-XMD et non un autre produit.

---

## 8. Barre d’annonce interne et notifications

### Fonction actuelle

La demande de notification Web Push a été retirée de l’accueil pour éviter les fenêtres système Android et les problèmes de superposition.

Le fichier `frontend/public/app-banner.js` gère désormais une **barre d’annonce dans l’application** :

- elle est masquée par défaut ;
- elle s’affiche seulement si `window.MARCO_APP_BANNER.enabled === true` et qu’un texte existe ;
- elle peut contenir un lien ;
- elle peut être fermée pour la session courante ;
- elle ne demande aucune permission Android ;
- elle ne déclenche aucune notification système.

Pour afficher une annonce, le code de configuration devra fournir par exemple :

```html
<script>
window.MARCO_APP_BANNER = {
  enabled: true,
  text: 'Nouvelle fonctionnalité disponible dans MARCO-XMD.',
  url: '/status.html',
  linkText: 'Découvrir'
};
</script>
```

Cette configuration doit être placée avant `/app-banner.js`.

### Code Web Push historique

`push-routes.js` et `push-service.js` existent encore côté serveur pour compatibilité avec l’ancien dashboard et les anciennes données. Le script public `push-client.js` a été supprimé de l’accueil et ne doit pas être réintroduit sans décision explicite.

Les variables VAPID restent présentes dans `render.yaml` pour l’ancien système. Elles peuvent être retirées plus tard après vérification qu’aucun autre écran ou administrateur ne les utilise.

---

## 9. Video Downloader

Le module `backend/video_downloader/` utilise `yt-dlp` et FFmpeg.

### Plateformes

Les plugins actuels détectent :

- YouTube ;
- Facebook ;
- Instagram ;
- TikTok.

### API

- `GET /api/video/info?url=...` : métadonnées ;
- `GET /api/video/download?url=...&format=mp4&quality=720` : téléchargement temporaire ;
- `GET /api/video/stream?token=...` : lecture avec support des ranges ;
- `GET /api/video/file?token=...` : téléchargement du fichier ;
- `DELETE /api/video/:token` : suppression.

Les fichiers temporaires sont nettoyés automatiquement toutes les cinq minutes lorsqu’ils ont plus de 30 minutes.

Les tokens sont aléatoires et les noms de fichiers sont filtrés avant accès au disque.

---

## 10. Voice Studio

Le module `backend/voice_studio/` utilise `edge-tts` et génère des fichiers MP3 temporaires.

### Voix configurées

- `fr-FR-HenriNeural` ;
- `fr-FR-RemyMultilingualNeural` ;
- `fr-FR-DeniseNeural` ;
- `fr-FR-VivienneMultilingualNeural` ;
- `fr-FR-EloiseNeural`.

### API

- `GET /api/voice/status` : disponibilité et liste des voix ;
- `POST /api/voice/generer` : génération audio ;
- `GET /api/voice/stream?token=...` : lecture MP3 ;
- `GET /api/voice/download?token=...` : téléchargement ;
- `DELETE /api/voice/:token` : suppression.

Le texte, la voix, le débit, le ton et le volume sont contrôlés côté serveur. Les MP3 temporaires sont nettoyés après 30 minutes.

---

## 11. Marco Lyrics

Le module `backend/marco_lyrics/` combine recherche de paroles et informations YouTube.

### API

```text
GET /api/lyrics/search?q=artiste+titre
```

Réponse possible :

- paroles ;
- source ;
- informations vidéo ;
- avertissement si seules les informations YouTube sont disponibles.

En cas d’échec complet, l’API renvoie une erreur HTTP 404.

---

## 12. Interface publique et PWA

### `frontend/public/index.html`

La page d’accueil contient :

- navbar responsive ;
- changement de thème ;
- changement de langue ;
- hero MARCO-XMD ;
- notice de mise à jour ;
- CTA APK ;
- outils disponibles ;
- fonctionnalités ;
- parcours en trois étapes ;
- espace personnel ;
- services dont le bot WhatsApp désactivé ;
- FAQ ;
- support et contacts ;
- barre d’annonce interne masquée par défaut.

### Langues

`frontend/public/i18n.js` prend en charge :

- français `fr` ;
- créole haïtien `ht` ;
- anglais `en`.

La langue est sauvegardée dans `localStorage` avec la clé `marco-lang`.

`frontend/public/translations.js` contient les textes utilisés par les attributs `data-i18n`.

### Service worker

`frontend/public/service-worker.js` :

- met en cache les pages principales ;
- supprime les anciens caches lors de l’activation ;
- laisse passer les appels API ;
- gère encore les événements Web Push historiques ;
- ouvre une URL lors d’un clic sur une ancienne notification.

Lorsqu’un fichier public est modifié de manière importante, augmenter `CACHE_NAME` et/ou ajouter une version dans l’URL du script afin d’éviter les anciens caches sur les téléphones.

---

## 13. Variables d’environnement

Variables Render attendues :

| Variable | Rôle | Sensibilité |
|---|---|---|
| `NODE_ENV` | Environnement Node | publique/non secrète |
| `PORT` | Port HTTP Render | publique/non secrète |
| `ADMIN_CODE` | Code du dashboard admin | secrète |
| `SUPABASE_URL` | URL du projet Supabase MARCO-XMD | publique |
| `SUPABASE_PUBLISHABLE_KEY` | Clé navigateur Supabase | publique mais à limiter par RLS |
| `VAPID_PUBLIC_KEY` | Ancien Web Push | publique |
| `VAPID_PRIVATE_KEY` | Ancien Web Push | secrète |
| `VAPID_SUBJECT` | Identité VAPID | non secrète |
| `VOICE_PORT` | Ancienne configuration Voice Studio | non secrète |

Ne jamais committer :

- `ADMIN_CODE` ;
- `VAPID_PRIVATE_KEY` ;
- clés privées ;
- cookies YouTube ;
- sessions WhatsApp ;
- abonnements de téléphones ;
- fichiers temporaires ;
- fichiers `.env`.

---

## 14. Installation locale

Prérequis :

- Node.js 20 ou plus récent ;
- npm ;
- Python 3 ;
- `ffmpeg` ;
- `yt-dlp` ;
- `edge-tts` pour Voice Studio.

Installation :

```bash
git clone https://github.com/mompremiermarco009-ship-it/marco-xmd-v2.git
cd marco-xmd-v2
npm install
pip3 install edge-tts yt-dlp
npm start
```

Le serveur écoute par défaut sur le port `10000` ou sur `PORT`.

Pour démarrer une session WhatsApp :

```bash
node backend/index.js 509XXXXXXXX
```

ou placer le numéro nettoyé dans le fichier `number`.

Sans numéro, seul le site web démarre.

---

## 15. Déploiement Render

`render.yaml` configure :

- un service Node nommé `marco-xmd` ;
- la région Oregon ;
- le plan free ;
- la branche `main` ;
- le build `bash build.sh` ;
- le démarrage `node backend/index.js` ;
- le health check `/` ;
- le déploiement automatique.

Le build installe :

1. les dépendances npm ;
2. `edge-tts` et `yt-dlp` Python ;
3. un binaire de secours `yt-dlp` dans `bin/`.

Après un push GitHub :

1. attendre le build Render ;
2. vérifier le statut `live` ;
3. tester `/`, `/auth.html`, `/profile.html`, `/history.html`, `/manifest.json` et l’APK ;
4. vérifier la console navigateur et le service worker sur mobile.

---

## 16. Tests et contrôles recommandés

### Syntaxe

```bash
node --check server.js
node --check index.js
node --check admin-routes.js
node --check video_downloader/routes.js
node --check voice_studio/routes.js
node --check marco_lyrics/routes.js
node --check public/account.js
node --check public/app-banner.js
node --check public/i18n.js
node --check public/service-worker.js
```

### Git

```bash
git diff --check
git status --short
git log -1 --oneline
```

### HTTP production

```bash
base='https://marco-xmd-v2.onrender.com'
for path in / /auth.html /profile.html /history.html /manifest.json /media/logo512.png /apk/MARCO-XMD.apk; do
  curl -fsS -o /dev/null -w "$path %{http_code}\n" "$base$path"
done
```

### Vérifications fonctionnelles

- la page d’accueil ne demande aucune permission système ;
- aucune référence publique à `push-client.js` ne subsiste ;
- la barre interne reste masquée sans configuration d’annonce ;
- les langues FR/HT/EN traduisent les clés principales ;
- un utilisateur non connecté est redirigé depuis profil/historique ;
- un utilisateur ne voit que ses données RLS ;
- `/api/config` ne renvoie jamais une clé `service_role` ;
- les fichiers temporaires sont supprimés ;
- le dashboard admin refuse l’accès sans `ADMIN_CODE`.

---

## 17. Points d’attention connus

### Dockerfile

Le déploiement Render actuel utilise `render.yaml`, `build.sh` et `node backend/index.js`. Le `Dockerfile` est une variante disponible pour un déploiement Docker et démarre `backend/index.js`. Render utilise actuellement `render.yaml`.

### Logos

L’accueil utilise les logos locaux de `frontend/public/media/`. Certaines pages de compte historiques utilisent encore une URL Postimg externe. Pour une fiabilité totale, migrer aussi ces pages vers `/media/logo512.png`.

### Web Push historique

Le backend Web Push et les variables VAPID sont encore présents pour compatibilité avec l’ancien dashboard, mais l’interface publique n’inscrit plus les téléphones et ne demande plus d’autorisation Android.

### Stockage éphémère Render

Les fichiers temporaires, sessions WhatsApp et téléchargements sont locaux au conteneur Render. Ils peuvent disparaître lors d’un redéploiement ou d’un redémarrage. Une persistance durable nécessiterait un stockage externe.

### Authentification Supabase

La clé publishable/anon est destinée au navigateur. La sécurité réelle repose sur les policies RLS. Toute nouvelle table doit avoir ses policies avant d’être utilisée en production.

---

# Prompt de reprise pour une autre IA

Tu travailles sur le dépôt `mompremiermarco009-ship-it/marco-xmd-v2`, une application Node.js/Express déployée sur Render à l’adresse <https://marco-xmd-v2.onrender.com>.

## Objectif produit

Maintenir MARCO-XMD comme une application web évolutive, moderne, mobile-first et installable en PWA/APK. Le site contient des outils publics, un compte Supabase, un profil, un historique, une barre d’annonces internes et un bot WhatsApp secondaire.

## Règles obligatoires

1. Lire ce README avant toute modification.
2. Inspecter le code réel avant d’inventer une fonction.
3. Ne pas présenter le bot WhatsApp comme le cœur du produit public.
4. Ne pas réintroduire de popup de notification Web Push ou de demande d’autorisation Android sans demande explicite.
5. Utiliser la barre `#marco-app-banner` pour les publicités et annonces dans l’application.
6. Ne jamais exposer une clé `service_role` dans le navigateur ou dans Git.
7. Ne jamais modifier un autre projet Supabase sans vérifier explicitement l’URL et le projet ciblé.
8. Conserver les policies RLS et les tester pour chaque nouvelle table.
9. Ne pas committer `sessions/`, `.env`, cookies, clés privées, téléchargements ou fichiers temporaires.
10. Ne pas promettre une fonctionnalité qui n’est pas réellement déployée.
11. Après chaque modification : vérifier la syntaxe, `git diff --check`, les routes HTTP, puis le déploiement Render.
12. Invalider le cache PWA lorsqu’un fichier public critique est modifié.

## Modules à respecter

- `server.js` : Express, sécurité, limites, routes et fichiers publics ;
- `index.js` : sessions Baileys, messages, plugins, reconnexion ;
- `frontend/public/account.js` : Supabase Auth, profil et historique ;
- `frontend/public/app-banner.js` : annonces internes sans permission système ;
- `backend/video_downloader/` : yt-dlp, fichiers temporaires et nettoyage ;
- `backend/voice_studio/` : edge-tts, MP3 temporaires et nettoyage ;
- `backend/marco_lyrics/` : recherche de paroles et fallback YouTube ;
- `backend/template/` : plugins et événements copiés dans chaque session ;
- `backend/supabase/migrations/` : schéma versionné et RLS.

## Procédure de travail

1. Identifier le fichier et le module concernés.
2. Lire les fichiers voisins et les routes correspondantes.
3. Vérifier les variables d’environnement nécessaires.
4. Implémenter une modification minimale et cohérente avec l’architecture existante.
5. Tester la syntaxe et les parcours concernés.
6. Vérifier que les secrets et données sensibles ne sont pas ajoutés.
7. Commiter avec un message explicite.
8. Pousser sur `main` si la demande autorise la publication.
9. Déployer Render et attendre le statut `live`.
10. Tester la production et résumer exactement les changements.

## Format attendu des réponses de maintenance

À la fin de chaque intervention, fournir :

- le problème trouvé ;
- les fichiers modifiés ;
- le comportement avant/après ;
- les tests effectués ;
- le commit ;
- le statut Render ;
- les éventuelles limites restantes.

Ne pas supprimer de données, de tables, de sessions ou de comptes sans confirmation explicite.
