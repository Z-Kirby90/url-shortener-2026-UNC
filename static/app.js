// Origine de l'API v2. Laisser "/" quand ce fichier est servi par le même
// serveur Express que l'API (cas par défaut du TP).
// Pour tester avec un serveur statique séparé (ex. `python -m http.server`),
// remplacer par : const originURL = "http://127.0.0.1:8080/";
const originURL = "/";

(function () {
  const origin = new URL(originURL, window.location.href);
  const apiURL = new URL("api-v2/", origin).href;

  const form = document.getElementById("shorten-form");
  const input = document.getElementById("url");
  const submitBtn = document.getElementById("submit-btn");
  const submitLabel = document.getElementById("submit-label");
  const errorBox = document.getElementById("error");
  const resultBox = document.getElementById("result");
  const shortLink = document.getElementById("short-link");
  const originText = document.getElementById("origin");
  const secretText = document.getElementById("secret");
  const resetBtn = document.getElementById("reset-btn");
  const stat = document.getElementById("stat");

  const JSON_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Ajoute https:// si l'utilisateur a saisi « exemple.com » sans protocole.
  function normalizeUrl(value) {
    const trimmed = value.trim();
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
    const looksLikeDomain = /^[^\s/]+\.[a-z]{2,}([/?#].*)?$/i.test(trimmed);

    return !hasScheme && looksLikeDomain ? `https://${trimmed}` : trimmed;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    input.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute("aria-busy", String(isLoading));
    submitLabel.textContent = isLoading ? "Création…" : "Raccourcir";
  }

  function showResult(link) {
    shortLink.href = new URL(link.url, origin).href;
    shortLink.textContent = shortLink.href;
    originText.textContent = `Redirige vers ${link.origin}`;
    secretText.textContent = link.secret;
    resultBox.hidden = false;
  }

  function resetForm() {
    resultBox.hidden = true;
    clearError();
    input.value = "";
    input.focus();
  }

  async function loadCount() {
    try {
      const response = await fetch(apiURL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;

      const { count } = await response.json();
      stat.textContent = `${count} lien${count > 1 ? "s" : ""} créé${count > 1 ? "s" : ""} jusqu'ici`;
      stat.hidden = false;
    } catch {
      stat.hidden = true;
    }
  }

  async function createLink(url) {
    const response = await fetch(apiURL, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ url }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        response.status === 400
          ? "Cette adresse n'est pas valide. Exemple : https://exemple.com"
          : data.error || "Une erreur est survenue, réessayez.",
      );
    }

    return data;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    resultBox.hidden = true;

    if (!input.value.trim()) {
      showError("Saisissez l'URL à raccourcir.");
      input.focus();
      return;
    }

    input.value = normalizeUrl(input.value);
    setLoading(true);

    try {
      showResult(await createLink(input.value));
      loadCount();
    } catch (error) {
      showError(
        error instanceof TypeError
          ? "Impossible de contacter le serveur. Vérifiez votre connexion."
          : error.message,
      );
      input.focus();
    } finally {
      setLoading(false);
    }
  });

  input.addEventListener("input", clearError);
  resetBtn.addEventListener("click", resetForm);

  loadCount();
})();
