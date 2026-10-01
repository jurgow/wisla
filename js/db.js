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
    name: "Botas Femininas",
    icon: "👢",
    color: "#a855f7",
    desc: "Botas e calçados femininos",
    pin: "",
    costumes: [],
    common: []
  },
  "aderecos_fem": {
    id: "aderecos_fem",
    name: "Adereços Femininos",
    icon: "🎀",
    color: "#ec4899",
    desc: "Adereços, flores, coroas, laços e fitas femininos",
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
    activeRoom: (typeof getActiveRoomId === "function" ? getActiveRoomId() : (localStorage.getItem("wisla_active_room") || "masculino")),
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

  // Atualiza nome/descrição de botas_fem caso esteja com a nomenclatura antiga
  if (state.rooms.botas_fem && state.rooms.botas_fem.name === "Adereços e Botas Femininos") {
    state.rooms.botas_fem.name = "Botas Femininas";
    state.rooms.botas_fem.desc = "Botas e calçados femininos";
    state.rooms.botas_fem.icon = "👢";
  }

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

  // Migração e saneamento da sala botas_fem
  if (state.rooms.botas_fem) {
    const defaultBootList = (typeof window !== "undefined" && window.WISLA_DEFAULT_DATA && window.WISLA_DEFAULT_DATA.rooms && window.WISLA_DEFAULT_DATA.rooms.botas_fem && window.WISLA_DEFAULT_DATA.rooms.botas_fem.costumes && window.WISLA_DEFAULT_DATA.rooms.botas_fem.costumes.length > 0) ? window.WISLA_DEFAULT_DATA.rooms.botas_fem.costumes : [];
    const officialNames = new Set(defaultBootList.map(b => (b.name || "").toUpperCase().trim()));
    const currentCostumes = state.rooms.botas_fem.costumes || [];
    
    // Se houver trajes criados na sala de botas que NÃO são calçados, move automaticamente para a sala 'feminino'
    const nonBootCostumes = currentCostumes.filter(c => {
      const nm = (c.name || "").toUpperCase().trim();
      return !officialNames.has(nm) && !nm.startsWith("BOTA") && !nm.startsWith("SAPATO") && !nm.startsWith("SANDÁLIA") && !nm.startsWith("SAPATILHA");
    });

    if (nonBootCostumes.length > 0) {
      if (!state.rooms.feminino) state.rooms.feminino = JSON.parse(JSON.stringify(DEFAULT_ROOMS.feminino));
      if (!Array.isArray(state.rooms.feminino.costumes)) state.rooms.feminino.costumes = [];
      nonBootCostumes.forEach(nb => {
        if (!state.rooms.feminino.costumes.some(fc => fc.id === nb.id || fc.name === nb.name)) {
          state.rooms.feminino.costumes.push(nb);
        }
      });
      state.rooms.botas_fem.costumes = currentCostumes.filter(c => !nonBootCostumes.includes(c));
    }

    // Se a sala de botas estiver sem os modelos padrão oficiais, carrega a lista oficial completa
    const hasOfficialBoots = (state.rooms.botas_fem.costumes || []).some(c => officialNames.has((c.name || "").toUpperCase().trim()));
    if ((!hasOfficialBoots || state.rooms.botas_fem.costumes.length === 0) && defaultBootList.length > 0) {
      state.rooms.botas_fem.costumes = JSON.parse(JSON.stringify(defaultBootList));
    }
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

function getCloudMetaUrl() {
  const fullUrl = getCloudDbUrl();
  if (!fullUrl) return "";
  if (fullUrl.endsWith("/acervo.json")) {
    return fullUrl.replace("/acervo.json", "/acervo/lastModified.json");
  }
  if (fullUrl.endsWith(".json")) {
    return fullUrl.replace(/\.json$/, "/lastModified.json");
  }
  return fullUrl + "/lastModified.json";
}

/* Sincronização em Tempo Real Ultra-Econômica (Escuta apenas o Timestamp de 15 bytes) */
let cloudEventSource = null;

function initCloudRealtimeListener() {
  const metaUrl = getCloudMetaUrl();
  if (!metaUrl || typeof EventSource === "undefined") return;
  
  if (cloudEventSource) {
    try { cloudEventSource.close(); } catch(e) {}
    cloudEventSource = null;
  }
  
  try {
    // Conecta SSE no nó de timestamp (apenas 15 bytes por evento em vez de 10.7MB)
    cloudEventSource = new EventSource(metaUrl);
    
    cloudEventSource.addEventListener("put", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload === null || payload === undefined) return;
        
        let remoteTime = 0;
        if (typeof payload === "number") {
          remoteTime = payload;
        } else if (payload && typeof payload.data === "number") {
          remoteTime = payload.data;
        } else if (payload && typeof payload.data === "object" && payload.data) {
          remoteTime = Number(payload.data.lastModified || payload.data) || 0;
        }
        
        const localTime = (S && S.lastModified) || Number(localStorage.getItem("wisla_last_modified")) || 0;
        
        // Só faz o download do acervo completo se houver alteração real mais recente
        if (remoteTime > localTime) {
          cloudSyncPull(false);
        } else {
          updateCloudStatus("online");
        }
      } catch (err) {}
    });

    cloudEventSource.onopen = () => {
      updateCloudStatus("online");
    };

    cloudEventSource.onerror = () => {
      // Reconexão gerenciada automaticamente pelo navegador
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
      }, 20000);
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
  }, 800);
}

