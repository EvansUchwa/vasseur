/**
 * Converts the design files in /Maquette (Accueil.dc.html, …) into pixel-faithful
 * Next.js App Router pages.
 *
 * Regenerate with:  node tools/convert-mockups.mjs
 *
 * What the converter does:
 *  - parses each <x-dc> document with parse5;
 *  - unwraps <sc-if> blocks (all mockup flags default to true → content always shown);
 *  - turns inline `style` into React style objects (keeps the `font` shorthand as-is),
 *    `style-hover` into `data-hover` (applied by components/site-behavior.tsx);
 *  - replaces <image-slot> placeholders with <img> backed by /public/images photos
 *    (slots acc-ap-avant / acc-ap-apres feed the Avant/Après widget below);
 *  - detects the Avant/Après comparison widget (a div bound with dc refs,
 *    pointer handlers and a range input) and emits a single <AvantApres />
 *    client component (components/avant-apres.tsx);
 *  - rewrites the mockup's internal links (./X.dc.html → real routes), keeps same-page
 *    anchors and tel: links untouched (plain <a> so the static export navigates
 *    reliably on any host);
 *  - keeps the native <details>/<summary> FAQ (first item open, like the mockup);
 *  - tags quote forms with data-quote-form so the submit behavior matches the mockup.
 */
import { parse } from "parse5";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Where the .dc.html mockups live. Defaults to <project>/Maquette; point
// MOCKUP_DIR at another folder when the mockups sit outside the project
// (e.g. MOCKUP_DIR="C:/…/Maquetteù" to rebuild from an updated copy).
const MOCKUP_DIR = process.env.MOCKUP_DIR
  ? path.resolve(process.env.MOCKUP_DIR)
  : path.join(root, "Maquette");

const HREF_REWRITES = [
  ["./Accueil.dc.html", "/"],
  ["./Refection-toiture-ardoise-Angers.dc.html", "/refection-toiture-ardoise-angers"],
  ["./Couvreur-Les-Ponts-de-Ce.dc.html", "/couvreur-les-ponts-de-ce"],
];

// One exported photo per slot, placed by the client in /public/images and
// named after the slot id (e.g. acc-hero.jpeg).
const IMAGE_SRC = {
  "acc-hero": "/images/acc-hero.jpeg",
  "acc-real-1": "/images/acc-real-1.jpeg",
  "acc-real-2": "/images/acc-real-2.jpeg",
  "acc-real-3": "/images/acc-real-3.jpeg",
  "acc-ap-avant": "/images/acc-ap-avant.jpeg",
  "acc-ap-apres": "/images/acc-ap-apres.jpeg",
  "acc-artisan": "/images/acc-artisan.jpeg",
  "ville-hero": "/images/ville-hero.jpeg",
  "ville-real-1": "/images/ville-real-1.jpeg",
  "ville-real-2": "/images/ville-real-2.jpeg",
  "pre-hero": "/images/pre-hero.jpeg",
};

const TITLES = {
  "Accueil.dc.html":
    "Couverture Vasseur — Couvreur zingueur ardoisier à Angers (49)",
  "Couvreur-Les-Ponts-de-Ce.dc.html":
    "Couvreur aux Ponts-de-Cé (49130) — Couverture Vasseur",
  "Refection-toiture-ardoise-Angers.dc.html":
    "Réfection de toiture en ardoise à Angers — Couverture Vasseur",
};

const ROUTE_DIRS = {
  "Accueil.dc.html": "app",
  "Couvreur-Les-Ponts-de-Ce.dc.html": "app/couvreur-les-ponts-de-ce",
  "Refection-toiture-ardoise-Angers.dc.html": "app/refection-toiture-ardoise-angers",
};

const ROUTES = {
  "Accueil.dc.html": "/",
  "Couvreur-Les-Ponts-de-Ce.dc.html": "/couvreur-les-ponts-de-ce",
  "Refection-toiture-ardoise-Angers.dc.html": "/refection-toiture-ardoise-angers",
};

// Absolute public origin for the social (og:/twitter:) image URLs.
const SITE = (process.env.SITE_URL || "https://couverture-vasseur.fr").replace(
  /\/+$/,
  "",
);
const OG_IMAGE = `${SITE}/og-image.png`;

// Tags that flow inside text (spaces around them are visually meaningful).
const INLINE = new Set([
  "a", "span", "strong", "em", "u", "small", "b", "i", "br", "img",
  "label", "input", "select", "textarea", "sub", "sup", "code", "mark",
  "abbr", "bdi", "button",
]);

const VOID = new Set(["br", "img", "input", "hr", "wbr"]);

const camelize = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function styleObject(cssText) {
  const entries = [];
  for (let decl of cssText.split(";")) {
    decl = decl.trim();
    if (!decl) continue;
    const sep = decl.indexOf(":");
    if (sep < 0) continue;
    const prop = camelize(decl.slice(0, sep).trim());
    const value = decl.slice(sep + 1).trim();
    if (!prop || !value) continue;
    entries.push([prop, value]);
  }
  if (!entries.length) return null;
  return "{" + entries.map(([k, v]) => `${k}:"${escJsString(v)}"`).join(",") + "}";
}

