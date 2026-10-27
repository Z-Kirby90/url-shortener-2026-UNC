import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = 18080 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

let server;
let tmpDir;

function post(route, body, headers = JSON_HEADERS) {
  return fetch(`${BASE}${route}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(route, accept = "application/json") {
  return fetch(`${BASE}${route}`, {
    headers: { Accept: accept },
    redirect: "manual",
  });
}

before(async () => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "shortener-"));
  server = spawn("node", ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_FILE: path.join(tmpDir, "test.sqlite"),
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "inherit"],
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("démarré")) resolve();
    });
  });
});

after(() => {
  server.kill("SIGTERM");
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("API v1", () => {
  let link;

  it("GET / renvoie le nombre de liens", async () => {
    const res = await get("/api-v1/");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { count: 0 });
  });

  it("POST / crée un lien (201) avec url, origin, created", async () => {
    const res = await post("/api-v1/", { url: "https://perdu.com" });
    assert.equal(res.status, 201);
    link = await res.json();
    assert.deepEqual(Object.keys(link).sort(), ["created", "origin", "url"]);
    assert.equal(link.url.length, 6);
    assert.equal(link.origin, "https://perdu.com");
    assert.ok(!Number.isNaN(Date.parse(link.created)));
  });

  it("POST / refuse les URL invalides (400)", async () => {
    for (const url of [
      "",
      "pas une url",
      "ftp://exemple.com",
      "javascript:alert(1)",
      42,
      null,
    ]) {
      const res = await post("/api-v1/", { url });
      assert.equal(res.status, 400, `url=${url}`);
      assert.ok((await res.json()).error);
    }
  });

  it("POST / avec un JSON mal formé renvoie 400 et non 500", async () => {
    const res = await post("/api-v1/", "{oups");
    assert.equal(res.status, 400);
  });

  it("GET /status/:url donne origin, created, visit", async () => {
    const res = await get(`/api-v1/status/${link.url}`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      origin: "https://perdu.com",
      created: link.created,
      visit: 0,
    });
  });

  it("GET /:url redirige et compte la visite", async () => {
    const res = await get(`/api-v1/${link.url}`);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "https://perdu.com");

    const status = await (await get(`/api-v1/status/${link.url}`)).json();
    assert.equal(status.visit, 1);
  });

  it("renvoie 404 pour un lien inconnu", async () => {
    assert.equal((await get("/api-v1/inconnu")).status, 404);
    assert.equal((await get("/api-v1/status/inconnu")).status, 404);
  });

  it("GET /error génère une erreur 500 JSON", async () => {
    const res = await get("/api-v1/error");
    assert.equal(res.status, 500);
    assert.ok((await res.json()).error);
  });
});

describe("API v2", () => {
  let link;

  it("GET / négocie : JSON, HTML ou 406", async () => {
    const asJson = await get("/api-v2/", "application/json");
    assert.equal(asJson.status, 200);
    assert.match(asJson.headers.get("content-type"), /application\/json/);
    assert.equal(typeof (await asJson.json()).count, "number");

    const asHtml = await get("/api-v2/", "text/html");
    assert.equal(asHtml.status, 200);
    assert.match(asHtml.headers.get("content-type"), /text\/html/);
    assert.match(await asHtml.text(), /<form[^>]+id="submit-link"/);

    const asXml = await get("/api-v2/", "application/xml");
    assert.equal(asXml.status, 406);
  });

  it("POST / en JSON renvoie le lien et son secret", async () => {
    const res = await post("/api-v2/", { url: "https://nodejs.org" });
    assert.equal(res.status, 201);
    link = await res.json();
    assert.deepEqual(Object.keys(link).sort(), [
      "created",
      "origin",
      "secret",
      "url",
    ]);
    assert.ok(link.secret.length >= 8);
  });

  it("POST / en HTML (formulaire) affiche le lien créé", async () => {
    const res = await post(
      "/api-v2/",
      "url=https%3A%2F%2Fexample.org%2Fa%3Fb%3D1",
      {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    );
    assert.equal(res.status, 201);
    const html = await res.text();
    assert.match(html, /Votre lien est prêt/);
    assert.match(html, /example\.org/);
  });

  it("POST / refuse une URL invalide en JSON (400) et en HTML (400)", async () => {
    assert.equal((await post("/api-v2/", { url: "nope" })).status, 400);

    const res = await post("/api-v2/", "url=nope", {
      Accept: "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    assert.equal(res.status, 400);
    assert.match(await res.text(), /alert-error/);
  });

  it("POST / échappe le HTML saisi (pas de XSS)", async () => {
    const res = await post(
      "/api-v2/",
      "url=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    );
    assert.ok(!(await res.text()).includes("<script>alert(1)"));
  });

  it("GET /:url en JSON ne révèle jamais le secret", async () => {
    const res = await get(`/api-v2/${link.url}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(Object.keys(body).sort(), ["created", "origin", "visit"]);
  });

  it("GET /:url en HTML redirige et compte la visite", async () => {
    const res = await get(`/api-v2/${link.url}`, "text/html");
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "https://nodejs.org");

    const body = await (await get(`/api-v2/${link.url}`)).json();
    assert.equal(body.visit, 1);
  });

  it("GET /:url avec un format non géré renvoie 406", async () => {
    assert.equal(
      (await get(`/api-v2/${link.url}`, "application/xml")).status,
      406,
    );
  });

  it("le lien court à la racine redirige aussi", async () => {
    const res = await get(`/${link.url}`, "text/html");
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "https://nodejs.org");
  });

  it("DELETE : 404, 401, 403 puis 200", async () => {
    const del = (route, headers = {}) =>
      fetch(`${BASE}${route}`, {
        method: "DELETE",
        headers: { Accept: "application/json", ...headers },
      });

    assert.equal((await del("/api-v2/inconnu")).status, 404);
    assert.equal((await del(`/api-v2/${link.url}`)).status, 401);
    assert.equal(
      (await del(`/api-v2/${link.url}`, { "X-API-Key": "mauvaise" })).status,
      403,
    );
    assert.equal(
      (await del(`/api-v2/${link.url}`, { "X-API-Key": link.secret })).status,
      200,
    );
    assert.equal((await get(`/api-v2/${link.url}`)).status, 404);
  });
});

describe("Général", () => {
  it("n'expose pas X-Powered-By et ajoute X-API-version", async () => {
    const res = await get("/api-v1/");
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-api-version"), "1.0.0");
  });

  it("sert le client statique et la documentation", async () => {
    assert.equal((await get("/", "text/html")).status, 200);
    assert.equal((await get("/app.js", "*/*")).status, 200);
    assert.equal((await get("/api-docs/", "text/html")).status, 200);
    assert.equal((await get("/favicon.ico", "*/*")).status, 200);
  });

  it("renvoie une page 404 HTML pour un navigateur, JSON sinon", async () => {
    const html = await get("/nexistepas", "text/html");
    assert.equal(html.status, 404);
    assert.match(await html.text(), /Lien introuvable/);

    const json = await get("/nexistepas", "application/json");
    assert.equal(json.status, 404);
    assert.ok((await json.json()).error);
  });
});
