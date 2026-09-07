# dwport

Personal portfolio: ceramics, sculpture, painting & drawing, film photos, writing, CS projects, piano, Goodreads, about.

Static HTML/CSS/JS. No build step. Hosted on GitHub Pages.

## Layout

```
index.html            landing page (tiles)
<section>.html        one page per section
css/style.css         all styles
js/main.js            nav, galleries, lightbox, lists
data/<section>.json   content for each section
writing/*.md          essays, rendered client-side
images/<section>/     your images
```

## Adding content

| Section | Do this |
|---|---|
| Ceramics / Sculpture / Painting / Film | Put the image in `images/<section>/`, add an entry to `data/<section>.json` (`src`, `title`, `medium`, `year`, optional `caption`, optional `full` for a larger lightbox image). |
| Writing | Write `writing/<slug>.md`, add an entry to `data/writing.json`. |
| CS projects | Edit `data/cs.json`. |
| Piano | Edit `data/piano.json`. Use a `youtube` URL or an `audio` file path. |
| Goodreads | Edit `data/goodreads.json`. Books group by `shelf`. |
| Home tiles | Cover images and blurbs live in `data/home.json`. |
| About | Edit `about.html` directly. Portrait goes at `images/about/portrait.jpg`. |

Galleries sort newest `year` first. Set `"sort": "manual"` in a section's JSON to keep file order.

Image tips: export JPEGs at roughly 1600px on the long edge, under ~500 KB each. Placeholder SVGs are in each `images/` folder; delete them once real work is in.

## Preview locally

JSON is loaded with `fetch`, so the site must be served over HTTP:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

1. Push to `master`.
2. GitHub repo → Settings → Pages → Source: "Deploy from a branch", branch `master`, folder `/ (root)`.
3. Site appears at `https://dxwu.github.io/dwport/`.

`.nojekyll` is present so GitHub serves files as-is.
