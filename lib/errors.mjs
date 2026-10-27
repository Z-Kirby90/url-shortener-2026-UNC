import { logger } from "./logger.mjs";

const FORMATS = ["json", "html"];

export const NOT_ACCEPTABLE_MESSAGE =
  "Formats acceptés : application/json, text/html";

// Répond avec une erreur dans le format demandé par le client :
// page HTML pour un navigateur, objet JSON { error } sinon.
export function respondError(req, res, status, message) {
  res.vary("Accept");

  if (req.accepts(FORMATS) === "html") {
    return res.status(status).render("error", { status, message });
  }

  return res.status(status).json({ error: message });
}

// Middleware : aucune route ne correspond.
export function notFound(req, res) {
  respondError(req, res, 404, "Page introuvable");
}

// Middleware d'erreurs (4 paramètres obligatoires pour qu'Express le
// reconnaisse). Doit être déclaré en dernier.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status >= 400 && err.status < 500 ? err.status : 500;

  if (status === 500) {
    logger.error(err);
    return respondError(req, res, 500, "Erreur interne du serveur");
  }

  // Erreur du client (JSON mal formé, corps trop volumineux...).
  return respondError(req, res, status, "Requête invalide");
}
