# Rapport de tests — MARCO-XMD

**Date :** 6 octobre 2026  
**Production contrôlée :** `https://marco-xmd-v2.onrender.com`  
**Version contrôlée :** `db4b775`

## Résultats

| Contrôle | Résultat |
|---|---|
| `/`, `/auth.html`, `/index.html` | 200 ; auth et dashboard accessibles selon l’état de session |
| `/profile.html`, `/history.html`, `/games.html` | 200 |
| `/tools/video/`, `/tools/lyrics/`, `/tools/voice/` | 200 |
| `/manifest.json`, `/service-worker.js` | 200 |
| `/.well-known/assetlinks.json` | 200 |
| APK MARCO-XMD | 200 |
| Mode invité | OK ; accès dashboard via localStorage |
| Onglets connexion/inscription | OK ; champ nom et libellé changent |
| Thème clair/sombre | OK ; `data-theme` et localStorage changent |
| Langues FR/EN/HT | Options présentes ; bascule EN exercée |
| FAQ | Ouverture/fermeture exercée |
| Outils et jeux | Pages et contrôles principaux présents |
| Syntaxe JS/JSON | OK sur les fichiers contrôlés |
| CDN Font Awesome/Supabase | Aucun fallback CDN après la correction ciblée |

## Confidentialité d’interface

Aucune signature « Manus » ni mention backend/Supabase/RLS n’est conservée dans le texte utilisateur public contrôlé. Les logos et dépendances principales sont servis localement. Les fichiers temporaires et routes API sont exclus du cache PWA.

## Tests restant à faire avec accès réel

Une inscription/connexion avec un compte de test doit confirmer l’écriture et la lecture de `profiles` et `activity_history`. Le bouton Google nécessite l’activation du provider Google dans Supabase Production. Un téléchargement vidéo et une génération audio réels doivent être testés séparément. Enfin, l’APK doit être installé sur Android pour confirmer le plein écran TWA et Digital Asset Links.
