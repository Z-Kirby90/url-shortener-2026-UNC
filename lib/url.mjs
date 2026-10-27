const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = ["http:", "https:"];

// Une URL est acceptée si elle est syntaxiquement valide ET en http(s).
// Refuser les autres protocoles (javascript:, data:, file:...) évite qu'un
// lien court serve à exécuter du code ou à lire des fichiers locaux.
export function isValidUrl(value) {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) {
    return false;
  }

  try {
    return ALLOWED_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
