import { Router } from "express";
import crypto from "node:crypto";
import {
  countLinks,
  createLink,
  deleteLink,
  getLink,
  incrementVisit,
} from "../database/database.mjs";
import { asyncHandler } from "../lib/async-handler.mjs";
import { NOT_ACCEPTABLE_MESSAGE, respondError } from "../lib/errors.mjs";
import { isValidUrl } from "../lib/url.mjs";

const router = Router();

// Formats gérés par l'API v2, par ordre de préférence quand le client
// accepte tout (Accept: */*) : JSON d'abord.
const FORMATS = ["json", "html"];

// Négociation de contenu : renvoie "json", "html", ou false si le client
// n'accepte aucun des deux (réponse 406 Not Acceptable).
function negotiate(req, res) {
  res.vary("Accept");
  return req.accepts(FORMATS);
}

function shortUrlOf(req, code) {
  return `${req.protocol}://${req.get("host")}/${code}`;
}

function generateSecret() {
  return crypto.randomBytes(9).toString("base64url");
}

// Comparaison à temps constant, pour ne rien laisser deviner du secret
// via le temps de réponse.
function secretsMatch(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected ?? "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// GET /api-v2/ : json -> nombre de liens | html -> formulaire de création
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const format = negotiate(req, res);
    if (!format) return respondError(req, res, 406, NOT_ACCEPTABLE_MESSAGE);

    const count = await countLinks();

    if (format === "json") return res.json({ count });

    res.render("root", { count, link: null, error: null, value: "" });
  }),
);

// POST /api-v2/ : json -> infos du lien créé | html -> page avec le lien créé
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const format = negotiate(req, res);
    if (!format) return respondError(req, res, 406, NOT_ACCEPTABLE_MESSAGE);

    const url = req.body?.url?.trim?.();

    if (!isValidUrl(url)) {
      const error = "URL invalide ou manquante";

      if (format === "json") return res.status(400).json({ error });

      const count = await countLinks();
      return res.status(400).render("root", {
        count,
        link: null,
        error: "Saisissez une URL valide commençant par http:// ou https://",
        value: req.body?.url ?? "",
      });
    }

    const link = await createLink(url, generateSecret());

    if (format === "json") {
      return res.status(201).json({
        url: link.url,
        origin: link.origin,
        created: link.created,
        secret: link.secret,
      });
    }

    const count = await countLinks();
    res.status(201).render("root", {
      count,
      link: { ...link, shortUrl: shortUrlOf(req, link.url) },
      error: null,
      value: "",
    });
  }),
);

// GET /api-v2/:url : json -> état du lien | html -> compte la visite + redirige
router.get(
  "/:url",
  asyncHandler(async (req, res) => {
    const format = negotiate(req, res);
    if (!format) return respondError(req, res, 406, NOT_ACCEPTABLE_MESSAGE);

    const link = await getLink(req.params.url);

    if (!link) return respondError(req, res, 404, "Lien inconnu");

    // NOTA BENE : le secret ne doit jamais être exposé sur cette route.
    if (format === "json") {
      return res.json({
        origin: link.origin,
        created: link.created,
        visit: link.visit,
      });
    }

    await incrementVisit(link.url);
    res.redirect(link.origin);
  }),
);

// DELETE /api-v2/:url : suppression protégée par le secret (en-tête X-API-Key)
router.delete(
  "/:url",
  asyncHandler(async (req, res) => {
    const link = await getLink(req.params.url);

    if (!link) {
      return res.status(404).json({ error: "Lien inconnu" });
    }

    const apiKey = req.get("X-API-Key");

    if (!apiKey) {
      return res.status(401).json({ error: "En-tête X-API-Key manquante" });
    }

    if (!secretsMatch(apiKey, link.secret)) {
      return res.status(403).json({ error: "Clef API invalide" });
    }

    await deleteLink(link.url);
    res.status(200).json({ message: "Lien supprimé" });
  }),
);

export default router;
