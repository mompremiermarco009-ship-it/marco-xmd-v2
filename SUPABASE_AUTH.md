# Authentification, profil et historique

MARCO-XMD utilise Supabase Auth avec les pages suivantes :

- `/auth.html` : inscription et connexion par e-mail/mot de passe ;
- `/profile.html` : modification du nom, de la photo et de la bio ;
- `/history.html` : historique personnel des connexions et mises à jour de profil.

## Configuration

Le projet dédié utilisé est `MARCO-XMD Production` (`btavjbuzreapisdnmetv`). Le navigateur reçoit la configuration depuis `/api/config`. Pour Render, renseigner :

- `SUPABASE_URL` : URL du projet ;
- `SUPABASE_PUBLISHABLE_KEY` : clé publishable/anon uniquement — jamais de service-role key dans le navigateur.

La clé publishable est conçue pour être exposée côté client. La sécurité repose sur l’authentification Supabase et les politiques RLS.

## Schéma

La migration versionnée se trouve dans `supabase/migrations/20261002221600_marco_xmd_auth_profiles_history.sql`. Elle crée :

- `public.profiles`, reliée à `auth.users` ;
- `public.activity_history`, filtrée par `auth.uid()` ;
- un trigger qui crée automatiquement le profil après inscription ;
- les policies RLS `select/insert/update` nécessaires.

La migration a été appliquée au nouveau projet Supabase dédié à MARCO-XMD.

## Ancien projet Supabase

L’ancien projet `Nexus Project` (`mcpnnnnaikouoebgvwcf`) appartenait à un autre produit. MARCO-XMD ne l’utilise plus et aucune donnée n’a été supprimée de ce projet.

Le nouveau projet commence uniquement avec les tables `profiles` et `activity_history`, toutes deux protégées par RLS.
