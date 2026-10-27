import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { nanoid } from "nanoid";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DB_FILE, DB_SCHEMA, LINK_LEN } from "../config.mjs";

const MAX_ID_ATTEMPTS = 5;

// Connexion unique (singleton), ouverte au premier appel et gardée
// ouverte pendant toute la durée de vie du process. Elle est fermée
// explicitement par closeDatabase(), appelée depuis server.mjs sur
// réception de SIGINT/SIGTERM.
let db;

export async function getDatabase() {
  if (db) return db;

  mkdirSync(path.dirname(DB_FILE), { recursive: true });

  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  await db.exec(readFileSync(DB_SCHEMA, "utf-8"));

  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = undefined;
  }
}

export async function countLinks() {
  const database = await getDatabase();
  const row = await database.get("SELECT COUNT(*) AS count FROM links");
  return row.count;
}

// Crée un lien avec un identifiant court garanti unique : la clef primaire
// refuse les doublons, on tire alors un nouvel identifiant.
export async function createLink(origin, secret = null) {
  const database = await getDatabase();
  const created = new Date().toISOString();

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const url = nanoid(LINK_LEN);

    try {
      await database.run(
        "INSERT INTO links (url, origin, created, visit, secret) VALUES (?, ?, ?, 0, ?)",
        url,
        origin,
        created,
        secret,
      );
      return { url, origin, created, visit: 0, secret };
    } catch (err) {
      if (err.code !== "SQLITE_CONSTRAINT") throw err;
    }
  }

  throw new Error("Impossible de générer un identifiant unique");
}

export async function getLink(url) {
  const database = await getDatabase();
  return database.get(
    "SELECT url, origin, created, visit, secret FROM links WHERE url = ?",
    url,
  );
}

export async function incrementVisit(url) {
  const database = await getDatabase();
  await database.run("UPDATE links SET visit = visit + 1 WHERE url = ?", url);
}

export async function deleteLink(url) {
  const database = await getDatabase();
  const result = await database.run("DELETE FROM links WHERE url = ?", url);
  return result.changes > 0;
}
