import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

export const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = Number(process.env.PORT) || 8080;
export const LINK_LEN = Number(process.env.LINK_LEN) || 6;

// Les chemins relatifs sont résolus depuis la racine du projet, ce qui
// permet de lancer le serveur depuis n'importe quel dossier.
export const DB_FILE = path.resolve(
  ROOT_DIR,
  process.env.DB_FILE || "database/database.sqlite",
);
export const DB_SCHEMA = path.resolve(
  ROOT_DIR,
  process.env.DB_SCHEMA || "database/database.sql",
);

// Format de log morgan : concis en développement, complet (style Apache)
// en production.
export const LOG_LEVEL = NODE_ENV === "production" ? "combined" : "dev";
