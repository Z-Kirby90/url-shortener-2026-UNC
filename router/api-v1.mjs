import { Router } from "express";
import {
  countLinks,
  createLink,
  getLink,
  incrementVisit,
} from "../database/database.mjs";
import { asyncHandler } from "../lib/async-handler.mjs";
import { isValidUrl } from "../lib/url.mjs";

const router = Router();

// GET /api-v1/ : nombre de liens déjà créés
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ count: await countLinks() });
  }),
);

// POST /api-v1/ : crée un lien réduit à partir d'une URL longue
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const url = req.body?.url?.trim?.();

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "URL invalide ou manquante" });
    }

    const link = await createLink(url);

    res
      .status(201)
      .json({ url: link.url, origin: link.origin, created: link.created });
  }),
);

// GET /api-v1/status/:url : état du lien
router.get(
  "/status/:url",
  asyncHandler(async (req, res) => {
    const link = await getLink(req.params.url);

    if (!link) {
      return res.status(404).json({ error: "Lien inconnu" });
    }

    res.json({ origin: link.origin, created: link.created, visit: link.visit });
  }),
);

// GET /api-v1/error : génère volontairement une erreur 500 (pour les tests)
router.get("/error", (req, res, next) => {
  next(new Error("Erreur générée volontairement pour les tests"));
});

// GET /api-v1/:url : redirige vers l'URL d'origine et compte la visite
router.get(
  "/:url",
  asyncHandler(async (req, res) => {
    const link = await getLink(req.params.url);

    if (!link) {
      return res.status(404).json({ error: "Lien inconnu" });
    }

    await incrementVisit(link.url);
    res.redirect(link.origin);
  }),
);

export default router;
