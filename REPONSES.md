# Partie 1 : prise en main

## Commande httpie équivalente à la commande curl de la doc (route POST)

```bash
http POST http://localhost:8080/api-v1/ url="https://perdu.com"
```

## Différences entre `npm run prod` et `npm run dev`

- **`npm run dev`** lance `nodemon`, qui surveille les fichiers du projet et
  redémarre automatiquement le serveur à chaque modification — pratique en
  développement. `NODE_ENV=development` est positionné.
- **`npm run prod`** lance directement `node server.mjs`, sans redémarrage
  automatique. `NODE_ENV=production` est positionné, ce qui change plusieurs
  comportements d'Express et des librairies utilisées :
  - le format des logs `morgan` passe du format court et coloré (`dev`) au
    format complet façon logs Apache (`combined`), plus adapté à un usage
    en production ;
  - Express met en cache le rendu des vues EJS en production (recompilation
    désactivée), alors qu'il recompile les templates à chaque requête en
    développement ;
  - les messages d'erreur détaillés (stack traces) ne devraient pas être
    exposés au client en production.

## Script npm pour formatter automatiquement les fichiers `.mjs`

```bash
npm run format
```

qui exécute `prettier --write "**/*.mjs"` (voir `package.json`).

## Configuration Express pour supprimer l'en-tête `X-Powered-By`

```js
app.disable("x-powered-by");
```

## Middleware ajoutant l'en-tête `X-API-version`

```js
app.use((req, res, next) => {
  res.set("X-API-version", pkg.version);
  next();
});
```

(`pkg` étant le contenu de `package.json`, lu au démarrage du serveur — voir
`server.mjs`.)

## Middleware pour répondre aux requêtes `favicon.ico`

Le paquet [`serve-favicon`](https://www.npmjs.com/package/serve-favicon) :

```js
import favicon from "serve-favicon";
// ...
app.use(favicon(path.join(__dirname, "static", "logo_univ_16.png")));
```

## Documentation du driver SQLite utilisé

Le projet utilise le pilote [`sqlite3`](https://www.npmjs.com/package/sqlite3)
enveloppé par le wrapper `async/await` [`sqlite`](https://www.npmjs.com/package/sqlite)
(dépôt : <https://github.com/kriasoft/node-sqlite>).

## Ouverture / fermeture de la connexion à la base

La connexion est un singleton (voir `database/database.mjs`) : elle est
ouverte **paresseusement**, au tout premier appel à `getDatabase()` (donc à
la première requête qui a besoin de la base), puis **réutilisée** pour toute
la durée de vie du process. Elle est fermée explicitement dans
`closeDatabase()`, appelée depuis `server.mjs` lors de la réception d'un
signal `SIGINT` ou `SIGTERM` (arrêt propre du serveur), avant que le process
ne se termine.

## Navigation en mode privé et cache d'Express

`express.static` (utilisé pour servir `static/`) ajoute par défaut des
en-têtes `ETag` et `Last-Modified`. En visitant une première fois la page,
le navigateur reçoit le contenu avec son `ETag`. À la deuxième visite, le
navigateur envoie une requête conditionnelle (`If-None-Match`) et le serveur
répond `304 Not Modified` si le contenu n'a pas changé : la page est alors
resservie depuis le cache local sans retransférer le corps de la réponse.
Un rechargement forcé (`Ctrl+Shift+R`) demande explicitement au navigateur
d'ignorer son cache et les validateurs conditionnels : la requête repart
alors sans `If-None-Match`, et le serveur renvoie systématiquement un
`200 OK` avec le contenu complet.

## Deux instances (ports 8080 et 8081) et partage des liens

Les deux instances sont deux process Node différents, mais elles pointent
toutes les deux sur le **même fichier** SQLite (`DB_FILE=database/database.sqlite`,
défini dans `.env` et chargé par les deux instances via `config.mjs`). La
base de données est donc un état partagé sur le disque, indépendant du port
ou du process qui la lit/l'écrit : un lien créé via le port 8080 est
immédiatement visible via le port 8081, puisque les deux serveurs
interrogent le même fichier `database/database.sqlite`.
