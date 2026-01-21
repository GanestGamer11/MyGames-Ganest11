/* =========================================================
   Meus Jogos - Vanilla JS (GitHub Pages friendly)
   Data source: /data/games.json
   Pages: index.html, year.html
   ========================================================= */

const DATA_URL = "./data/games.json";
const FALLBACK_COVER = "https://picsum.photos/seed/gamecover/800/450";

function qs(sel, el = document) { return el.querySelector(sel); }
function qsa(sel, el = document) { return [...el.querySelectorAll(sel)]; }

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function normalize(str) {
  return (str ?? "").toString().trim().toLowerCase();
}

function safeNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(str) {
  return normalize(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function statusLabel(status) {
  const s = normalize(status);
  if (s === "zerado") return "ZERADO";
  if (s === "gaveta") return "GAVETA";
  if (s === "em andamento" || s === "andamento") return "EM ANDAMENTO";
  if (s === "pendente") return "PENDENTE";
  return (status ?? "—").toString().toUpperCase();
}

function ratingClass(rating) {
  if (rating === null) return "rating--empty";
  if (rating === 10) return "rating--ten";
  if (rating >= 8) return "rating--high";
  if (rating >= 5) return "rating--mid";
  return "rating--low";
}

function ratingText(rating) {
  if (rating === null) return "—/10";
  return `${rating}/10`;
}

function gameMatchesQuery(game, query) {
  if (!query) return true;
  const t = normalize(game.title);
  return t.includes(query);
}

function sortGames(games, sortMode) {
  if (sortMode === "ratingAsc") {
    return [...games].sort((a,b) => {
      const ra = (a.rating ?? -1);
      const rb = (b.rating ?? -1);
      return ra - rb;
    });
  }
  if (sortMode === "ratingDesc") {
    return [...games].sort((a,b) => {
      const ra = (a.rating ?? -1);
      const rb = (b.rating ?? -1);
      return rb - ra;
    });
  }
  return [...games];
}

function makeCard(game) {
  const cover = game.coverUrl?.trim() ? game.coverUrl : FALLBACK_COVER;
  const rating = safeNumber(game.rating);
  const status = statusLabel(game.status);

  const div = document.createElement("article");
  div.className = "card";
  div.innerHTML = `
    <img class="cover" src="${escapeHtml(cover)}" alt="Capa de ${escapeHtml(game.title)}" loading="lazy" />
    <div class="card__body">
      <h3 class="title">${escapeHtml(game.title)}</h3>
      <div class="card__footer">
        <span class="status">${escapeHtml(status)}</span>
        <span class="rating ${ratingClass(rating)}"><span>${escapeHtml(ratingText(rating))}</span></span>
      </div>
    </div>
  `;
  return div;
}

async function loadData() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar ${DATA_URL}`);
  const json = await res.json();
  const games = Array.isArray(json.games) ? json.games : [];
  return { ...json, games };
}

/* =========================
   Stats
   ========================= */
function buildStats(games) {
  const total = games.length;
  const zerados = games.filter(g => normalize(g.status) === "zerado").length;
  const gaveta = games.filter(g => normalize(g.status) === "gaveta").length;
  const andamento = games.filter(g => normalize(g.status) === "em andamento" || normalize(g.status) === "andamento").length;
  const pendente = games.filter(g => normalize(g.status) === "pendente").length;

  return [
    { k: "Total", v: total },
    { k: "Zerados", v: zerados },
    { k: "Gaveta", v: gaveta },
    { k: "Andamento/Pendente", v: andamento + pendente },
  ];
}

function renderStats(el, games) {
  if (!el) return;
  const stats = buildStats(games);
  el.innerHTML = stats.map(s => `
    <div class="stat">
      <div class="k">${escapeHtml(s.k)}</div>
      <div class="v">${escapeHtml(String(s.v))}</div>
    </div>
  `).join("");
}

/* =========================
   Modal: cadastro futuro (JSON helper)
   ========================= */
function openAddGameModal() {
  const root = qs("#modalRoot");
  if (!root) return;

  const template = {
    id: "ex.: " + slugify("Novo Jogo"),
    title: "Novo Jogo",
    coverUrl: "",
    rating: null,
    status: "pendente",
    yearFinished: 2025,
    meta: {
      platform: "",
      hours: null,
      note: ""
    }
  };

  root.innerHTML = `
    <div class="modalBackdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal__head">
          <strong>Cadastrar jogo (modo GitHub Pages)</strong>
          <button class="btn btn--ghost" id="closeModal" type="button">Fechar</button>
        </div>
        <div class="modal__body">
          <p class="muted" style="margin-top:0">
            Por enquanto o cadastro é manual: copie o JSON abaixo e cole dentro do <code>data/games.json</code>.
            (Depois dá pra evoluir pra gerar arquivo/commit local, etc.)
          </p>

          <div class="modal__grid">
            <div>
              <label class="label">Template do jogo</label>
              <textarea id="jsonTemplate" class="textarea">${escapeHtml(JSON.stringify(template, null, 2))}</textarea>
              <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                <button id="btnCopyJson" class="btn btn--primary" type="button">Copiar JSON</button>
                <button id="btnNewId" class="btn" type="button">Gerar id pelo título</button>
              </div>
            </div>

            <div>
              <label class="label">Dica rápida</label>
              <div class="panel" style="margin-top:8px">
                <ul style="margin:0; padding-left:18px; color: rgba(255,255,255,0.75);">
                  <li><b>status</b>: "zerado", "gaveta", "em andamento", "pendente"</li>
                  <li><b>rating</b>: 0 a 10 (10 fica shiny)</li>
                  <li><b>yearFinished</b>: ano que você zerou / decidiu gaveta</li>
                  <li><b>meta</b>: campos livres (platform, hours, etc.)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const close = () => { root.innerHTML = ""; };
  qs("#closeModal")?.addEventListener("click", close);
  root.querySelector(".modalBackdrop")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modalBackdrop")) close();
  });

  qs("#btnCopyJson")?.addEventListener("click", async () => {
    const t = qs("#jsonTemplate")?.value ?? "";
    try { await navigator.clipboard.writeText(t); } catch {}
  });

  qs("#btnNewId")?.addEventListener("click", () => {
    const ta = qs("#jsonTemplate");
    if (!ta) return;
    try {
      const obj = JSON.parse(ta.value);
      obj.id = slugify(obj.title || "novo-jogo");
      ta.value = JSON.stringify(obj, null, 2);
    } catch {}
  });
}