function escJsString(s) {
  return JSON.stringify(s).slice(1, -1).replace(/"/g, '\\"');
}

function escAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textLiteral(text) {
  return `{${JSON.stringify(text)}}`;
}

function rewriteHref(href) {
  for (const [from, to] of HREF_REWRITES) {
    if (href === from || href.startsWith(from)) {
      return to + href.slice(from.length);
    }
  }
  return href;
}

function findInTree(node, tagName) {
  if (node.nodeName === tagName) return node;
  for (const child of node.childNodes || []) {
    const hit = findInTree(child, tagName);
    if (hit) return hit;
  }
  return null;
}

const INDENT = "  ";

class Emitter {
  constructor() {
    this.lines = [];
    this.avantApres = false; // set when the Avant/Après widget is emitted
  }
  emitLine(indent, text) {
    this.lines.push(INDENT.repeat(indent) + text);
  }
}

const isWhitespaceOnly = (n) =>
  n.nodeName === "#text" && n.value.trim().length === 0;

// nearest child with real content, skipping whitespace-only text nodes
function prevContent(kids, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (!isWhitespaceOnly(kids[j])) return kids[j];
  }
  return null;
}
function nextContent(kids, i) {
  for (let j = i + 1; j < kids.length; j++) {
    if (!isWhitespaceOnly(kids[j])) return kids[j];
  }
  return null;
}

const isTextish = (n) => n.nodeName === "#text";
const isInlineNode = (n) => n.nodeName === "#text" || INLINE.has(n.tagName);

function emitText(node, parent, prev, next, depth, out) {
  const leadSpace = /^\s/.test(node.value);
  const trailSpace = /\s$/.test(node.value);
  let text = node.value.replace(/\s+/g, " ").trim();
  if (!text) return;
  const parentInline = INLINE.has(parent.tagName);
  const keepLead =
    leadSpace &&
    ((prev && (isTextish(prev) || INLINE.has(prev.tagName))) ||
      (!prev && parentInline));
  const keepTrail =
    trailSpace &&
    ((next && (isTextish(next) || INLINE.has(next.tagName))) ||
      (!next && parentInline));
  let t = text;
  if (keepLead) t = " " + t;
  if (keepTrail) t = t + " ";
  if (t.trim().length === 0) return;
  out.emitLine(depth, textLiteral(t));
}

function collectAttr(el, name) {
  const attr = (el.attrs || []).find((a) => a.name === name);
  return attr ? attr.value : null;
}

function findSlotById(node, id) {
  if (node.tagName === "image-slot" && collectAttr(node, "id") === id) return node;
  for (const child of node.childNodes || []) {
    const hit = findSlotById(child, id);
    if (hit) return hit;
  }
  return null;
}

function emitChildren(el, depth, out) {
  const parent = el;
  const kids = el.childNodes || [];
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.nodeName === "#text") {
      if (isWhitespaceOnly(child)) {
        const prev = prevContent(kids, i);
        const next = nextContent(kids, i);
        const prevInline = prev && isInlineNode(prev);
        const nextInline = next && isInlineNode(next);
        // A whitespace run between two inline-flow siblings renders as one space.
        if (prev && next && (prevInline || nextInline)) {
          out.emitLine(depth, textLiteral(" "));
        }
        continue;
      }
      emitText(child, parent, prevContent(kids, i), nextContent(kids, i), depth, out);
    } else {
      emitElement(child, depth, out);
    }
  }
}

function attrsToProps(el) {
  const props = [];
  for (const attr of el.attrs || []) {
    const name = attr.name;
    const value = attr.value;
    switch (name) {
      case "style": {
        const obj = styleObject(value);
        if (obj) props.push(`style={css(${obj})}`);
        break;
      }
      case "class":
        props.push(`className="${escAttr(value)}"`);
        break;
      case "style-hover":
        props.push(`data-hover="${escAttr(value)}"`);
        break;
      case "onSubmit":
        break; // handled via data-quote-form + components/site-behavior.tsx
      case "open":
        props.push("open");
        break;
      case "href": {
        const rewritten =
          el.tagName === "a" ? rewriteHref(value) : value;
        props.push(`href="${escAttr(rewritten)}"`);
        break;
      }
      case "src":
        props.push(
          `src="${escAttr(
            value === "./assets/logo-vasseur.png" ? "/logo-vasseur.png" : value,
          )}"`,
        );
        break;
      default:
        if (/^on/i.test(name)) break; // drop event handlers (see site-behavior)
        if (value.includes("{{")) break; // dc runtime binding (ref/onX)
        if (name === "rows" && /^\d+$/.test(value)) {
          props.push(`rows={${Number(value)}}`);
          break;
        }
        props.push(`${name}="${escAttr(value)}"`);
        break;
    }
  }
  return props;
}

function elementOpen(el) {
  const props = attrsToProps(el);
  if (el.tagName === "form") props.push('data-quote-form=""');
  const tag = el.tagName;
  const joined = props.length ? " " + props.join(" ") : "";
  return { open: `<${tag}${joined}>`, tag };
}

