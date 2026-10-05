# Configuration Google Auth pour MARCO-XMD

Le bouton **Continuer avec Google** utilise le flux OAuth PKCE du SDK Supabase et redirige vers :

```text
https://marco-xmd-v2.onrender.com/auth.html
```

## 1. Créer les identifiants Google

1. Ouvrir [Google Cloud Console](https://console.cloud.google.com/).
2. Créer ou sélectionner un projet.
3. Aller dans **APIs & Services → OAuth consent screen**.
4. Choisir **External**, renseigner le nom MARCO-XMD et l’adresse e-mail de support.
5. Ajouter les domaines autorisés nécessaires, puis enregistrer.
6. Aller dans **APIs & Services → Credentials → Create credentials → OAuth client ID**.
7. Choisir **Web application**.

## 2. Configurer l’URL de redirection

Dans **Authorized redirect URIs**, ajouter exactement :

```text
https://btavjbuzreapisdnmetv.supabase.co/auth/v1/callback
```

L’URL de retour de l’application est :

```text
https://marco-xmd-v2.onrender.com/auth.html
```

## 3. Configurer le fournisseur

Dans le tableau de bord du projet d’authentification, ouvrir **Authentication → Providers → Google**, activer Google et coller :

- le **Client ID** Google ;
- le **Client Secret** Google.

Enregistrer, puis vérifier que l’URL de site et l’URL de redirection sont autorisées dans la section URL de l’application.

## 4. Tester

1. Ouvrir `/auth.html` en navigation privée.
2. Cliquer sur **Continuer avec Google**.
3. Choisir le compte Google.
4. Vérifier le retour automatique vers `/index.html`.
5. Vérifier le profil et l’historique après connexion.

Si Google n’est pas encore activé dans le fournisseur, le bouton affichera un message générique et aucune information technique ne sera montrée à l’utilisateur.
