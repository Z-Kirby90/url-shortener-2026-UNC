# Réducteur d'URL — TP DevWeb

Service de réduction d'URL en Node.js / Express (API REST + client web),
réalisé selon le sujet du TP DevWeb (UNC, 2026).

- **En ligne** : <https://VOTRE-SERVICE.onrender.com>
- **Documentation interactive (Swagger UI)** : `/api-docs`

> ⚠️ Hébergement gratuit : le disque de l'offre gratuite de Render est
> éphémère. La base SQLite est recréée vide après une mise en veille (15 min
> sans visite), un redémarrage ou un redéploiement. Les liens créés avant
> ne sont alors plus disponibles. Voir « Déploiement ».

## Installation

```bash
npm install
cp .env.example .env   # à adapter si besoin
```

Le fichier `.env` définit :

```
PORT=8080
LINK_LEN=6
DB_FILE=database/database.sqlite
DB_SCHEMA=database/database.sql
```

Toutes ces valeurs ont une valeur par défaut : l'application démarre aussi
sans fichier `.env`.

## Lancement

```bash
npm run dev    # développement (nodemon, rechargement automatique)
npm run prod   # production
npm start      # production sans cross-env (utilisé par l'hébergeur)
```

La base `database/database.sqlite` est créée automatiquement si besoin, à
partir du schéma `database/database.sql`.

- Client web : <http://localhost:8080/>
- Documentation Swagger : <http://localhost:8080/api-docs>

## Tests et formatage

```bash
npm test          # 21 tests d'intégration (lance le vrai serveur)
npm run format    # prettier sur tous les fichiers .mjs
```

## Routes

### API v1 (`/api-v1`, JSON uniquement)

| Méthode | Route                | Réponse                                        |
| ------- | -------------------- | ---------------------------------------------- |
| GET     | `/api-v1/`           | `{ count }` : nombre de liens créés            |
| POST    | `/api-v1/`           | `201 { url, origin, created }`                 |
| GET     | `/api-v1/status/:url`| `{ origin, created, visit }`                   |
| GET     | `/api-v1/:url`       | `302` vers l'URL d'origine, compte la visite   |
| GET     | `/api-v1/error`      | `500` volontaire (tests)                       |

### API v2 (`/api-v2`, négociation de contenu via l'en-tête `Accept`)

| Méthode | Route         | `Accept: application/json`            | `Accept: text/html`            |
| ------- | ------------- | ------------------------------------- | ------------------------------ |
| GET     | `/api-v2/`    | `{ count }`                           | page d'accueil + formulaire    |
| POST    | `/api-v2/`    | `201 { url, origin, created, secret }`| page avec le lien créé         |
| GET     | `/api-v2/:url`| `{ origin, created, visit }`          | compte la visite + redirige    |
| DELETE  | `/api-v2/:url`| voir ci-dessous                       | —                              |

Autre format demandé : `406 Not Acceptable`.

`DELETE /api-v2/:url` exige l'en-tête `X-API-Key` (le `secret` reçu à la
création) :

- `404` : le lien n'existe pas
- `401` : en-tête `X-API-Key` absente
- `403` : la clef ne correspond pas au lien
- `200` : lien supprimé

Le `secret` n'est **jamais** renvoyé par `GET /api-v2/:url`.

### Lien court

`GET /:url` redirige aussi vers l'URL d'origine : c'est ce lien court
(`https://domaine/WmFJQp`) que le client web affiche et propose de copier.

## État d'avancement

| Partie | Contenu                                                       | Tag             | État |
| ------ | ------------------------------------------------------------- | --------------- | ---- |
| 1      | Prise en main, réponses aux questions                         | `reponses`      | ✅   |
| 2      | API v1 (routes manquantes, visites, `config.mjs`)             | `api-v1`        | ✅   |
| 3      | API v2 : négociation de contenu, rendu HTML (EJS), erreur 406 | `api-v2`        | ✅   |
| 4      | Client AJAX (SPA, `fetch`, copie dans le presse-papier)       | `client-ajax`   | ⏳   |
| 5      | Suppression sécurisée par clef API (`X-API-Key`)              | `api-v2-delete` | ⏳   |

## Structure du projet

```
server.mjs               point d'entrée Express
config.mjs               variables d'environnement et niveau de log
database/
  database.sql           schéma SQL
  database.mjs           accès à la base (sqlite/sqlite3)
router/
  api-v1.mjs             API v1 — JSON uniquement
  api-v2.mjs             API v2 — négociation de contenu, suppression
  redirect.mjs           lien court /:url
lib/
  async-handler.mjs      transmet les erreurs async au middleware d'erreurs
  errors.mjs             404 et gestion centralisée des erreurs (JSON/HTML)
  logger.mjs             journalisation sans console.*
  url.mjs                validation des URL (http / https uniquement)
views/                   gabarits EJS (accueil, erreur, partials)
static/
  index.html, app.js     client AJAX (SPA)
  style.css, copy.js     styles et bouton « Copier » partagés
  open-api.yaml          spécification OpenAPI / Swagger
test/                    tests d'intégration (node:test)
REPONSES.md              réponses aux questions de la Partie 1
```

## Choix techniques

- **Identifiants** : [`nanoid`](https://www.npmjs.com/package/nanoid) sur
  `LINK_LEN` caractères. L'unicité est garantie par la clef primaire SQLite :
  en cas de collision, un nouvel identifiant est tiré (5 essais maximum).
- **Secret de suppression** : `crypto.randomBytes`, encodé en base64url, et
  comparé à temps constant (`crypto.timingSafeEqual`).
- **Validation** : seules les URL `http://` et `https://` sont acceptées
  (refus de `javascript:`, `data:`, `ftp:`…).
- **Erreurs** : les routes `async` passent par `asyncHandler`, et un
  middleware unique renvoie le bon code HTTP en JSON ou en HTML.
- **Connexion SQLite** : ouverte une seule fois (singleton) et fermée
  proprement à l'arrêt du serveur (`SIGINT` / `SIGTERM`).
- **Interface** : feuille de style unique, thème clair/sombre automatique,
  adaptée au mobile, champs et messages accessibles (`label`, `aria-live`,
  focus visible). Le formulaire fonctionne aussi sans JavaScript.

## Déploiement (Render)

1. Pousser le code et les tags sur GitHub : `git push origin main --tags`.
2. Sur <https://render.com> : **New → Web Service**, choisir le dépôt.
3. Renseigner : Language `Node`, Build Command `npm install`,
   Start Command `npm start`, Instance Type `Free`.
4. Ajouter la variable d'environnement `NODE_ENV=production`.

Limite connue de l'offre gratuite : disque éphémère (voir l'avertissement en
haut). Pour conserver durablement les liens, il faudrait un disque persistant
(offre payante) ou une base hébergée.
