import { Router } from "express";
import { getLink, incrementVisit } from "../database/database.mjs";
import { asyncHandler } from "../lib/async-handler.mjs";

const router = Router();

// GET /:url : lien court "propre" (http://domaine/WmFJQp). Redirige vers
// l'URL d'origine et compte la visite. Si le code est inconnu, on passe la
// main au middleware 404.
router.get(
  "/:url",
  asyncHandler(async (req, res, next) => {
    const link = await getLink(req.params.url);

    if (!link) return next();

    await incrementVisit(link.url);
    res.redirect(link.origin);
  }),
);

export default router;
