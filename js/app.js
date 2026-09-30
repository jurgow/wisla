/* ===== WISŁA - APP BOOTSTRAP, ROTEAMENTO & NAVEGAÇÃO ===== */

let currentHomeView = localStorage.getItem("wislaHomeView") || "cards";
let currentPieceCategory = "all";

function openSidebar() {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("sidebarOverlay");
  if (sb) sb.classList.add("active");
  if (ov) ov.classList.add("active");
}

function closeSidebar() {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("sidebarOverlay");
  if (sb) sb.classList.remove("active");
  if (ov) ov.classList.remove("active");
}

function go(h) {
  if (location.hash === h) {
    route();
  } else {
    location.hash = h;
  }
}

/* Sincronização inteligente sem polling: apenas checagem ultra-leve de 15 bytes ao focar ou reabrir a aba */
let lastFocusCheck = 0;
function checkCloudOnActive() {
  const now = Date.now();
  if (now - lastFocusCheck < 30000) return; // Mínimo de 30 segundos entre checagens
  lastFocusCheck = now;
  if (document.visibilityState === "visible" && getCloudDbUrl()) {
    cloudSyncPull(false);
  }
}

/* ===== ROTEAMENTO ===== */
function route() {
  closeSidebar();
  const h = location.hash || "#/";
  
  // Protege rotas exclusivas para Master (Backup e Banco Geral de Fotos)
  if ((h === "#/backup" || h.startsWith("#/banco")) && !isMasterUnlocked) {
    go("#/");
    return;
  }

  // Redireciona dançarinos (removido do menu) para home
  if (h === "#/dancarinos") {
    go("#/");
    return;
  }

  // Atualiza sidebar desktop & mobile
  document.querySelectorAll(".sidebar .nav-item").forEach(b => {
    const nav = b.dataset.nav;
    const isAct = (nav === "#/" && (h === "#/" || h.startsWith("#/traje/"))) ||
                  (nav === "#/pecas" && (h === "#/pecas" || h.startsWith("#/compartilhadas") || h.startsWith("#/comuns"))) ||
                  (nav === "#/banco" && h.startsWith("#/banco")) ||
                  (nav === "#/backup" && h.startsWith("#/backup"));
    b.classList.toggle("active", isAct);
  });

  // Atualiza bottom bar mobile
  document.querySelectorAll(".mobile-nav-btn").forEach(b => {
    const nav = b.dataset.nav;
    if (nav) {
      const isAct = (nav === "#/" && (h === "#/" || h.startsWith("#/traje/"))) ||
                    (nav === "#/pecas" && (h === "#/pecas" || h.startsWith("#/compartilhadas") || h.startsWith("#/comuns")));
      b.classList.toggle("active", isAct);
    }
  });

  window.scrollTo(0, 0);
  if (h.startsWith("#/traje/")) {
    viewCostume(h.slice(8));
  } else if (h === "#/pecas") {
    viewPieces();
  } else if (h.startsWith("#/compartilhadas/") || h.startsWith("#/comuns/")) {
    const cid = h.split("/")[2];
    if (cid) viewCommon(cid);
    else { currentPieceCategory = "compartilhadas"; viewPieces(); }
  } else if (h === "#/compartilhadas" || h === "#/comuns") {
    currentPieceCategory = "compartilhadas";
    viewPieces();
  } else if (h === "#/backup") {
    viewBackup();
  } else if (h.startsWith("#/banco")) {
    viewBank();
  } else {
    viewHome();
  }
}

