# Preview run doc — Couverture Vasseur (static export)

This is a Next.js (App Router) site configured for **static export**; it has no
server runtime, so the lightest preview is a plain static file server over the
`out/` directory. A dev server (`npm run dev`) is not required and does not
persist reliably in this environment — use the static export flow below.

## 1. Reproduce the artifacts

Fresh checkout needs, in order (run from the project root):

```bash
npm install
```

The exported pages are generated from the `.dc.html` mockups by a converter —
only rerun if the mockups changed:

```bash
# Mockups live outside the repo (C:/Works/Freelance/Maquetteù is the current
# updated copy). MOCKUP_DIR defaults to <project>/Maquette otherwise.
MOCKUP_DIR="C:/Works/Freelance/Maquetteù" node tools/convert-mockups.mjs

# Brand assets (favicon.ico, apple-icon.png, og-image.png) come from the logo:
node tools/build-brand.mjs

# SITE_URL sets the absolute social (og:/twitter:) URLs — default:
# https://couverture-vasseur.fr
```

Then produce the static export:

```bash
npm run build        # writes ./out (trailingSlash: true, output: "export")
```

## 2. Run the server

Serve the exported `out/` directory over HTTP (no build watcher; rebuild +
restart to pick up changes):

```bash
python -m http.server 8099 --bind 127.0.0.1 --directory out
```

- Prefer port **8099** (the project default used for previews); pick another if busy.
- The site root is `http://127.0.0.1:8099/`.
- Register the preview with `register_preview` using the python server's pid.
