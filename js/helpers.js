/* ===== WISŁA - HELPERS & UTILITÁRIOS ===== */

/* Elemento Container Principal */
var app = typeof document !== "undefined" ? document.getElementById("app") : null;

/* Dicionário e Correção de Nomes em Polonês */
const POLISH_CORRECTIONS = {
  "LOWICZ": "ŁOWICZ",
  "SUITA LOWICKA": "ŁOWICZ",
  "SUITA ŁOWICZ": "ŁOWICZ",
  "SACZ": "SĄCZ",
  "LEMKO": "ŁEMKO",
  "BILGORAJ": "BIŁGORAJ",
  "GORAL ZWIECKI": "GÓRAL ŻYWIECKI",
  "GORAL ZYWIECKI": "GÓRAL ŻYWIECKI",
  "SILEZIA": "ŚLĄSK",
  "SILESIA": "ŚLĄSK",
  "KARVOEIRO - SILESIA": "CARVOEIRO - ŚLĄSK",
  "MAZUR HALKA": "MAZUR (HALKA)",
  "MAZUR MILITAR": "MAZUR MILITAR",
  "PRZEWORSKI": "PRZEWORSK",
  "CIESZYN": "CIESZYN",
  "KASZUBY": "KASZUBY",
  "KRAKOWIAK": "KRAKOWIAK",
  "KUJAWIAK": "KUJAWIAK",
  "OPOCZNO": "OPOCZNO",
  "RZESZOW": "RZESZÓW",
  "RZESZÓW": "RZESZÓW",
  "SIERADZ": "SIERADZ",
  "SPISZ": "SPISZ",
  "WILANOW": "WILANÓW",
  "WILANÓW": "WILANÓW",
  "WIELKOPOLSKA": "WIELKOPOLSKA",
  "BESKID": "BESKID"
};

const ALIAS = {
  "SUITA LOWICKA": "ŁOWICZ",
  "SUITA ŁOWICZ": "ŁOWICZ",
  "LOWICZ": "ŁOWICZ",
  "SACZ": "SĄCZ",
  "LEMKO": "ŁEMKO",
  "BILGORAJ": "BIŁGORAJ",
  "GORAL ZWIECKI": "GÓRAL ŻYWIECKI",
  "SILESIA": "ŚLĄSK",
  "KARVOEIRO - SILESIA": "CARVOEIRO - ŚLĄSK"
};

function fixPolishName(n) {
  if (!n) return "";
  const trimmed = String(n).trim().toUpperCase();
  return POLISH_CORRECTIONS[trimmed] || trimmed;
}

