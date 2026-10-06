# Audit mémoire — MARCO-XMD

**Date :** 6 octobre 2026  
**Version de référence :** `db4b775` — `fix: hide backend details and repair oauth flow`  
**Commits comparés :** `0680071` et `d77b3cb`

## Conclusion

La version distante conserve les fonctionnalités majeures des commits historiques : bot et plugins WhatsApp, jeux, Marco Lyrics, Voice Studio, Video Downloader, pages admin/status, PWA, APK et routes de compatibilité. La séparation `backend/` et `frontend/public/` est déjà intégrée dans `db4b775`.

Le parcours compte comprend l’inscription/connexion e-mail, Google OAuth, le mode invité, le profil personnalisé, l’historique d’activité et le dashboard. Les traductions FR/EN/HT, le thème clair/sombre, la barre d’annonce interne et le service worker sont présents.

Les suppressions repérées après `d77b3cb` concernent des documents de travail (`NOTIFICATIONS.md`, `PROMPT_REFONTE_MARCO_XMD.md`) et non des fonctions runtime. Les anciens chemins d’outils restent servis en compatibilité.

## PWA / Android

Le manifeste, le service worker, l’APK et `/.well-known/assetlinks.json` sont présents. Les routes publiques correspondantes répondent en production. La confirmation finale de Digital Asset Links doit être faite avec l’empreinte de l’APK réellement distribué/installé.

## Google OAuth

Le code appelle `signInWithOAuth` avec une redirection vers `/auth.html`. Lors du contrôle Supabase Production, le fournisseur Google retournait `false`; il faut donc l’activer dans Supabase et autoriser l’URL de production pour rendre le parcours opérationnel.

## Correction appliquée ensuite

Les pages publiques continuent d’utiliser les copies locales de Font Awesome 6.7.2 et Supabase JS. Les fallbacks CDN ont été retirés afin de rendre effective l’architecture indépendante des CDN instables, sans toucher à la migration backend/frontend déjà déployée.
