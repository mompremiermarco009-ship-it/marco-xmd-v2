# Authentification, profil et historique

MARCO-XMD utilise Supabase Auth avec les pages suivantes :

- `/auth.html` : inscription et connexion par e-mail/mot de passe ;
- `/profile.html` : modification du nom, de la photo et de la bio ;
- `/history.html` : historique personnel des connexions et mises à jour de profil.

## Configuration

Le projet utilisé est `Nexus Project` (`mcpnnnnaikouoebgvwcf`). Le navigateur reçoit la configuration depuis `/api/config`. Pour Render, renseigner :

- `SUPABASE_URL` : URL du projet ;
- `SUPABASE_PUBLISHABLE_KEY` : clé publishable/anon uniquement — jamais de service-role key dans le navigateur.

La clé publishable est conçue pour être exposée côté client. La sécurité repose sur l’authentification Supabase et les politiques RLS.

## Schéma

La migration versionnée se trouve dans `supabase/migrations/20261002221600_marco_xmd_auth_profiles_history.sql`. Elle crée :

- `public.profiles`, reliée à `auth.users` ;
- `public.activity_history`, filtrée par `auth.uid()` ;
- un trigger qui crée automatiquement le profil après inscription ;
- les policies RLS `select/insert/update` nécessaires.

La migration a déjà été appliquée au projet Supabase connecté.

## Avertissement de sécurité du projet existant

Supabase signale que plusieurs anciennes tables (`users`, `orders`, `conversations`, `videos`, `prompts`, `messages`, `notifications`, `user_settings`) ont actuellement **RLS désactivé**. Elles sont donc accessibles aux rôles `anon` et `authenticated` selon les privilèges exposés par l’API. Cette fonctionnalité n’utilise pas ces tables et ne les a pas modifiées automatiquement, car il faut d’abord définir précisément les règles d’accès métier pour chacune.

Avant toute mise en production de ces anciennes fonctionnalités, il faut activer RLS et ajouter des policies adaptées table par table.