function bindAddButtons() {
  qsa("#btnAddGame").forEach(btn => btn.addEventListener("click", openAddGameModal));
}

/* =========================
   Home
   ========================= */
async function initHome() {
  const search = qs("#homeSearch");
  const results = qs("#homeSearchResults");
  const statsEl = qs("#homeStats");

  const data = await loadData();

  // Resumo: tudo que é 2025 (zerado ou gaveta etc.)
  const homeGames = data.games.filter(g => (g.yearFinished === 2025) || normalize(g.status) === "gaveta");
  renderStats(statsEl, homeGames);

  // Chip navigation
  qsa(".chip[data-year]").forEach(btn => {
    btn.addEventListener("click", () => {
      const y = btn.getAttribute("data-year");
      window.location.href = `./year.html?year=${encodeURIComponent(y)}`;
    });
  });

  function closeResults() {
    results?.classList.remove("isOpen");
    if (results) results.innerHTML = "";
  }

  function openResults(items) {
    if (!results) return;

    if (items.length === 0) {
      results.innerHTML = `<div class="item"><span>Nenhum jogo encontrado</span><span class="tag">—</span></div>`;
      results.classList.add("isOpen");
      return;
    }

    results.innerHTML = items.slice(0, 10).map(g => {
      const tag = statusLabel(g.status);
      const year = g.yearFinished ?? "—";
      return `
        <div class="item" data-id="${escapeHtml(g.id)}">
          <span>${escapeHtml(g.title)}</span>
          <span class="tag">${escapeHtml(tag)} • ${escapeHtml(String(year))}</span>
        </div>
      `;
    }).join("");

    results.classList.add("isOpen");

    qsa(".item[data-id]", results).forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-id");
        const game = data.games.find(x => x.id === id);
        if (!game) return;

        const y = game.yearFinished ?? 2025;
        window.location.href = `./year.html?year=${encodeURIComponent(y)}&q=${encodeURIComponent(game.title)}`;
      });
    });
  }

  function runSearch() {
    const q = normalize(search?.value);
    if (!q) { closeResults(); return; }
    const matches = data.games
      .filter(g => gameMatchesQuery(g, q))
      .sort((a,b) => normalize(a.title).localeCompare(normalize(b.title)));
    openResults(matches);
  }

  search?.addEventListener("input", runSearch);
  search?.addEventListener("focus", runSearch);
  document.addEventListener("click", (e) => {
    if (!results || !search) return;
    if (results.contains(e.target) || search.contains(e.target)) return;
    closeResults();
  });
}

/* =========================
   Year page
   ========================= */
async function initYear() {
  const year = Number(getParam("year") ?? "2025");
  const qParam = normalize(getParam("q") ?? "");

  const title = qs("#yearTitle");
  const search = qs("#yearSearch");
  const sortSelect = qs("#sortSelect");
  const grid = qs("#gamesGrid");
  const empty = qs("#emptyState");
  const statsEl = qs("#yearStats");

  if (title) title.textContent = `Ano ${year}`;

  const data = await loadData();
  const base = data.games.filter(g => Number(g.yearFinished) === year);

  // Prefill search from query param (ex.: vindo da home)
  if (search && qParam) search.value = qParam;

  function render() {
    const query = normalize(search?.value);
    const sortMode = sortSelect?.value ?? "none";

    let items = base.filter(g => gameMatchesQuery(g, query));
    items = sortGames(items, sortMode);

    renderStats(statsEl, items);

    if (!grid) return;
    grid.innerHTML = "";

    if (items.length === 0) {
      empty?.classList.remove("hidden");
      return;
    }
    empty?.classList.add("hidden");

    items.forEach(g => grid.appendChild(makeCard(g)));
  }

  search?.addEventListener("input", render);
  sortSelect?.addEventListener("change", render);

  render();
}

/* =========================
   Boot
   ========================= */
(async function boot() {
  try {
    bindAddButtons();

    const isHome = !!qs("#homeSearch");
    const isYear = !!qs("#gamesGrid");

    if (isHome) await initHome();
    if (isYear) await initYear();
  } catch (err) {
    console.error(err);
  }
})();
