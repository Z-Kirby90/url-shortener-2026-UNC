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

## État d'avancement

| Partie | Contenu                                                       | Tag             | État |
| ------ | ------------------------------------------------------------- | --------------- | ---- |
| 1      | Prise en main, réponses aux questions                         | `reponses`      | ⏳   |
| 2      | API v1 (routes manquantes, visites, `config.mjs`)             | `api-v1`        | ⏳   |
| 3      | API v2 : négociation de contenu, rendu HTML (EJS), erreur 406 | `api-v2`        | ⏳   |
| 4      | Client AJAX (SPA, `fetch`, copie dans le presse-papier)       | `client-ajax`   | ⏳   |
| 5      | Suppression sécurisée par clef API (`X-API-Key`)              | `api-v2-delete` | ⏳   |