/* ===== CONFIGURAÇÃO DE LISTENERS GLOBAIS DO DOM ===== */
function setupGlobalListeners() {
  // Drawer & Menu Lateral Listeners
  const menuToggleBtn = document.getElementById("menuToggleBtn");
  if (menuToggleBtn) menuToggleBtn.onclick = openSidebar;
  const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
  if (sidebarCloseBtn) sidebarCloseBtn.onclick = closeSidebar;
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  if (mobileMenuBtn) mobileMenuBtn.onclick = openSidebar;

  // Busca Global
  const globalSearchInp = document.getElementById("globalSearchInput");
  if (globalSearchInp) {
    globalSearchInp.oninput = e => {
      const q = norm(e.target.value);
      if (!q) return;
      if (!location.hash.startsWith("#/pecas")) go("#/pecas");
      const subInp = document.getElementById("q");
      if (subInp) {
        subInp.value = e.target.value;
        subInp.dispatchEvent(new Event("input"));
      }
    };
  }

  window.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const inp = document.getElementById("globalSearchInput");
      if (inp) inp.focus();
    }
  });

  document.addEventListener("visibilitychange", checkCloudOnActive);
  window.addEventListener("focus", checkCloudOnActive);

  // Navegação
  document.querySelectorAll(".sidebar .nav-item[data-nav]").forEach(b => b.onclick = () => { closeSidebar(); go(b.dataset.nav); });
  document.querySelectorAll(".mobile-nav-btn[data-nav]").forEach(b => b.onclick = () => { closeSidebar(); go(b.dataset.nav); });
  window.addEventListener("hashchange", route);

  // Room Switchers e Auth
  const openRoomBtn = document.getElementById("openRoomSwitcherBtn");
  if (openRoomBtn) openRoomBtn.onclick = openRoomSwitcher;
  const sideQuickBtn = document.getElementById("sideQuickSwitchBtn");
  if (sideQuickBtn) sideQuickBtn.onclick = openRoomSwitcher;

  const cloudPill = document.getElementById("cloudPill");
  if (cloudPill) {
    cloudPill.onclick = () => {
      toast("🔄 Sincronizando com a nuvem...");
      cloudSyncPull(true);
    };
  }

  const authPill = document.getElementById("authPill");
  if (authPill) {
    authPill.onclick = () => {
      const r = getActiveRoom();
      if (isCurrentRoomUnlocked()) {
        if (isMasterUnlocked) setMasterUnlocked(false);
        setRoomUnlocked(r.id, false);
        toast("Sala bloqueada em Modo Consulta 🔒");
        route();
        return;
      }
      openAuthModal();
    };
  }

  if (typeof setupAdminListeners === "function") {
    setupAdminListeners();
  }
}

/* ===== INICIALIZAÇÃO AUTOMÁTICA OFFLINE & NUVEM ===== */
(async () => {
  let raw = null;
  try {
    raw = await loadState();
  } catch (e) {}
  
  // Se IndexedDB estiver vazio ou sem trajes, carrega dados padrão embutidos com prioridade zero
  const hasCostumes = raw && raw.rooms && Object.values(raw.rooms).some(r => r.costumes && r.costumes.length > 0);
  if (!raw || !hasCostumes) {
    if (window.WISLA_DEFAULT_DATA) {
      raw = JSON.parse(JSON.stringify(window.WISLA_DEFAULT_DATA));
      raw.lastModified = 0; // Fallback estático sempre tem prioridade zero
    } else {
      try {
        const resp = await fetch('trajes-backup-2026-09-23.json');
        if (resp.ok) {
          raw = await resp.json();
          if (raw) raw.lastModified = 0;
        }
      } catch (e) {}
    }
  }

  S = migrateState(raw);

  if (S.logo) {
    const lImg = document.getElementById("logoImg");
    if (lImg) lImg.src = S.logo;
  }

  setupGlobalListeners();

  // RENDERIZA A TELA IMEDIATAMENTE (0ms)
  app = document.getElementById("app");
  updateThemeForActiveRoom();
  route();

  // Salva no IndexedDB local de forma assíncrona
  try {
    const db = await openDB();
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(S, "state");
  } catch (e) {}

  // Consulta a nuvem de forma imediata na inicialização para carregar as fotos e dados mais recentes
  if (getCloudDbUrl()) {
    cloudSyncPull(true);
    initCloudRealtimeListener();

    // Sincronização inteligente com debounce apenas ao voltar à aba/janela
    window.addEventListener("focus", checkCloudOnActive);
    document.addEventListener("visibilitychange", checkCloudOnActive);
  } else {
    updateCloudStatus("local");
  }
})();

