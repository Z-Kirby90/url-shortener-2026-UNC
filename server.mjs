import express from "express";
import morgan from "morgan";
import favicon from "serve-favicon";
import path from "node:path";
import { readFileSync } from "node:fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { PORT, LOG_LEVEL, NODE_ENV, ROOT_DIR } from "./config.mjs";
import { closeDatabase } from "./database/database.mjs";
import { errorHandler, notFound } from "./lib/errors.mjs";
import { logger } from "./lib/logger.mjs";
import apiV1 from "./router/api-v1.mjs";
import apiV2 from "./router/api-v2.mjs";
import redirect from "./router/redirect.mjs";

const pkg = JSON.parse(
  readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"),
);

const app = express();

// Question Partie 1 : supprimer l'en-tête X-Powered-By
app.disable("x-powered-by");

// Derrière le proxy d'un hébergeur (Render...), fait confiance à
// X-Forwarded-Proto pour que req.protocol vaille "https" en ligne.
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(ROOT_DIR, "views"));

app.use(morgan(LOG_LEVEL));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(ROOT_DIR, "static", "logo_univ_16.png")));

// Middleware applicatif : ajoute la version courante de l'application
app.use((req, res, next) => {
  res.set("X-API-version", pkg.version);
  next();
});

app.use(express.static(path.join(ROOT_DIR, "static")));

const openApiDoc = YAML.load(path.join(ROOT_DIR, "static", "open-api.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.use("/api-v1", apiV1);
app.use("/api-v2", apiV2);
app.use("/", redirect);

// Doivent rester en dernier : 404 puis gestion centralisée des erreurs.
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Serveur démarré en mode ${NODE_ENV} sur le port ${PORT}`);
});

async function shutdown() {
  await closeDatabase();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