async function cloudSyncPull(force = false) {
  const url = getCloudDbUrl();
  const metaUrl = getCloudMetaUrl();
  if (!url) {
    updateCloudStatus("local");
    return;
  }
  if (isSyncingCloud) return;

  try {
    isSyncingCloud = true;
    updateCloudStatus("syncing");
    const localTime = (S && S.lastModified) || Number(localStorage.getItem("wisla_last_modified")) || 0;

    // 1. CHECAGEM ULTRA-LEVE DE METADADOS (apenas 15 bytes de download):
    // Se não for forçado e já tivermos dados locais, checamos se o timestamp remoto mudou antes de baixar o arquivo
    if (!force && localTime > 0 && metaUrl) {
      try {
        const metaRes = await fetchWithTimeout(metaUrl, { cache: "no-cache" }, 4000);
        if (metaRes.ok) {
          const remoteTime = Number(await metaRes.json()) || 0;
          if (remoteTime > 0 && remoteTime <= localTime) {
            // DADOS LOCAIS JÁ ESTÃO 100% ATUALIZADOS!
            updateCloudStatus("online");
            return;
          }
        }
      } catch(e) {}
    }

    // 2. BAIXA O ACERVO COMPLETO DA NUVEM (em segundo plano, sem travar a navegação)
    const res = await fetchWithTimeout(url, { cache: "no-cache" }, 20000);
    if (res.ok) {
      const remoteData = await res.json();
      if (remoteData && typeof remoteData === "object" && (remoteData.rooms || remoteData.costumes)) {
        const remoteTime = Number(remoteData.lastModified) || 0;
        
        // Aplica os dados da nuvem se for forçado (inicialização/manual) ou se a nuvem for >= local
        if (force || remoteTime >= localTime || localTime === 0 || !S || !S.rooms) {
          S = migrateState(remoteData);
          if (remoteTime > 0) {
            S.lastModified = remoteTime;
            localStorage.setItem("wisla_last_modified", String(remoteTime));
          } else {
            const now = Date.now();
            S.lastModified = now;
            localStorage.setItem("wisla_last_modified", String(now));
          }
          
          try {
            const db = await openDB();
            const tx = db.transaction("kv", "readwrite");
            tx.objectStore("kv").put(S, "state");
          } catch(e) {}

          updateCloudStatus("online");
          updateCounters();
          updateThemeForActiveRoom();
          route();
        } else {
          updateCloudStatus("online");
        }
      } else if (remoteData === null && S && S.rooms) {
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

