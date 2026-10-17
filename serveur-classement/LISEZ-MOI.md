# Classement mondial (Survie) — installation, 10 minutes, gratuit

Le jeu marche très bien sans ça : sans serveur, le classement indique simplement « non configuré ».

## 1. Créer le serveur (Cloudflare)
1. Crée un compte gratuit sur https://dash.cloudflare.com (pas de carte bancaire).
2. Menu **Workers & Pages** → **Create** → **Create Worker** → nomme-le `duel-classement` → **Deploy**.
3. Clique **Edit code**, efface tout, colle le contenu de `worker.js`, puis **Deploy**.

## 2. Créer le stockage des scores
1. Menu **Storage & Databases** → **KV** → **Create** → nom : `duel-scores`.
2. Retourne dans ton Worker → **Settings** → **Bindings** → **Add** → **KV namespace**.
3. Nom de variable : `SCORES` (exactement, en majuscules) ; espace : `duel-scores` → **Deploy**.

## 3. Brancher le jeu
Ton Worker a une adresse du type `https://duel-classement.TONPSEUDO.workers.dev`.
Teste-la : ouvre `…workers.dev/top` dans le navigateur, tu dois voir `[]`.

Dans ton dossier du jeu, crée le fichier **`app/config.js`** avec une seule ligne :

    window.DUEL_LB='https://duel-classement.TONPSEUDO.workers.dev';

Puis : `git add .`, `git commit -m "classement"`, `git push`, `npm.cmd run release`.
(Ne supprime pas `app/config.js` ; les prochains packs de mise à jour ne le touchent pas.)

## Limites (honnêtes)
Le jeu tourne chez le joueur : quelqu'un qui lit le code peut envoyer de faux scores. Le serveur bloque
les scores impossibles, limite à 1 envoi/minute par IP et garde un seul score par pseudo, mais ce n'est
pas infaillible. Si quelqu'un triche, supprime sa ligne dans KV (clé `top`).
Limites gratuites Cloudflare : largement suffisantes pour un jeu de ce type.
