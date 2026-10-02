# Notifications mobiles MARCO-XMD

Le dépôt utilise les **Web Push Notifications** de la PWA. Cela permet d’envoyer une notification à chaque téléphone qui a ouvert le site et accepté explicitement les notifications.

## Configuration

Générer une paire VAPID une seule fois :

```bash
npx web-push generate-vapid-keys
```

Ajouter ensuite ces variables d’environnement au service Render :

- `VAPID_PUBLIC_KEY` : clé publique générée
- `VAPID_PRIVATE_KEY` : clé privée générée — ne jamais la publier
- `VAPID_SUBJECT` : une adresse valide, par exemple `mailto:admin@marco-xmd.com`
- `ADMIN_CODE` : déjà requis pour accéder au dashboard

Les champs VAPID sont déjà déclarés dans `render.yaml` avec `sync: false` pour que les secrets restent propres à l’environnement de déploiement.

## Utilisation

1. Ouvrir `https://marco-xmd-v2.onrender.com/` sur le téléphone.
2. Appuyer sur **Activer** dans le panneau de notifications et accepter la permission du navigateur.
3. Se connecter à `/admin` avec le code administrateur.
4. Dans **Notifications téléphone**, saisir le titre et le message, puis cliquer sur **Envoyer à tous les téléphones**.

Les abonnements sont stockés dans `data/push-subscriptions.json`, fichier exclu de Git. Les endpoints expirés sont automatiquement supprimés après un échec HTTP 404/410.

> Sur le plan gratuit Render, le système de fichiers local peut être réinitialisé lors d’un redéploiement ou d’un redémarrage. Pour conserver durablement les abonnements à grande échelle, remplacer ce fichier par une base persistante (PostgreSQL, Redis ou autre stockage externe).

## Compatibilité

- Chrome/Edge/Firefox sur Android et ordinateur : pris en charge.
- iOS/iPadOS 16.4+ : installer d’abord la PWA sur l’écran d’accueil, puis activer les notifications.
- Un utilisateur peut retirer son consentement depuis les réglages de son navigateur ou de son téléphone.
