/* dwport — shared site script. No build step; each page sets data-page on <body>. */
(function () {
  const SECTIONS = [
    { slug: "ceramics",  title: "Ceramics",            kind: "gallery" },
    { slug: "sculpture", title: "Sculpture",           kind: "gallery" },
    { slug: "painting",  title: "Painting & Drawing",  kind: "gallery" },
    { slug: "film",      title: "Film Photos",         kind: "gallery" },
    { slug: "writing",   title: "Writing",             kind: "writing" },
    { slug: "cs",        title: "CS Projects",         kind: "cs" },
    { slug: "piano",     title: "Piano",               kind: "piano" },
    { slug: "goodreads", title: "Goodreads",           kind: "goodreads" },
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
        el("a", { href: "https://github.com/dxwu/dwport", text: "Source" })
      );
    }
  }

  /* ---------- home ---------- */
  async function renderHome() {
    const grid = $("#tiles");
    if (!grid) return;
    let covers = {};
    try { covers = await loadJSON("data/home.json"); } catch (e) { /* optional */ }
    SECTIONS.forEach((s, i) => {
      const c = covers[s.slug] || {};
      const img = c.image
        ? el("div", { class: "tile-img" }, [el("img", { src: c.image, alt: c.alt || s.title, loading: "lazy" })])
        : el("div", { class: "tile-img", style: `background:${c.color || "var(--paper-2)"}` });
      grid.append(
        el("a", { class: "tile", href: `${s.slug}.html` }, [
          img,
          el("div", { class: "tile-body" }, [
            el("h3", { text: s.title }),
          ]),
          el("span", { class: "arrow", text: "→" }),
        ])
      );
    });
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
    items.forEach((it, i) => {
      const fig = el("figure", { class: "piece", tabindex: "0", role: "button", "aria-label": `Open ${it.title || "image"}` }, [
        el("img", { src: it.src, alt: it.alt || it.title || "", loading: "lazy" }),
      ]);
      fig.addEventListener("click", () => openLightbox(items, i));
      fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(items, i); } });
      grid.append(fig);
    });
  }

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

  /* ---------- writing ---------- */
  async function renderWriting() {
    const list = $("#writing-list");
    const article = $("#article");
    const data = await loadJSON("data/writing.json");
    const slug = new URLSearchParams(location.search).get("p");
    const pieces = (data.pieces || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (slug) {
      const piece = pieces.find((p) => p.slug === slug);
      list.hidden = true;
      article.hidden = false;
      if (!piece) { article.append(el("p", { class: "empty", text: "Piece not found." })); return; }
      document.title = `${piece.title} — ${window.SITE?.name || ""}`;
      const md = await (await fetch(piece.file)).text();
      const body = window.marked ? window.marked.parse(md) : `<pre>${esc(md)}</pre>`;
      article.append(
        el("a", { class: "back", href: "writing.html", text: "← All writing" }),
        el("h1", { text: piece.title }),
        el("div", { class: "date", text: [piece.date, piece.kind].filter(Boolean).join(" · ") }),
        el("div", { class: "body", html: body })
      );
      return;
    }
    setHead(data);
    if (!pieces.length) { list.append(el("p", { class: "empty", text: "Nothing here yet." })); return; }
    pieces.forEach((p) => {
      list.append(
        el("div", { class: "row" }, [
          el("span", { class: "date", text: p.date || "" }),
          el("div", {}, [
            el("h3", {}, [el("a", { class: "title", href: p.external || `writing.html?p=${encodeURIComponent(p.slug)}`, text: p.title, ...(p.external ? { target: "_blank", rel: "noopener" } : {}) })]),
            p.summary ? el("p", { class: "sub", text: p.summary }) : null,
          ]),
          el("div", { class: "tags" }, (p.tags || [p.kind]).filter(Boolean).map((t) => el("span", { class: "tag", text: t }))),
        ])
      );
    });
  }

  /* ---------- cs projects ---------- */
  async function renderCS() {
    const grid = $("#cards");
    const data = await loadJSON("data/cs.json");
    setHead(data);
    const projects = data.projects || [];
    if (!projects.length) { grid.replaceWith(el("p", { class: "empty", text: "Nothing here yet." })); return; }
    projects.forEach((p, i) => {
      const links = [];
      if (p.repo) links.push(el("a", { href: p.repo, target: "_blank", rel: "noopener", text: "Code" }));
      if (p.demo) links.push(el("a", { href: p.demo, target: "_blank", rel: "noopener", text: "Demo" }));
      if (p.writeup) links.push(el("a", { href: p.writeup, text: "Write-up" }));
      grid.append(
        el("article", { class: "card" }, [
          el("span", { class: "card-num", text: `${pad(i + 1)} · ${p.year || ""}` }),
          el("h3", { text: p.name }),
          el("p", { text: p.description || "" }),
          el("div", { class: "tags" }, (p.stack || []).map((t) => el("span", { class: "tag", text: t }))),
          el("div", { class: "links" }, links),
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

  /* ---------- goodreads ---------- */
  async function renderGoodreads() {
    const shelf = $("#shelf");
    const tabs = $("#shelf-tabs");
    const data = await loadJSON("data/goodreads.json");
    setHead(data);
    if (data.profile && $("#gr-link")) { $("#gr-link").href = data.profile; $("#gr-link").hidden = false; }
    const books = data.books || [];
    const shelves = [...new Set(books.map((b) => b.shelf || "read"))];
    let current = shelves[0];
    const draw = () => {
      shelf.innerHTML = "";
      const list = books.filter((b) => (b.shelf || "read") === current);
      if (!list.length) { shelf.append(el("p", { class: "empty", text: "Empty shelf." })); return; }
      list.forEach((b) => {
        const cover = b.cover
          ? el("img", { src: b.cover, alt: `${b.title} cover`, loading: "lazy" })
          : el("div", { class: "fallback", text: b.title });
        const stars = b.rating ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating) : "";
        shelf.append(
          el("a", { class: "book", href: b.link || "#", target: b.link ? "_blank" : null, rel: "noopener" }, [
            el("div", { class: "cover" }, [cover]),
            el("div", { class: "b-title", text: b.title }),
            el("div", { class: "b-author", text: b.author || "" }),
            stars ? el("div", { class: "b-rating", text: stars }) : null,
          ])
        );
      });
    };
    shelves.forEach((s) => {
      const b = el("button", { role: "tab", "aria-selected": String(s === current), text: s.replace(/-/g, " ") });
      b.onclick = () => { current = s; [...tabs.children].forEach((c) => c.setAttribute("aria-selected", String(c === b))); draw(); };
      tabs.append(b);
    });
    draw();
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
