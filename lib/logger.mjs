// Journalisation minimale : écrit sur les flux standards sans utiliser
// l'objet console, pour garder un code de production propre.
export const logger = {
  info(message) {
    process.stdout.write(`${message}\n`);
  },
  error(error) {
    process.stderr.write(`${error?.stack ?? error}\n`);
  },
};
