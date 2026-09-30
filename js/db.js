/* ===== WISŁA - BANCO DE DADOS & SINCRONIZAÇÃO EM NUVEM ===== */

/* Estado Global do Wisła */
var S = null;

/* Salas Padrão do Wisła */
const DEFAULT_ROOMS = {
  "masculino": {
    id: "masculino",
    name: "Trajes Masculinos",
    icon: "👔",
    color: "#e11d48",
    desc: "Acervo de trajes masculinos",
    pin: "gyqsv4", // 230773
    costumes: [],
    common: []
  },
  "feminino": {
    id: "feminino",
    name: "Trajes Femininos",
    icon: "👗",
    color: "#ec4899",
    desc: "Acervo de trajes femininos",
    pin: "",
    costumes: [],
    common: []
  },
  "botas_masc": {
    id: "botas_masc",
    name: "Adereços e Botas Masculinos",
    icon: "👢",
    color: "#f59e0b",
    desc: "Botas, chapéus, cintos e acessórios masculinos",
    pin: "",
    costumes: [],
    common: []
  },
  "botas_fem": {
    id: "botas_fem",
    name: "Adereços e Botas Femininos",
    icon: "👠",
    color: "#a855f7",
    desc: "Botas e adereços femininos",
    pin: "",
    costumes: [],
    common: []
  }
};

/* Configurações da Nuvem */
const DEFAULT_CLOUD_DB_URL = "https://wisla-ae9eb-default-rtdb.firebaseio.com/acervo.json";

function normalizeCloudUrl(url) {
  if (!url) return "";
  url = url.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith(".json")) {
    url = url + "/acervo.json";
  }
  return url;
}

function getCloudDbUrl() {
  const custom = localStorage.getItem("wisla_cloud_db_url");
  if (custom !== null && custom !== "") return normalizeCloudUrl(custom);
  return (S && S.cloudDbUrl) ? normalizeCloudUrl(S.cloudDbUrl) : DEFAULT_CLOUD_DB_URL;
}

function setCloudDbUrl(url) {
  url = normalizeCloudUrl(url);
  localStorage.setItem("wisla_cloud_db_url", url);
  if (S) S.cloudDbUrl = url;
}

