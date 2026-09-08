/* dwport — shared site script. No build step; each page sets data-page on <body>. */
(function () {
  const SECTIONS = [
    { slug: "ceramics",  title: "Ceramics",            kind: "gallery" },
    { slug: "film",      title: "Film",         kind: "gallery" },
    { slug: "sculpture", title: "Sculpture",           kind: "gallery" },
    { slug: "painting",  title: "Painting & Drawing",  kind: "gallery" },
    { slug: "writing",   title: "Writing",             kind: "writing" },
    { slug: "cs",        title: "Computation",         kind: "cs" },
    { slug: "piano",     title: "Piano",               kind: "piano" },
    { slug: "goodreads", title: "Books",           kind: "goodreads" },
    { slug: "about",     title: "About",               kind: "about" },
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "text") n.textContent = v;
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) n.append(c);
    return n;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  /* ---------- header / footer ---------- */
  function renderChrome() {
    const page = document.body.dataset.page || "home";
    const header = $("#site-header");
    if (header) {
      const nav = el("nav", { class: "nav", id: "nav", "aria-label": "Sections" });
      nav.append(el("a", { href: "index.html", text: "Home", ...(page === "home" ? { "aria-current": "page" } : {}) }));
      SECTIONS.forEach((s) => {
        nav.append(el("a", { href: `${s.slug}.html`, text: s.title, ...(page === s.slug ? { "aria-current": "page" } : {}) }));
      });
      const toggle = el("button", { class: "nav-toggle", "aria-expanded": "false", "aria-controls": "nav", text: "Menu" });
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "Close" : "Menu";
      });
      header.append(
        el("div", { class: "wrap" }, [
          el("a", { class: "brand", href: "index.html" }, [document.createTextNode(window.SITE?.name || "Portfolio")]),
          toggle,
          nav,
        ])
      );
    }
    const footer = $("#site-footer");
    if (footer) {
      footer.append(
        el("span", { text: `© ${new Date().getFullYear()} ${window.SITE?.name || ""}` }),
        el("span", { text: "The only constant is change" }),
      );
    }
  }

  /* ---------- home ---------- */
  async function renderHome() {
    const img = $("#hero-image");
    if (!img) return;
    const data = await loadJSON("data/home.json");
    img.src = data.hero;
    img.alt = data.alt || "";
  }

  /* ---------- gallery + lightbox ---------- */
  async function renderGallery() {
    const slug = document.body.dataset.page;
    const grid = $("#masonry");
    if (!grid) return;
    const data = await loadJSON(`data/${slug}.json`);
    setHead(data);
    const items = (data.items || []).slice();
    if (data.sort !== "manual") items.sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")));
    if (!items.length) { grid.replaceWith(el("p", { class: "empty", text: "Nothing here yet. Add entries to data/" + slug + ".json." })); return; }
    const isGrid = data.layout === "grid";
    const grouped = items.some((it) => it.group);
    // group -> container grid. Ungrouped: a single grid.
    const grids = new Map();
    const gridFor = (name) => {
      if (grids.has(name)) return grids.get(name);
      let g = grid;
      if (grouped) {
        g = el("div", { class: "masonry" });
        const titled = data.groupTitles !== false;
        grid.append(el("section", { class: "group" }, [titled ? el("h2", { text: name }) : null, el("hr", { class: "rule rule--thin" }), g]));
      }
      if (isGrid) g.classList.add("masonry--grid");
      grids.set(name, g);
      return g;
    };
    if (grouped) grid.className = "groups";
    items.forEach((it, i) => {
      const target = gridFor(it.group || "");
      const img = el("img", { src: it.src, alt: it.alt || it.title || "", loading: "lazy" });
      const fig = el("figure", { class: "piece", tabindex: "0", role: "button", "aria-label": `Open ${it.title || "image"}` }, [img]);
      fig.addEventListener("click", () => openLightbox(items, i));
      fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(items, i); } });
      target.append(fig); // attach before measuring: cached images are "complete" immediately
      if (isGrid) {
        const place = () => {
          if (img.naturalWidth > img.naturalHeight) fig.classList.add("piece--wide");
          sizeGridItem(fig, target);
        };
        if (img.complete && img.naturalWidth) place(); else img.addEventListener("load", place);
      }
    });
  }

  /* grid masonry: span rows to match each image's rendered height */
  function sizeGridItem(fig, grid) {
    const row = parseFloat(getComputedStyle(grid).gridAutoRows) || 8;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const img = fig.querySelector("img");
    if (!img.naturalWidth) return;
    const w = fig.getBoundingClientRect().width - 2; // inside 1px borders
    if (w <= 0) { requestAnimationFrame(() => sizeGridItem(fig, grid)); return; } // not laid out yet
    const h = w * img.naturalHeight / img.naturalWidth + 2;
    fig.style.gridRowEnd = `span ${Math.ceil((h + gap) / (row + gap))}`;
  }
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll(".masonry--grid").forEach((g) => g.querySelectorAll(".piece").forEach((f) => sizeGridItem(f, g)));
    }, 100);
  });

  let lb, lbIdx = 0, lbItems = [];
  function ensureLightbox() {
    if (lb) return lb;
    lb = el("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer" }, [
      el("button", { class: "lb-close", text: "Close ×" }),
      el("button", { class: "lb-prev", text: "← Prev" }),
      el("img", { alt: "" }),
      el("button", { class: "lb-next", text: "Next →" }),
      el("div", { class: "lb-cap" }, [el("span", { class: "cap-main" }), el("span", { class: "desc" }), el("span", { class: "cap-idx" })]),
    ]);
    document.body.append(lb);
    $(".lb-close", lb).onclick = closeLightbox;
    $(".lb-prev", lb).onclick = () => showLightbox(lbIdx - 1);
    $(".lb-next", lb).onclick = () => showLightbox(lbIdx + 1);
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showLightbox(lbIdx - 1);
      if (e.key === "ArrowRight") showLightbox(lbIdx + 1);
    });
    return lb;
  }
  function openLightbox(items, i) { lbItems = items; ensureLightbox().classList.add("open"); document.body.style.overflow = "hidden"; showLightbox(i); }
  function closeLightbox() { lb.classList.remove("open"); document.body.style.overflow = ""; }
  function showLightbox(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    const it = lbItems[lbIdx];
    $("img", lb).src = it.full || it.src;
    $("img", lb).alt = it.alt || it.title || "";
    $(".cap-main", lb).textContent = [it.title, it.medium, it.year].filter(Boolean).join(" · ");
    $(".desc", lb).textContent = it.caption || "";
    $(".cap-idx", lb).textContent = `${pad(lbIdx + 1)} / ${pad(lbItems.length)}`;
  }

  function setHead(data) {
    if (data.intro && $("#intro")) $("#intro").textContent = data.intro;
    if ($("#meta")) $("#meta").textContent = data.meta || `${(data.items || data.pieces || data.projects || data.recordings || data.books || []).length} entries`;
  }

  /* ---------- writing (password gate) ---------- */
  const WRITING_PASSWORD = "whatismywriting?";
  const WRITING_MESSAGE = "Nice try, you'll have to ask me in person";
  async function renderWriting() {
    const form = $("#gate");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = $("#pw", form).value;
      if (val === WRITING_PASSWORD) {
        form.hidden = true;
        const out = $("#gate-result");
        out.hidden = false;
        out.append(el("p", { text: WRITING_MESSAGE }));
      } else {
        $("#gate-msg").textContent = "Wrong password.";
        $("#pw", form).select();
      }
    });
  }

  /* ---------- cs projects ---------- */
  async function renderCS() {
    const wrap = $("#projects");
    const data = await loadJSON("data/cs.json");
    setHead(data);
    const projects = data.projects || [];
    if (!projects.length) { wrap.replaceWith(el("p", { class: "empty", text: "Nothing here yet." })); return; }
    projects.forEach((p) => {
      const yt = p.video && youtubeId(p.video);
      const media = [];
      if (yt) media.push(el("iframe", { class: "frame", src: `https://www.youtube-nocookie.com/embed/${yt}`, title: p.name, allow: "encrypted-media; picture-in-picture", allowfullscreen: "", loading: "lazy" }));
      (p.docs || []).forEach((d) => {
        media.push(el("a", { class: "doc", href: d.file, target: "_blank", rel: "noopener" }, [
          el("div", { class: "doc-thumb" }, [d.thumb ? el("img", { src: d.thumb, alt: `${p.name} ${d.label}`, loading: "lazy" }) : null]),
          el("span", { class: "doc-label" }, [document.createTextNode(d.label), el("span", { class: "doc-ext", text: (d.file.split(".").pop() || "").toUpperCase() })]),
        ]));
      });
      wrap.append(
        el("section", { class: "project" }, [
          el("div", { class: "project-head" }, [
            el("h2", { text: p.name }),
            p.year ? el("span", { class: "mono project-year", text: p.year }) : null,
          ]),
          el("hr", { class: "rule rule--thin" }),
          el("div", { class: "project-body" }, [
            el("div", { class: "project-text" }, [
              p.tagline ? el("p", { class: "tagline", text: p.tagline }) : null,
              ...(p.paragraphs || []).map((t) => el("p", { text: t })),
              (p.links || []).length ? el("div", { class: "links" }, p.links.map((l) => el("a", { href: l.url, target: "_blank", rel: "noopener", text: l.label + " →" }))) : null,
            ]),
            media.length ? el("div", { class: "project-media" }, media) : null,
          ]),
        ])
      );
    });
  }

  /* ---------- piano ---------- */
  function youtubeId(url) {
    const m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  async function renderPiano() {
    const wrap = $("#recordings");
    const data = await loadJSON("data/piano.json");
    setHead(data);
    const recs = data.recordings || [];
    if (!recs.length) { wrap.replaceWith(el("p", { class: "empty", text: "Nothing here yet." })); return; }
    recs.forEach((r) => {
      let media = null;
      const yt = r.youtube && youtubeId(r.youtube);
      if (yt) media = el("iframe", { class: "frame", src: `https://www.youtube-nocookie.com/embed/${yt}`, title: r.title, allow: "encrypted-media; picture-in-picture", allowfullscreen: "", loading: "lazy" });
      else if (r.audio) media = el("audio", { controls: "", preload: "none", src: r.audio });
      wrap.append(
        el("article", { class: "rec" }, [
          el("div", { class: "rec-head" }, [el("h3", { text: r.title }), el("span", { class: "composer", text: [r.composer, r.recorded].filter(Boolean).join(" · ") })]),
          media,
          r.note ? el("p", { class: "note", text: r.note }) : null,
        ])
      );
    });
  }

  /* ---------- books ---------- */
  async function renderGoodreads() {
    const shelf = $("#shelf");
    const data = await loadJSON("data/goodreads.json");
    setHead(data);
    if (data.profile && $("#gr-link")) { $("#gr-link").href = data.profile; $("#gr-link").hidden = false; }
    const books = data.books || [];
    if (!books.length) { shelf.append(el("p", { class: "empty", text: "No books yet." })); return; }
    books.forEach((b) => {
      const cover = b.cover
        ? el("img", { src: b.cover, alt: `${b.title} cover`, loading: "lazy" })
        : el("div", { class: "fallback", text: b.title });
      const stars = b.rating ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating) : "";
      shelf.append(
        el("a", { class: "book", href: b.link || "#", target: b.link ? "_blank" : null, rel: "noopener", title: [b.title, b.author, b.year].filter(Boolean).join(" · ") }, [
          el("div", { class: "cover" }, [cover]),
          el("div", { class: "b-title", text: b.title }),
          el("div", { class: "b-author", text: b.author || "" }),
          stars ? el("div", { class: "b-rating", text: stars }) : null,
        ])
      );
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    renderChrome();
    const page = document.body.dataset.page || "home";
    const kind = page === "home" ? "home" : (SECTIONS.find((s) => s.slug === page) || {}).kind;
    try {
      if (kind === "home") await renderHome();
      else if (kind === "gallery") await renderGallery();
      else if (kind === "writing") await renderWriting();
      else if (kind === "cs") await renderCS();
      else if (kind === "piano") await renderPiano();
      else if (kind === "goodreads") await renderGoodreads();
    } catch (err) {
      console.error(err);
      const main = $("main .wrap") || document.body;
      main.append(el("p", { class: "empty", text: "Could not load content. If you opened this file directly, serve it over HTTP (see README)." }));
    }
  });
})();
