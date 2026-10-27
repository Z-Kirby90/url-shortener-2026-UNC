// Enveloppe un gestionnaire de route async : toute erreur (exception ou
// promesse rejetée) est transmise à next() et donc au middleware d'erreurs.
// Sans cela, Express 4 ne capture pas les erreurs des fonctions async.
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
