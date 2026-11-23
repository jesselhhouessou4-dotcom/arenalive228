# Arenalive228

Crée une application web mobile-first en français pour organiser et suivre des matchs et tournois de football et de basketball, avec Supabase (Auth, Postgres, Realtime, Storage, RLS).
CONTEXTE
Usage d'abord scolaire, mais la base de données doit être propre et extensible pour de vrais tournois. Design moderne, sombre, avec des couleurs et un logo à venir : utilise des variables de thème faciles à changer (couleur principale, secondaire, logo).
RÔLES
- admin : gère tout
- marqueur : saisit uniquement les événements des matchs qui lui sont attribués
- supporter : lecture seule, sans compte obligatoire
Sécurise avec des politiques RLS.
BASE DE DONNÉES
- profiles (id, rôle)
- sports (football, basketball)
- tournaments (nom, sport, format poules/élimination directe, dates, statut)
- teams (nom, logo, couleur, tournoi)
- players (nom, numéro de maillot, poste, photo_url, équipe)
- lineups (match, joueur, équipe, statut : titulaire / remplaçant / réserve, position, capitaine oui/non)
- matches (tournoi, équipe A, équipe B, date, statut : à venir / en cours / terminé, phase, score A, score B, quart-temps ou mi-temps en cours)
- match_events (match, équipe, joueur, type, minute ou quart-temps, créé le)
Types d'événements prévus dès maintenant (même si l'interface complète vient après) :
football : but, passe décisive, carton jaune, carton rouge, hors-jeu, remplacement
basketball : panier 1pt, 2pts, 3pts, faute personnelle, faute technique, passe, steal, block, rebond, remplacement
Le score et les stats sont CALCULÉS à partir de match_events, jamais saisis à la main. Une erreur se corrige en supprimant l'événement.
ESPACE ADMIN (protégé par connexion)
- CRUD des tournois, équipes, joueurs (avec upload de photo dans Supabase Storage, bucket player-photos, image compressée)
- Création des matchs et composition des équipes : titulaires, remplaçants, réserve, choix du capitaine
- Interface de match en direct, gros boutons adaptés au téléphone : +2, +3, +1, faute, carton jaune, carton rouge, but, remplacement, changement de quart-temps / mi-temps, début et fin du match
- Bouton « annuler la dernière action »
ESPACE SUPPORTER (public)
- Accueil : matchs en direct, prochains matchs, derniers résultats
- Page tournoi : calendrier, classement automatique des poules (points, différence de buts), tableau des phases finales
- Page match en direct : score, temps, fil des événements en temps réel (Supabase Realtime), sans rechargement
- Page équipe : infos, effectif
- Composition façon télé : photos des joueurs, numéro, poste, brassard du capitaine, banc des remplaçants et section réserve plus discrète
- Page joueur : photo et stats de base
RÈGLES AUTOMATIQUES
- Foot : 2 cartons jaunes = carton rouge automatique
- Basket : 5 fautes personnelles = joueur exclu
QUALITÉ
- Mobile-first, chargement rapide, installable comme une PWA
- États de chargement et messages d'erreur clairs
- Données de démonstration pour tester (2 tournois, 4 équipes, quelques joueurs)
Commence par le schéma de base de données et les politiques RLS, puis l'espace admin, puis l'espace supporter.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arenalive228.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3d450a2e-0e07-4726-ac02-d4426ec97c6a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