function parseQty(q) {
  if (!q) return 0;
  const m = String(q).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function normalizePartName(part, costumeName = "") {
  let p = String(part || "OUTROS").trim().toUpperCase();
  const cNorm = norm(costumeName);
  if (cNorm.includes("KRAKOW") && (p === "CASACO" || p === "CASACOS")) return "SUKMANA";
  if (p === "COLETES") return "COLETE";
  if (p === "CASACOS") return "CASACO";
  if (p === "PALETO") return "PALETÓ";
  if (p === "EMCHARPE") return "ECHARPE";
  return p;
}

/* Formatação Dinâmica de Nomes Compartilhados */
function formatSharedTag(part) {
  if (!part) return "🔗 compartilhada";
  const p = String(part).trim().toLowerCase();
  const mascWords = ["colete", "capote", "paletó", "paleto", "cinto", "sapato", "adereço", "adereco", "bordado", "chocalho", "casaco", "punho", "lenço", "lenco", "avental"];
  const isMasc = mascWords.some(w => p.includes(w));
  const suffix = isMasc ? "compartilhado" : "compartilhada";
  return `🔗 ${p} ${suffix}`;
}

function classifyPiece(part) {
  const p = norm(part);
  if (p.includes("CALCA") || p.includes("CALÇA") || p.includes("SPODNIE") || p.includes("CALCAO") || p.includes("CALÇÃO") || p.includes("CULOTE")) return { key: "calcas", label: "Calças", icon: "👖" };
  if (p.includes("CAMISA") || p.includes("BLUSA") || p.includes("KOSZULA")) return { key: "camisas", label: "Camisas & Blusas", icon: "👔" };
  if (p.includes("COLETE") || p.includes("CORPETE") || p.includes("KAMIZELKA") || p.includes("GORSET")) return { key: "coletes", label: "Coletes & Corpetes", icon: "🦺" };
  if (p.includes("SAIA") || p.includes("SPODNICA") || p.includes("SPÓDNICA") || p.includes("SUKNIA") || p.includes("VESTIDO") || p.includes("AVENTAL") || p.includes("ZAPASKA") || p.includes("CAPOTE") || p.includes("SUKMANA") || p.includes("CASACO") || p.includes("PALETO") || p.includes("PALETÓ") || p.includes("TUNICA") || p.includes("TÚNICA") || p.includes("PLASZCZ") || p.includes("PŁASZCZ")) return { key: "capotes", label: "Saias, Capotes & Aventais", icon: "👗" };
  if (p.includes("BOTA") || p.includes("BUTY") || p.includes("TRZEWIKI") || p.includes("SAPAT") || p.includes("CALCAD") || p.includes("CALÇAD") || p.includes("PANTUFA") || p.includes("SANDAL") || p.includes("SANDÁL") || p.includes("KIERPC")) return { key: "calcados", label: "Botas & Calçados", icon: "👢" };
  if (p.includes("FAIXA") || p.includes("FITA") || p.includes("CINTO") || p.includes("PAS ") || p.endsWith("PAS") || p.includes("GRAVATA") || p.includes("PUNHO") || p.includes("DRAGONA") || p.includes("LUVA") || p.includes("MEIA") || p.includes("ECHARPE") || p.includes("BORDADO") || p.includes("COROA") || p.includes("WIANEK") || p.includes("CHAPEU") || p.includes("CHAPÉU") || p.includes("CAP") || p.includes("ROGATYWKA") || p.includes("LENCO") || p.includes("LENÇO") || p.includes("CHUSTA") || p.includes("CHOCALHO") || p.includes("COLAR") || p.includes("KORAL") || p.includes("CORDAO") || p.includes("CORDÃO") || p.includes("ADERECO") || p.includes("ADEREÇO") || p.includes("BIJUTERIA") || p.includes("TIARA")) return { key: "aderecos", label: "Adereços & Acessórios", icon: "🎗️" };
  return { key: "outros", label: "Outras Peças", icon: "📦" };
}

/* Nomenclatura e Tipagem Inteligente por Sala */
function isBootRoom(roomOrId) {
  const rid = typeof roomOrId === "string" ? roomOrId.toLowerCase() : ((roomOrId && roomOrId.id) || "").toLowerCase();
  return rid.includes("bota") || rid.includes("calcado") || rid.includes("sapato");
}

function isAccessoryRoom(roomOrId) {
  const rid = typeof roomOrId === "string" ? roomOrId.toLowerCase() : ((roomOrId && roomOrId.id) || "").toLowerCase();
  return rid.includes("adereco") || rid.includes("acessorio") || rid.includes("faixa");
}

function isCostumeRoom(roomOrId) {
  return !isBootRoom(roomOrId) && !isAccessoryRoom(roomOrId);
}

function getRoomUnitName(roomOrId, count = 1) {
  if (isBootRoom(roomOrId)) return count === 1 ? "calçado" : "calçados";
  if (isAccessoryRoom(roomOrId)) return count === 1 ? "item" : "itens";
  return count === 1 ? "traje completo" : "trajes completos";
}

function getRoomItemSimpleName(roomOrId, count = 1) {
  if (isBootRoom(roomOrId)) return count === 1 ? "calçado" : "calçados";
  if (isAccessoryRoom(roomOrId)) return count === 1 ? "item" : "itens";
  return count === 1 ? "traje" : "trajes";
}

function getRoomAddButtonLabel(roomOrId) {
  if (isCostumeRoom(roomOrId)) return "+ Novo Traje";
  return "+ Novo Item";
}

function getRoomNavLabel(roomOrId) {
  if (isBootRoom(roomOrId)) return "Calçados";
  if (isAccessoryRoom(roomOrId)) return "Itens";
  return "Trajes";
}

/* Hash & Segurança */
const hash = s => {
  let h = 5381; s = "trajes|" + s;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const MASTER_PIN_DEFAULT = "0412"; // Código Master confidencial

/* Utilitários Gerais */
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const normDancer = s => norm(s).replace(/\s+(PAR|1|2|3|4|5|6|7|8|9|0|I|II|III|IV|V)$/i, "").trim();

const fmtBytes = b => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + " " + u[i];
};

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const today = () => new Date().toISOString().slice(0, 10);

/* Notificações Toast */
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2000);
}