function emitElement(el, depth, out) {
  if (el.tagName === "helmet" || el.tagName === "sc-if") {
    emitChildren(el, depth, out);
    return;
  }
  // Avant/Après comparison widget: the maquette binds React refs, pointer
  // handlers and a range input on a <div>. Swap the whole block for the
  // <AvantApres/> client component (see components/avant-apres.tsx).
  if (
    el.tagName === "div" &&
    (el.attrs || []).some((a) => a.name.toLowerCase() === "onpointerdown")
  ) {
    const avantEl = findSlotById(el, "acc-ap-avant");
    const apresEl = findSlotById(el, "acc-ap-apres");
    const slotSrc = (slot) => (slot ? IMAGE_SRC[collectAttr(slot, "id")] || "" : "");
    const slotAlt = (slot) => (slot ? collectAttr(slot, "placeholder") || "" : "");
    const props = [];
    for (const [prop, slot] of [
      ["avant", avantEl],
      ["apres", apresEl],
    ]) {
      if (slotSrc(slot)) props.push(`${prop}="${escAttr(slotSrc(slot))}"`);
    }
    for (const [prop, slot] of [
      ["avantAlt", avantEl],
      ["apresAlt", apresEl],
    ]) {
      if (slotAlt(slot)) props.push(`${prop}="${escAttr(slotAlt(slot))}"`);
    }
    out.emitLine(depth, `<AvantApres ${props.join(" ")} />`);
    out.avantApres = true;
    return;
  }
  if (el.tagName === "image-slot") {
    const id = collectAttr(el, "id");
    const placeholder = collectAttr(el, "placeholder") || "";
    const src = IMAGE_SRC[id] || "";
    const ownStyle = collectAttr(el, "style") || "";
    const style = styleObject(`${ownStyle};object-fit:cover;width:100%;height:100%`);
    const attrs = [
      `src="${escAttr(src)}"`,
      `alt="${escAttr(placeholder)}"`,
      style ? `style={css(${style})}` : null,
    ].filter(Boolean);
    out.emitLine(depth, `<img ${attrs.join(" ")} />`);
    return;
  }
  const { open, tag } = elementOpen(el);
  const hasContent = (el.childNodes || []).some((c) => {
    if (c.nodeName === "#text") return c.value.trim().length > 0;
    return c.tagName !== "helmet" && c.tagName !== "sc-if";
  });
  if (!hasContent) {
    out.emitLine(depth, open.replace(/>$/, " />"));
    return;
  }
  out.emitLine(depth, open);
  emitChildren(el, depth + 1, out);
  out.emitLine(depth, `</${tag}>`);
}

function buildJsx(xdc) {
  const out = new Emitter();
  for (const child of xdc.childNodes || []) {
    if (child.nodeName === "#text") {
      if (child.value.trim().length) {
        emitChildren({ childNodes: [child] }, 0, out);
      }
    } else if (child.tagName !== "helmet") {
      emitElement(child, 0, out);
    }
  }
  return { jsx: out.lines.join("\n"), avantApres: out.avantApres };
}

function metaDescription(fileText) {
  const m = fileText.match(/<meta name="description" content="([^"]*)"/);
  return m ? m[1] : "";
}

function convert(htmlFile) {
  const fileText = readFileSync(path.join(MOCKUP_DIR, htmlFile), "utf8");
  const doc = parse(fileText);
  const xdc = findInTree(doc, "x-dc");
  if (!xdc) throw new Error(`No <x-dc> found in ${htmlFile}`);
  const { jsx, avantApres } = buildJsx(xdc);
  const description = metaDescription(fileText).replace(/"/g, '\\"');
  const imports = [
    'import type { CSSProperties } from "react";',
    'import type { Metadata } from "next";',
    avantApres
      ? 'import { AvantApres } from "@/components/avant-apres";'
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const title = TITLES[htmlFile] || "";
  const ogTitle = title.replace(/\s*—\s*Couverture Vasseur.*$/i, "");
  const openGraph = {
    title: title || ogTitle,
    description,
    type: "website",
    locale: "fr_FR",
    url: `${SITE}${ROUTES[htmlFile] || "/"}`,
    siteName: "Couverture Vasseur",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Couverture Vasseur — couvreur zingueur ardoisier à Angers",
      },
    ],
  };
  const twitter = {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMAGE],
  };
  const out = `// Generated from Maquette/${htmlFile} by tools/convert-mockups.mjs — do not edit by hand.
${imports}

const css = (o: Record<string, string>): CSSProperties =>
  o as unknown as CSSProperties;

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
  openGraph: ${JSON.stringify(openGraph)},
  twitter: ${JSON.stringify(twitter)},
};

export default function Page() {
  return (
${jsx}
  );
}
`;
  return out;
}

for (const htmlFile of Object.keys(ROUTE_DIRS)) {
  const dir = path.join(root, ROUTE_DIRS[htmlFile]);
  mkdirSync(dir, { recursive: true });
  const page = path.join(dir, "page.tsx");
  writeFileSync(page, convert(htmlFile));
  console.log("wrote", path.relative(root, page));
}
