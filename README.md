# Ping-Pong de mensonges (MVP navigateur/mobile)

Jeu Pong 1v1 jouable sur navigateur desktop et mobile. Chaque joueur reçoit en continu des paires d'indices dont un seul est vrai, ce qui influence ses décisions en temps réel.

## Objectif produit
- Pong en temps réel 1v1.
- Toutes les 5 secondes (par défaut), chaque joueur voit deux cartes : une vraie et une fausse décrivant un paramètre système.
- Les joueurs doivent interpréter ou douter des cartes, en observant le comportement adverse.

## Boucle de jeu
1. Les joueurs rejoignent la même room (code 6 caractères ou lien partagé).
2. Le match démarre (balle, paddles, score affichés).
3. À chaque fenêtre d'indices (ex. toutes les 5 s), chaque joueur reçoit un lot personnel de deux cartes (1 vraie, 1 fausse).
4. Jeu en temps réel (paddles + balle).
5. Option : ressource **Scan** pour vérifier une carte (charges limitées).
6. Point marqué → reset balle au centre, service alterné, compte à rebours de 1 s.
7. Fin de match au score cible (par défaut premier à 7, option 5/7/11).

## Interfaces & contrôles (mobile-first)
- **Terrain** : canvas plein écran responsive, paddles haut/bas en orientation verticale (reco mobile), score visible.
- **Mobile** : drag horizontal du paddle (finger-follow) avec inertie configurable.
- **Desktop** : souris (paddle suit X) ou clavier (A/D ou ←/→).
- **HUD Indices** : deux cartes côte à côte toujours visibles ; icône + libellé court (+ chiffre optionnel). Cartes expirent à chaque fenêtre.
- **HUD Scan** : bouton avec compteur (max 2 charges). Un tap sur une carte scannée révèle VRAI/FAUX jusqu'à expiration de la fenêtre.
- **Feedback** : son + animation de flip à chaque rafraîchissement d'indices ; effets réels ont un feedback visuel discret (trail de balle, taille paddle, légère courbe sur spin).

## Règles système
- **Fréquence des indices** : par défaut toutes les 5 s, lot personnel par joueur (vrai/faux indépendants).
- **Structure de lot** : exactement 1 carte vraie + 1 carte fausse, idéalement contradictoires sur la même dimension.
- **Catégories MVP** (3 dimensions max) :
  - Vitesse balle (augmente/diminue).
  - Taille paddle joueur (+20%/-20%).
  - Spin balle (plus/moins d'effet sur rebond paddle).
- **Vérité** : seule la carte vraie correspond à l'état réel du système pendant la fenêtre.
- **Scan** :
  - Charges max 2.
  - Recharge : +1 toutes les 20 s **ou** +1 à chaque point perdu (paramétrable).
  - Anti-abus : 1 scan par fenêtre maximum.
- **Équilibrage** : un seul paramètre réel modifié par fenêtre, effets non cumulés (remplacement), durées courtes et réversibles.
- **Anti fun-killer** : pas d'indices non actionnables, éviter les effets qui rendent le contrôle mobile injouable.

## Flow session / matchmaking
- Création de room : code 6 caractères + bouton copier lien.
- Rejoindre : saisie du code.
- États : lobby (ready/ready + choix score), in-game (pause courte si déconnexion, ex. 10 s), fin de match (résultat + revanche ou nouveau joueur).
- Reconnexion : tentative auto via token localStorage sinon retour lobby.

## Télémétrie minimale
- Par match : durée, score final, nombre de scans, % de scans corrects.
- Par fenêtre : cartes affichées, carte scannée, résultat (VRAI/FAUX), effet réellement actif.

## Tech & hébergement (gratuit via Netlify)
- **Stack conseillé** :
  - Client web responsive (ex. TypeScript + React/Vite ou SvelteKit) avec canvas pour le jeu.
  - Temps réel : WebSockets (via serveur léger Node/Express + ws) ou service managé compatible Netlify (ex. Netlify Functions + Upstash Redis Pub/Sub ou Ably gratuit pour MVP). Pour latence minimale, préférer un petit serveur WebSocket dédié sur Render free tier ou Fly.io gratuit, le client restant déployé sur Netlify.
- **Déploiement Netlify (gratuit)** :
  1. Lier le repo GitHub à Netlify.
  2. Commande de build (ex. `npm run build`) et répertoire de sortie (`dist` ou `.svelte-kit/output/client`).
  3. Ajouter un redirect si WebSocket externe : `/_api/*` → proxy vers le serveur temps réel (via `netlify.toml`).
  4. Activer HTTPS par défaut ; tester sur mobile via l'URL Netlify.
- **Mobile** : tester en mode PWA léger (icône + manifest) pour accès plein écran et orientation verrouillable.

## Roadmap MVP
1. Boucle Pong de base (canvas, physique simple, contrôle mobile & desktop).
2. Système d'effets avec un seul paramètre actif par fenêtre ; UI cartes + timers.
3. Ressource Scan et recharge.
4. Lobby/room + synchronisation temps réel des états (balle, positions, effets actifs).
5. Déploiement Netlify + serveur WebSocket gratuit (Render/Fly.io) + redirect proxy.