function updateCloudStatus(status, text) {
  const pill = document.getElementById("cloudPill");
  const modalBadge = document.getElementById("settingsCloudBadge");
  const progBar = document.getElementById("topProgressBar");
  
  if (progBar) {
    if (status === "syncing") {
      progBar.classList.add("active");
    } else {
      progBar.classList.remove("active");
    }
  }

  const labels = {
    local: "💾 Local",
    online: "🟢 Nuvem Ativa",
    syncing: '<span class="spinner-circle-sm"></span> Sincronizando...',
    error: "⚠️ Erro Nuvem",
    offline: "🟡 Offline"
  };
  const labelText = text || labels[status] || labels.local;
  
  [pill, modalBadge].forEach(el => {
    if (!el) return;
    el.className = `cloud-pill ${status}`;
    el.innerHTML = labelText;
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/* Banco de Dados Local IndexedDB */
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("wislaAcervoDB", 3);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function loadState() {
  try {
    const db = await openDB();
    return await new Promise(res => {
      const q = db.transaction("kv").objectStore("kv").get("state");
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch (e) { return null; }
}

let saveT;
let cloudPushT;
let isSyncingCloud = false;

function save() {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    try {
      const now = Date.now();
      if (S) S.lastModified = now;
      localStorage.setItem("wisla_last_modified", String(now));
      
      const db = await openDB();
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(S, "state");
      tx.oncomplete = () => {
        toast("Salvo localmente ✓");
        cloudSyncPush();
      };
      tx.onerror = () => toast("Erro ao salvar localmente!");
    } catch (e) { toast("Erro ao salvar!"); }
  }, 300);
}

/* Migração e Inicialização do Estado Multi-Salas */
function migrateState(d) {
  if (!d) d = {};
  
  const state = {
    version: 4,
    lastModified: Number(d.lastModified) || Number(localStorage.getItem("wisla_last_modified")) || 0,
    cloudDbUrl: d.cloudDbUrl || DEFAULT_CLOUD_DB_URL,
    activeRoom: d.activeRoom || "masculino",
    masterPin: d.masterPin || hash(MASTER_PIN_DEFAULT),
    rooms: d.rooms || JSON.parse(JSON.stringify(DEFAULT_ROOMS)),
    dances: d.dances || [],
    dancers: d.dancers || [],
    bank: d.bank || [],
    logo: d.logo || ""
  };

  // Garante que todas as salas padrão existam
  Object.keys(DEFAULT_ROOMS).forEach(rk => {
    if (!state.rooms[rk]) {
      state.rooms[rk] = JSON.parse(JSON.stringify(DEFAULT_ROOMS[rk]));
    }
  });

  // Se veio do modelo antigo (costumes na raiz), aloca para 'masculino'
  if (Array.isArray(d.costumes) && d.costumes.length > 0 && state.rooms.masculino.costumes.length === 0) {
    state.rooms.masculino.costumes = d.costumes;
  }
  if (Array.isArray(d.common) && d.common.length > 0 && state.rooms.masculino.common.length === 0) {
    state.rooms.masculino.common = d.common;
  }
  if (d.pin && !state.rooms.masculino.pin) {
    state.rooms.masculino.pin = d.pin;
  }

  // Ordena alfabeticamente trajes e dançarinos em todas as salas
  Object.values(state.rooms).forEach(r => {
    if (Array.isArray(r.costumes)) {
      r.costumes.forEach(c => {
        c.name = fixPolishName(c.name);
        (c.items || []).forEach(it => { if (it.part) it.part = normalizePartName(it.part, c.name); });
      });
      r.costumes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
    }
    if (Array.isArray(r.common)) {
      r.common.forEach(cm => { if (cm.part) cm.part = normalizePartName(cm.part); });
      r.common.sort((a, b) => (a.part || "").localeCompare(b.part || "", "pt-BR", { sensitivity: "base" }));
    }
  });

  if (Array.isArray(state.dancers)) {
    state.dancers.forEach(p => {
      const newNums = {};
      Object.entries(p.nums || {}).forEach(([k, v]) => { newNums[fixPolishName(k)] = v; });
      p.nums = newNums;
    });
    state.dancers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
  }

  if (Array.isArray(state.dances)) {
    state.dances = state.dances.map(fixPolishName);
  }

  return state;
}

/* Sincronização em Tempo Real (EventSource + Push / Pull) */
let cloudEventSource = null;

function initCloudRealtimeListener() {
  const url = getCloudDbUrl();
  if (!url || typeof EventSource === "undefined") return;
  
  if (cloudEventSource) {
    try { cloudEventSource.close(); } catch(e) {}
    cloudEventSource = null;
  }
  
  try {
    cloudEventSource = new EventSource(url);
    
    cloudEventSource.addEventListener("put", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (!payload) return;
        
        // Se a alteração veio de uma atualização de raiz com dados
        if (payload.path === "/" && payload.data && typeof payload.data === "object" && (payload.data.rooms || payload.data.costumes)) {
          const remoteData = payload.data;
          const remoteTime = Number(remoteData.lastModified) || Date.now();
          const localTime = (S && S.lastModified) || Number(localStorage.getItem("wisla_last_modified")) || 0;
          
          if (remoteTime > localTime) {
            S = migrateState(remoteData);
            S.lastModified = remoteTime;
            localStorage.setItem("wisla_last_modified", String(remoteTime));
            
            openDB().then(db => {
              const tx = db.transaction("kv", "readwrite");
              tx.objectStore("kv").put(S, "state");
            }).catch(() => {});
            
            updateCloudStatus("online");
            updateCounters();
            updateThemeForActiveRoom();
            route();
          }
        } else {
          // Alteração parcial ou sub-ramo: sincroniza estado
          cloudSyncPull(false);
        }
      } catch (err) {}
    });

    cloudEventSource.onopen = () => {
      updateCloudStatus("online");
    };

    cloudEventSource.onerror = () => {
      // Reconexão transparente gerenciada pelo browser
    };
  } catch(e) {
    console.warn("SSE não suportado:", e);
  }
}

async function cloudSyncPush() {
  const url = getCloudDbUrl();
  if (!url) {
    updateCloudStatus("local");
    return;
  }
  clearTimeout(cloudPushT);
  cloudPushT = setTimeout(async () => {
    try {
      updateCloudStatus("syncing");
      const now = Date.now();
      if (S) S.lastModified = now;
      localStorage.setItem("wisla_last_modified", String(now));
      
      const res = await fetchWithTimeout(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(S)
      }, 15000);
      if (res.ok) {
        updateCloudStatus("online");
        toast("☁️ Sincronizado na nuvem para todos!");
      } else {
        updateCloudStatus("error");
      }
    } catch (e) {
      console.warn("Falha ao salvar na nuvem:", e);
      updateCloudStatus("offline");
    }
  }, 500);
}

async function cloudSyncPull(isManual = false) {
  const url = getCloudDbUrl();
  if (!url) {
    updateCloudStatus("local");
    return;
  }
  if (isSyncingCloud) return;
  try {
    isSyncingCloud = true;
    updateCloudStatus("syncing");
    const localTime = (S && S.lastModified) || Number(localStorage.getItem("wisla_last_modified")) || 0;

    const res = await fetchWithTimeout(url, { cache: "no-cache" }, 12000);
    if (res.ok) {
      const remoteData = await res.json();
      if (remoteData && typeof remoteData === "object" && (remoteData.rooms || remoteData.costumes)) {
        const remoteTime = Number(remoteData.lastModified) || 0;
        
        // Nuvem tem prioridade na carga inicial, quando solicitada ou quando é mais recente/igual
        if (isManual || remoteTime >= localTime || localTime === 0 || !S || !S.rooms) {
          S = migrateState(remoteData);
          if (remoteTime > 0) {
            S.lastModified = remoteTime;
            localStorage.setItem("wisla_last_modified", String(remoteTime));
          }
          
          try {
            const db = await openDB();
            const tx = db.transaction("kv", "readwrite");
            tx.objectStore("kv").put(S, "state");
          } catch(e) {}

          updateCloudStatus("online");
          if (isManual && localTime > 0) toast("✓ Nuvem sincronizada!");
          updateCounters();
          updateThemeForActiveRoom();
          route();
        } else {
          updateCloudStatus("online");
        }
      } else if (remoteData === null && S && S.rooms && localTime > 0) {
        updateCloudStatus("online");
        cloudSyncPush();
      } else {
        updateCloudStatus("online");
      }
    } else {
      updateCloudStatus("error");
    }
  } catch (e) {
    console.warn("Falha ao consultar nuvem:", e);
    updateCloudStatus("offline");
  } finally {
    isSyncingCloud = false;
  }
}

async function testCloudConnection(manual = false) {
  const url = getCloudDbUrl();
  if (!url) {
    if (manual) alert("URL do banco em nuvem não configurada.");
    updateCloudStatus("local");
    return;
  }
  updateCloudStatus("syncing");
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-cache" }, 6000);
    if (res.ok) {
      updateCloudStatus("online");
      if (manual) alert("✓ Conexão com o Firebase realizada com sucesso!");
    } else {
      updateCloudStatus("error");
      if (manual) alert("Erro HTTP " + res.status + " ao conectar ao Firebase.");
    }
  } catch (err) {
    updateCloudStatus("offline");
    if (manual) alert("Falha na conexão: " + err.message);
  }
}