/* Diálogo de Escolha Interativo (Ask) */
function ask(text, choices, title = "") {
  return new Promise(res => {
    let el = document.getElementById("askModal");
    if (!el) {
      el = document.createElement("div");
      el.id = "askModal";
      el.className = "modal-overlay";
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="modal-card" style="max-width:380px;">
        ${title ? `<div class="modal-title">${esc(title)}</div>` : ''}
        <div class="modal-desc" style="margin-bottom:16px;">${esc(text)}</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${choices.map(([label, val]) => `
            <button class="btn primary" data-val="${esc(val)}" style="justify-content:flex-start; text-align:left;">${esc(label)}</button>
          `).join("")}
          <button class="btn" id="askCancelBtn" style="margin-top:4px;">Cancelar</button>
        </div>
      </div>
    `;
    el.classList.add("active");
    el.querySelectorAll("[data-val]").forEach(b => {
      b.onclick = () => { el.classList.remove("active"); res(b.dataset.val); };
    });
    document.getElementById("askCancelBtn").onclick = () => { el.classList.remove("active"); res(null); };
    el.onclick = e => { if (e.target.id === "askModal") { el.classList.remove("active"); res(null); } };
  });
}

/* Atualização dos Contadores da Barra Lateral */
function updateCounters() {
  if (typeof getActiveRoom !== "function") return;
  const r = getActiveRoom();
  const cCount = (r && r.costumes) ? r.costumes.length : 0;
  const pCount = (r && r.costumes) ? r.costumes.reduce((acc, c) => acc + (c.items ? c.items.length : 0), 0) : 0;
  const phCount = (S && S.bank) ? S.bank.length : 0;

  const elC = document.getElementById("sideCostumesCount");
  const elP = document.getElementById("sidePiecesCount");
  const elPh = document.getElementById("sidePhotosCount");

  if (elC) elC.textContent = cCount;
  if (elP) elP.textContent = pCount;
  if (elPh) elPh.textContent = phCount;
}

/* Ordenação Padrão das Salas (Trajes sempre primeiro) */
function getSortedRoomsList(roomsObj) {
  const list = Object.values(roomsObj || (typeof S !== "undefined" && S?.rooms) || {});
  if (!list.length) return [];
  
  const rank = (r) => {
    if (!r) return 999;
    const id = (r.id || "").toLowerCase();
    const nm = (r.name || "").toLowerCase();
    
    // 1. Trajes Masculinos primeiro
    if (id === "masculino") return 10;
    if (nm.includes("traje") && nm.includes("masculin")) return 11;
    
    // 2. Trajes Femininos logo em seguida
    if (id === "feminino") return 20;
    if (nm.includes("traje") && nm.includes("feminin")) return 21;
    
    // 3. Outras salas de trajes
    if (nm.includes("traje")) return 25;
    
    // 4. Botas & Adereços
    if (id === "botas_masc" || (nm.includes("bota") && nm.includes("masc"))) return 30;
    if (id === "botas_fem" || (nm.includes("bota") && nm.includes("fem"))) return 40;
    if (id === "aderecos_fem" || (nm.includes("adere") && nm.includes("fem"))) return 50;
    if (nm.includes("bota") || nm.includes("calcado")) return 70;
    if (nm.includes("adere")) return 80;
    
    return 100;
  };

  return list.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "", "pt-BR");
  });
}
