# Prompt de refonte MARCO-XMD — version alignée avec l’implémentation actuelle

## Objectif général

Transformer le positionnement de MARCO-XMD : ne plus présenter le produit comme un simple bot WhatsApp, mais comme une **application web évolutive**, installable comme une PWA et pouvant être distribuée sous forme d’APK Android.

Le bot WhatsApp devient un service secondaire, affiché comme **bientôt disponible**. Les outils web, le compte utilisateur, les notifications et les futurs services deviennent le cœur de l’application.

> Ne pas promettre une fonctionnalité qui n’est pas encore déployée. Le lien APK ne doit être activé que si le fichier `/apk/MARCO-XMD.apk` existe réellement sur le serveur.

---

## État technique déjà ajouté

Le dépôt cible est : `mompremiermarco009-ship-it/marco-xmd-v2`.

Fonctionnalités déjà présentes dans le code :

- PWA avec service worker ;
- notifications mobiles Web Push ;
- dashboard admin séparé et protégé par son mécanisme actuel ;
- page `/auth.html` pour inscription et connexion Supabase Auth ;
- page `/profile.html` pour le profil utilisateur ;
- page `/history.html` pour l’historique personnel ;
- client commun dans `public/account.js` ;
- migrations versionnées dans `supabase/migrations/` ;
- RLS activé sur les nouvelles tables du compte.

L’authentification publique ne doit pas remplacer ni casser l’authentification admin existante.

---

## Reconstruction Supabase — obligatoire avant la mise en production

Le projet Supabase actuellement connecté correspond à un autre produit. **Ne pas utiliser, vider ou modifier ce projet sans confirmation explicite.**

Créer un nouveau projet Supabase dédié à MARCO-XMD, par exemple :

- Nom : `MARCO-XMD Production` ;
- Région : choisir la région la plus proche des utilisateurs ;
- Auth : e-mail et mot de passe activés ;
- confirmation e-mail activée en production ;
- URL de redirection ajoutée :
  - `https://<domaine-marco-xmd>/auth.html` ;
  - URL Render de préproduction si nécessaire.

Configurer Render avec des variables d’environnement :

- `SUPABASE_URL` ;
- `SUPABASE_PUBLISHABLE_KEY`.

Ne jamais mettre une clé `service_role` dans le navigateur ou dans Git.

### Schéma du nouveau projet

Appliquer la migration versionnée du dépôt, adaptée au nouveau projet :

```text
supabase/migrations/20261002221600_marco_xmd_auth_profiles_history.sql
```

Elle doit créer :

- `public.profiles` : profil relié à `auth.users` ;
- `public.activity_history` : historique appartenant à l’utilisateur ;
- trigger de création automatique du profil ;
- policies RLS `select`, `insert` et `update` limitées à `auth.uid()`.

Le nouveau projet doit commencer avec un schéma propre. Ne pas recopier les anciennes tables `users`, `orders`, `conversations`, `videos`, `prompts`, `messages`, `notifications` et `user_settings` tant que leur modèle métier et leurs policies RLS n’ont pas été validés.

---

# Refonte éditoriale de l’accueil

## 1. Hero

Titre inchangé :

> Bienvenue sur MARCO-XMD

Sous-titre français :

> Une application web évolutive, rapide et moderne. Installez-la sur votre téléphone et profitez d’une expérience fluide, sans dépendre d’un store.

Badges :

- Gratuit ;
- Web évolutif ;
- Sécurisé.

Traductions :

- HT : `Yon aplikasyon wèb evolisyonè, rapid ak modèn. Enstale l sou telefòn ou epi pwofite yon eksperyans ki senp, san ou pa bezwen pase nan yon store.`
- EN : `An evolving, fast and modern web application. Install it on your phone and enjoy a smooth experience without depending on an app store.`

Ne pas parler de bot WhatsApp dans le hero.

## 2. Notice de mise à jour

Texte :

> MARCO-XMD est désormais une application web évolutive. Installez-la sur votre téléphone pour accéder à toutes les fonctionnalités depuis un seul espace. De nouveaux services seront ajoutés progressivement.

## 3. Fonctionnalités

Remplacer les cartes par :

1. **Web évolutif** — Une application qui évolue régulièrement avec de nouvelles fonctionnalités.
2. **Ultra léger** — Une interface rapide et optimisée pour les téléphones.
3. **Multi-outils** — Video Downloader, Voice Studio, Marco Lyrics et d’autres outils dans une seule application.
4. **Dashboard Web** — Une interface moderne pour tout contrôler.

Le bot WhatsApp ne doit pas apparaître dans ces quatre cartes.

## 4. Compte utilisateur

Ajouter une carte ou un bloc clair présentant :

- inscription et connexion par e-mail ;
- profil personnalisé ;
- historique des activités ;
- notifications mobiles optionnelles.

Liens :

- `/auth.html` — connexion et inscription ;
- `/profile.html` — profil ;
- `/history.html` — historique.

## 5. Comment ça marche

1. **Ouvrez l’app** — depuis le navigateur ou l’icône installée sur votre téléphone.
2. **Créez votre espace** — inscrivez-vous si vous souhaitez synchroniser votre profil et votre historique.
3. **Profitez** — explorez les outils disponibles et activez les notifications si vous le souhaitez.

Ne pas présenter la connexion WhatsApp comme le parcours principal.

## 6. Services

Insérer une section `Services` entre `Comment ça marche` et `FAQ`.

