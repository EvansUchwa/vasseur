// Temporary QA helper: compares the word stream of each mockup page with the
// server-rendered Next page to detect missing/merged words or extra content.
import { parse, parseFragment } from "parse5";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOCKUP_DIR = process.env.MOCKUP_DIR
  ? path.resolve(process.env.MOCKUP_DIR)
  : path.join(root, "Maquette");
const BASE = process.env.QA_BASE || "http://127.0.0.1:8467";

const PAGES = {
  "Accueil.dc.html": "/",
  "Couvreur-Les-Ponts-de-Ce.dc.html": "/couvreur-les-ponts-de-ce",
  "Refection-toiture-ardoise-Angers.dc.html": "/refection-toiture-ardoise-angers",
};

const SKIP = new Set(["script", "style", "helmet", "svg", "template"]);

function texts(node, acc) {
  if (!node) return;
  if (node.nodeName === "#text") {
    acc.push(node.value);
    return;
  }
  if (node.nodeName === "#comment") return;
  if (SKIP.has(node.tagName)) return;
  for (const c of node.childNodes || []) texts(c, acc);
}

function findInTree(node, tagName) {
  if (node.nodeName === tagName) return node;
  for (const child of node.childNodes || []) {
    const hit = findInTree(child, tagName);
    if (hit) return hit;
  }
  return null;
}

const words = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []);

function expectedWords(htmlFile) {
  const raw = readFileSync(path.join(MOCKUP_DIR, htmlFile), "utf8");
  const doc = parse(raw);
  const xdc = findInTree(doc, "x-dc");
  const acc = [];
  for (const c of xdc.childNodes || []) texts(c, acc);
  return words(acc.join("\n"));
}

function domWords(html) {
  const doc = parse(html);
  const body = findInTree(doc, "body");
  const acc = [];
  for (const c of (body?.childNodes || [])) {
    if (c.tagName === "script") continue;
    texts(c, acc);
  }
  return words(acc.join("\n"));
}

function diff(a, b, label) {
  const missing = [];
  const extra = [];
  const ia = new Map();
  a.forEach((w) => ia.set(w, (ia.get(w) || 0) + 1));
  const ib = new Map();
  b.forEach((w) => ib.set(w, (ib.get(w) || 0) + 1));
  for (const [w, n] of ia) {
    const m = ib.get(w) || 0;
    if (n > m) missing.push(`${w}(${n - m})`);
  }
  for (const [w, n] of ib) {
    const m = ia.get(w) || 0;
    if (n > m) extra.push(`${w}(${n - m})`);
  }
  const ok = missing.length === 0 && extra.length === 0;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${label}: words ${a.length} vs ${b.length}`,
  );
  if (!ok) {
    console.log("  missing:", missing.slice(0, 15).join(" "));
    console.log("  extra :", extra.slice(0, 15).join(" "));
  }
  return ok;
}

for (const [file, route] of Object.entries(PAGES)) {
  const expected = expectedWords(file);
  const res = await fetch(BASE + route);
  const html = await res.text();
  const actual = domWords(html);
  diff(expected, actual, file);
}
