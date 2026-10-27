// Bouton « Copier » générique, utilisé par le client statique et par les
// pages rendues par le serveur.
//
// Usage : <button data-copy-target="id-element">Copier</button>
// Le texte copié est celui de l'élément ciblé.
(function () {
  const FEEDBACK_DELAY = 1800;

  async function writeToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Repli pour les contextes non sécurisés (http hors localhost).
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();

    if (!copied) throw new Error("copy-failed");
  }

  function flash(button, label) {
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = original;
    }, FEEDBACK_DELAY);
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-target]");
    if (!button) return;

    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;

    try {
      await writeToClipboard(target.textContent.trim());
      flash(button, "Copié ✓");
    } catch {
      flash(button, "Copie impossible");
    }
  });
})();