Services actuellement disponibles :

- Video Downloader ;
- Marco Lyrics ;
- Voice Studio ;
- Mini-jeux si le lien est disponible.

Service secondaire désactivé :

```html
<div class="tool-card disabled-service" title="Bientôt disponible">
  <div class="tool-icon blue"><i class="fab fa-whatsapp"></i></div>
  <div class="tool-info">
    <h3>Bot WhatsApp</h3>
    <p>Connectez un bot WhatsApp multi-session à votre compte.</p>
  </div>
  <span class="tool-tag">Bientôt</span>
</div>
```

Style :

```css
.disabled-service {
  opacity: .5;
  pointer-events: none;
  filter: grayscale(1);
  cursor: not-allowed;
}
```

Le bot WhatsApp ne doit être mentionné que dans cette section désactivée et dans la FAQ qui explique qu’il est bientôt disponible.

## 7. CTA

Titre :

> Prêt à démarrer ?

Texte :

> Ouvrez MARCO-XMD et profitez de tous nos outils depuis votre téléphone.

Bouton :

- `Ouvrir l’application` ou `Installer l’application` si l’installation PWA est disponible ;
- `Télécharger l’APK` uniquement quand `/apk/MARCO-XMD.apk` est réellement présent.

## 8. FAQ

Questions recommandées :

1. **L’application est-elle gratuite ?**
   - Oui, l’accès de base est gratuit. Certaines fonctions peuvent évoluer selon les offres futures.
2. **Faut-il créer un compte ?**
   - Non pour consulter les outils publics. Un compte est nécessaire pour le profil, l’historique et les fonctions synchronisées.
3. **L’application fonctionne-t-elle sur tous les téléphones ?**
   - La version web fonctionne sur les navigateurs modernes. L’installation PWA dépend du navigateur et du système.
4. **Où sont stockées mes données ?**
   - Les données du compte sont stockées dans le projet Supabase dédié à MARCO-XMD et protégées par l’authentification et les policies RLS.
5. **Comment fonctionnent les notifications ?**
   - Les notifications mobiles sont optionnelles et nécessitent l’autorisation de l’utilisateur. Elles sont envoyées uniquement aux appareils inscrits.
6. **Quand le bot WhatsApp sera-t-il disponible ?**
   - Le service est en préparation et reste désactivé jusqu’à sa mise en production.

## 9. Navbar et menu mobile

Dans la navbar :

- remplacer `Connecter` par `Services` ;
- garder le bouton grisé avec le tooltip `Bientôt disponible` si le bouton représente le service WhatsApp ;
- ajouter `Mon compte` vers `/auth.html`.

Dans le menu mobile :

- remplacer `Connecter un bot` par `Services (bientôt)` ;
- ajouter `Mon compte` ;
- conserver les liens publics vers les outils existants.

## 10. Meta et manifest

Dans `index.html` :

```html
<meta name="description" content="MARCO-XMD — Application web évolutive avec outils intégrés, compte utilisateur et installation mobile.">
<meta property="og:description" content="Application web évolutive — outils web, compte utilisateur et installation mobile.">
```

Dans `public/manifest.json` :

```json
{
  "description": "Application web évolutive avec outils intégrés, profil et historique — par Mr_Marco"
}
```

## 11. Traductions

Mettre à jour les trois langues dans `public/translations.js` pour les clés suivantes :

```text
hero.subtitle
hero.badge.fast
notice.text
features.multisession.title
features.multisession.desc
features.antiban.title
features.antiban.desc
features.dashboard.desc
how.step1.title
how.step1.desc
how.step2.title
how.step2.desc
how.step3.title
how.step3.desc
cta.text
nav.connect
menu.connect
services.title
services.subtitle
services.bot.title
services.bot.desc
services.bot.tag
```

Ajouter aussi les libellés du compte :

```text
account.title
account.login
account.signup
account.profile
account.history
account.logout
account.save
account.email
account.display_name
account.bio
account.notifications
```

## 12. Checklist finale

- [ ] Aucun discours de bot WhatsApp dans le hero, la notice, les fonctionnalités ou le parcours principal.
- [ ] Le bot WhatsApp apparaît uniquement dans Services, désactivé, avec le statut `Bientôt`.
- [ ] Les traductions FR / HT / EN sont cohérentes.
- [ ] Les pages `/auth.html`, `/profile.html` et `/history.html` fonctionnent avec le nouveau projet Supabase.
- [ ] Le nouveau projet Supabase est dédié à MARCO-XMD.
- [ ] Les anciennes tables de l’autre projet ne sont pas réutilisées.
- [ ] RLS est activé sur `profiles` et `activity_history`.
- [ ] Aucune clé `service_role` n’est présente dans le dépôt ou le navigateur.
- [ ] Les notifications restent optionnelles et demandent le consentement du téléphone.
- [ ] Le CTA APK ne pointe vers un fichier que s’il est réellement déployé.
- [ ] La CSP autorise uniquement les domaines CDN et Supabase nécessaires.
- [ ] Tests syntaxiques, tests HTTP et vérification mobile effectués.
- [ ] Commit et déploiement effectués après validation.

## Livraison

Le travail doit être réalisé directement dans le dépôt GitHub, avec :

```text
feat: align positioning and rebuild Supabase foundation
```

Avant toute action destructive sur l’ancien projet Supabase, afficher clairement le projet concerné, les objets supprimés et demander une confirmation explicite.
