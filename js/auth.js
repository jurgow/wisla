/* ===== WISŁA - AUTENTICAÇÃO, CONTROLE DE ACESSO & CÁLCULOS ===== */

// Persistência de autenticação por sessão do navegador (sobrevive a reloads)
let isMasterUnlocked = sessionStorage.getItem("wisla_master_unlocked") === "true";
let unlockedRooms = new Set(JSON.parse(sessionStorage.getItem("wisla_unlocked_rooms") || "[]"));

function setMasterUnlocked(val) {
  isMasterUnlocked = !!val;
  if (isMasterUnlocked) sessionStorage.setItem("wisla_master_unlocked", "true");
  else sessionStorage.removeItem("wisla_master_unlocked");
  updateAuthUI();
}

function setRoomUnlocked(roomId, val) {
  if (val) unlockedRooms.add(roomId);
  else unlockedRooms.delete(roomId);
  sessionStorage.setItem("wisla_unlocked_rooms", JSON.stringify(Array.from(unlockedRooms)));
  updateAuthUI();
}

/* Helpers de Sala Ativa (Isolamento por Dispositivo/Sessão) */
function getActiveRoomId() {
  const local = localStorage.getItem("wisla_active_room");
  if (local && S && S.rooms && S.rooms[local]) {
    return local;
  }
  if (S && S.rooms) {
    if (S.rooms["masculino"]) return "masculino";
    const keys = Object.keys(S.rooms);
    if (keys.length > 0) return keys[0];
  }
  return "masculino";
}

function setActiveRoomId(roomId) {
  if (roomId) {
    localStorage.setItem("wisla_active_room", roomId);
    if (S) S.activeRoom = roomId;
  }
}

function getActiveRoom() {
  if (!S || !S.rooms) return DEFAULT_ROOMS.masculino;
  const currentId = getActiveRoomId();
  if (S.rooms[currentId]) return S.rooms[currentId];
  const firstId = Object.keys(S.rooms)[0] || "masculino";
  setActiveRoomId(firstId);
  return S.rooms[firstId] || DEFAULT_ROOMS.masculino;
}

function isCurrentRoomUnlocked() {
  if (isMasterUnlocked) return true;
  const r = getActiveRoom();
  return unlockedRooms.has(r.id);
}

function requireMasterAuth(actionCallback) {
  if (isMasterUnlocked) {
    actionCallback();
    return;
  }
  const modal = document.getElementById("authModal");
  const pinInput = document.getElementById("authPinInput");
  pinInput.value = "";
  
  document.getElementById("authModalTitle").textContent = "👑 Autenticação Master";
  document.getElementById("authModalDesc").innerHTML = "Acesso exclusivo à Administração. Digite a senha Master (0412):";
  modal.classList.add("active");
  setTimeout(() => pinInput.focus(), 100);

  const submit = () => {
    const val = pinInput.value.trim();
    if (hash(val) === S.masterPin || val === MASTER_PIN_DEFAULT) {
      setMasterUnlocked(true);
      modal.classList.remove("active");
      toast("🔓 Acesso liberado!");
      updateAuthUI();
      actionCallback();
    } else {
      alert("PIN incorreto. Acesso negado.");
      pinInput.value = "";
      pinInput.focus();
    }
  };
  document.getElementById("authSubmitBtn").onclick = submit;
  pinInput.onkeydown = e => { if (e.key === "Enter") submit(); };
  document.getElementById("authCancelBtn").onclick = () => modal.classList.remove("active");
  modal.onclick = e => { if (e.target.id === "authModal") modal.classList.remove("active"); };
}

function updateAuthUI() {
  const isUnlocked = isCurrentRoomUnlocked();
  const r = getActiveRoom();
  document.body.classList.toggle("locked", !isUnlocked);
  document.body.classList.toggle("is-master", isMasterUnlocked);

  const pill = document.getElementById("authPill");
  const authCard = document.getElementById("sidebarAuthCard");

  let cardHtml = "";

  if (isMasterUnlocked) {
    if (pill) {
      pill.className = "auth-pill master-unlocked";
      pill.innerHTML = `👑 Modo Master`;
      pill.title = "Acesso irrestrito a todas as salas. Toque para sair.";
    }

    cardHtml = `
      <div class="auth-status-box master">
        <div class="auth-status-head">
          <span class="auth-badge-icon">👑</span>
          <div>
            <div class="auth-status-title">Modo Master (Acesso Total)</div>
            <div class="auth-status-sub">Edição liberada em todas as salas</div>
          </div>
        </div>
        <button class="btn sm red full-width" id="btnSideLockMaster" style="margin-top:8px;">
          🔒 Sair do Modo Master
        </button>
      </div>
    `;
  } else if (isUnlocked) {
    if (pill) {
      pill.className = "auth-pill room-unlocked";
      pill.innerHTML = `✏️ Edição: ${esc(r.name)}`;
      pill.title = `Modo de edição liberado para ${r.name}. Toque para bloquear.`;
    }

    cardHtml = `
      <div class="auth-status-box unlocked">
        <div class="auth-status-head">
          <span class="auth-badge-icon">✏️</span>
          <div>
            <div class="auth-status-title">Modo Edição Ativo</div>
            <div class="auth-status-sub">Responsável: <b>${esc(r.name)}</b></div>
          </div>
        </div>
        <button class="btn sm red full-width" id="btnSideLockRoom" style="margin-top:8px;">
          🔒 Sair da Edição (Bloquear)
        </button>
      </div>
    `;
  } else {
    if (pill) {
      pill.className = "auth-pill locked";
      pill.innerHTML = `🔒 Modo Consulta`;
      pill.title = "Modo somente leitura. Toque para entrar no modo edição com PIN.";
    }

    cardHtml = `
      <div class="auth-status-box locked">
        <div class="auth-status-head">
          <span class="auth-badge-icon">🔒</span>
          <div>
            <div class="auth-status-title">Modo Consulta</div>
            <div class="auth-status-sub">Somente leitura do acervo</div>
          </div>
        </div>
        <button class="btn sm primary full-width" id="btnSideUnlock" style="margin-top:8px;">
          🔓 Liberar Edição (PIN)
        </button>
      </div>
    `;
  }

  if (authCard) {
    authCard.innerHTML = cardHtml;
    const bLockM = document.getElementById("btnSideLockMaster");
    if (bLockM) bLockM.onclick = () => {
      setMasterUnlocked(false);
      toast("Modo Master encerrado 🔒");
      route();
    };
    const bLockR = document.getElementById("btnSideLockRoom");
    if (bLockR) bLockR.onclick = () => {
      setRoomUnlocked(r.id, false);
      toast(`Sala ${r.name} travada em Modo Consulta 🔒`);
      route();
    };
    const bUnlock = document.getElementById("btnSideUnlock");
    if (bUnlock) bUnlock.onclick = () => {
      closeSidebar();
      openAuthModal();
    };
  }
}

function updateThemeForActiveRoom() {
  const r = getActiveRoom();
  if (!r) return;
  document.documentElement.style.setProperty("--room-color", r.color || "#e11d48");
  document.documentElement.style.setProperty("--room-bg", (r.color || "#e11d48") + "24");
  document.documentElement.style.setProperty("--room-border", (r.color || "#e11d48") + "59");
  
  const hIcon = document.getElementById("headerRoomIcon");
  const hName = document.getElementById("headerRoomName");
  const hDot = document.getElementById("headerRoomDot");
  if (hIcon) hIcon.textContent = r.icon || "📁";
  if (hName) hName.textContent = r.name || "Sala";
  if (hDot) hDot.style.background = r.color || "#e11d48";
  
  const sideIcon = document.getElementById("sidebarRoomIcon");
  const sideLabel = document.getElementById("sidebarRoomLabel");
  if (sideIcon) sideIcon.textContent = r.icon || "📁";
  if (sideLabel) sideLabel.textContent = r.name || "Sala";

  updateCounters();
  updateAuthUI();
}

/* Banner Informativo de Modo de Acesso */
function renderModeBanner(r) {
  const isUnlocked = isCurrentRoomUnlocked();
  if (isMasterUnlocked) {
    return `
      <div class="mode-banner master noprint">
        <span>👑 <b>Modo Master Ativo</b> — Permissão total para editar trajes, configurações e salas.</span>
        <button class="btn sm red" onclick="setMasterUnlocked(false); toast('Modo Master encerrado 🔒'); route();">🔒 Sair do Master</button>
      </div>
    `;
  }
  if (isUnlocked) {
    return `
      <div class="mode-banner unlocked noprint">
        <span>✏️ <b>Modo Edição Ativo (${esc(r.name)})</b> — Você tem permissão para alterar nomes, quantidades e peças.</span>
        <button class="btn sm red" onclick="setRoomUnlocked('${r.id}', false); toast('Sala bloqueada em Modo Consulta 🔒'); route();">🔒 Bloquear Edição</button>
      </div>
    `;
  }
  return `
    <div class="mode-banner locked noprint">
      <span>🔒 <b>Modo Consulta (Somente Leitura)</b> — Visualização pública do acervo.</span>
      <button class="btn sm primary" onclick="openAuthModal()">🔓 Liberar Edição (PIN)</button>
    </div>
  `;
}

/* Diálogo de Autenticação */
function openAuthModal() {
  const r = getActiveRoom();
  const modal = document.getElementById("authModal");
  const pinInput = document.getElementById("authPinInput");
  pinInput.value = "";
  
  document.getElementById("authModalTitle").textContent = `🔒 Autenticação de Edição`;
  document.getElementById("authModalDesc").innerHTML = `Digite o PIN para liberar a edição em <b>${esc(r.name)}</b>:`;
  
  modal.classList.add("active");
  setTimeout(() => pinInput.focus(), 100);

  const submit = () => {
    const val = pinInput.value.trim();
    if (!val) return;
    
    // Testa Master Token confidencialmente
    if (hash(val) === S.masterPin || val === MASTER_PIN_DEFAULT) {
      setMasterUnlocked(true);
      modal.classList.remove("active");
      toast("👑 Modo Master Ativado!");
      route();
      return;
    }

    // Testa PIN da sala ativa
    if (r.pin && hash(val) === r.pin) {
      setRoomUnlocked(r.id, true);
      modal.classList.remove("active");
      toast(`🔓 Modo Edição Ativado em ${r.name}!`);
      route();
      return;
    }

    alert("PIN incorreto. Digite a senha de edição.");
    pinInput.value = "";
    pinInput.focus();
  };

  document.getElementById("authSubmitBtn").onclick = submit;
  pinInput.onkeydown = e => { if (e.key === "Enter") submit(); };
  document.getElementById("authCancelBtn").onclick = () => modal.classList.remove("active");
  modal.onclick = e => { if (e.target.id === "authModal") modal.classList.remove("active"); };
}

/* Switcher de Salas */
function openRoomSwitcher() {
  const modal = document.getElementById("roomModal");
  const grid = document.getElementById("roomsListGrid");
  const currentRoomId = getActiveRoomId();
  
  grid.innerHTML = Object.values(S.rooms).map(roomItem => {
    const isAct = roomItem.id === currentRoomId;
    const stats = getRoomInventoryStats(roomItem);
    const hasPin = !!roomItem.pin;
    
    return `<div class="room-card-option ${isAct ? 'active' : ''}" data-room-id="${roomItem.id}">
      <span class="room-card-lock-badge">${hasPin ? '🔒' : '🔓'}</span>
      <div class="room-card-header">
        <span class="room-card-icon">${roomItem.icon || '📁'}</span>
        <div>
          <div class="room-card-name">${esc(roomItem.name)}</div>
          <div class="room-card-count"><b>${stats.totalKits} trajes completos</b> · ${stats.totalTrajes} modelos</div>
        </div>
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">${esc(roomItem.desc || '')}</p>
    </div>`;
  }).join("");

  modal.classList.add("active");

  grid.querySelectorAll(".room-card-option").forEach(card => {
    card.onclick = () => {
      const rid = card.dataset.roomId;
      setActiveRoomId(rid);
      updateThemeForActiveRoom();
      modal.classList.remove("active");
      toast(`Sala alterada para: ${getActiveRoom().name}`);
      go("#/");
      route();
    };
  });

  document.getElementById("closeRoomModalBtn").onclick = () => modal.classList.remove("active");
  document.getElementById("confirmRoomBtn").onclick = () => modal.classList.remove("active");
  modal.onclick = e => { if (e.target.id === "roomModal") modal.classList.remove("active"); };
  
  document.getElementById("addNewRoomBtn").onclick = () => {
    requireMasterAuth(() => {
      const name = prompt("Nome da nova sala / departamento de trajes:");
      if (!name) return;
      const icon = prompt("Ícone (emoji) para a sala:", "📁") || "📁";
      const id = uid();
      S.rooms[id] = {
        id,
        name,
        icon,
        color: "#0284c7",
        desc: "Departamento de trajes",
        pin: "",
        costumes: [],
        common: []
      };
      setActiveRoomId(id);
      save();
      updateThemeForActiveRoom();
      modal.classList.remove("active");
      toast(`Nova sala "${name}" criada com sucesso!`);
      go("#/");
    });
  };
}

/* ===== CÁLCULO DE TRAJES COMPLETOS (KITS PRONTOS) ===== */
function calcCompleteKitsInfo(costume, commonList) {
  const counts = { calcas: 0, camisas: 0, coletes: 0, capotes: 0, calcados: 0, aderecos: 0, outros: 0 };
  const pieceCounts = {};

  (costume.items || []).forEach(raw => {
    let it = raw;
    if (raw.cid && commonList) {
      const found = commonList.find(x => x.id === raw.cid);
      if (found) it = found;
    }
    const cat = classifyPiece(it.part).key;
    const q = parseQty(it.qty);
    if (counts[cat] !== undefined) counts[cat] += q;
    const pName = (it.part || "Peça").trim();
    pieceCounts[pName] = (pieceCounts[pName] || 0) + q;
  });

  const cName = norm(costume.name || "");
  let fullKits = 0;
  let incomplete = 0;
  let incompleteNote = "";

  // 1. Caso especial: SĄCZ / NOWY SĄCZ (Lachów Sądeckich)
  if (cName.includes("SACZ") || cName.includes("SĄCZ")) {
    const baseCalcas = counts.calcas || 0;
    const baseColetes = counts.coletes || 0;
    const baseCapotes = counts.capotes || 0;
    const baseCamisas = counts.camisas || 0;

    const reqFull = [baseCalcas, baseColetes, baseCapotes];
    if (baseCamisas > 0) reqFull.push(baseCamisas);
    fullKits = Math.min(...reqFull);

    const reqPartial = [baseCalcas, baseColetes];
    if (baseCamisas > 0) reqPartial.push(baseCamisas);
    const totalPartial = Math.min(...reqPartial);

    if (totalPartial > fullKits) {
      incomplete = totalPartial - fullKits;
      incompleteNote = `${incomplete} sem capote`;
    }

    return {
      kits: fullKits,
      incomplete: incomplete,
      incompleteNote: incompleteNote,
      detail: `${fullKits} completos (${fullKits} c/ capote e colete)` + (incomplete > 0 ? ` + ${incomplete} parciais (s/ capote)` : ``),
      label: incomplete > 0 ? `${fullKits} completos (+${incomplete} s/ capote)` : `${fullKits} kits`
    };
  }

  // 2. Caso especial: RZESZÓW
  if (cName.includes("RZESZOW") || cName.includes("RZESZÓW")) {
    const totalTops = counts.coletes + counts.capotes;
    const baseCalcas = counts.calcas || 0;
    const baseCamisas = counts.camisas || 0;
    
    const req = [totalTops];
    if (baseCalcas > 0) req.push(baseCalcas);
    if (baseCamisas > 0) req.push(baseCamisas);
    fullKits = req.length ? Math.min(...req) : 0;

    const descParts = [];
    if (counts.coletes > 0) descParts.push(`${counts.coletes} c/ colete`);
    if (counts.capotes > 0) descParts.push(`${counts.capotes} c/ casaco`);
    const detailStr = descParts.length ? ` (${descParts.join(" + ")})` : "";

    return {
      kits: fullKits,
      incomplete: 0,
      incompleteNote: "",
      detail: `${fullKits} trajes completos${detailStr}`,
      label: `${fullKits} kits completos${detailStr}`
    };
  }

  // 3. Regra Geral Multi-Salas (Masculino, Feminino e Botas)
  const req = [];
  if (counts.calcas > 0) req.push(counts.calcas);
  if (counts.camisas > 0) req.push(counts.camisas);
  
  if (counts.calcas > 0) {
    // Traje com calças (Masculino)
    const topTotal = counts.coletes + counts.capotes;
    if (topTotal > 0) req.push(topTotal);
  } else {
    // Traje feminino ou sem calça (Saias, Corpetes, Vestidos, Aventais)
    if (counts.coletes > 0) req.push(counts.coletes);
    if (counts.capotes > 0) req.push(counts.capotes);
  }

  // Se não foi capturado pelas categorias base, mas possui peças cadastradas
  if (req.length === 0 && Object.keys(pieceCounts).length > 0) {
    const vals = Object.values(pieceCounts).filter(v => v > 0);
    if (vals.length > 0) req.push(Math.min(...vals));
  }

  fullKits = req.length ? Math.min(...req) : 0;
  return {
    kits: fullKits,
    incomplete: 0,
    incompleteNote: "",
    detail: `${fullKits} kits`,
    label: `${fullKits} kits`
  };
}

function calcCompleteKits(costume, commonList) {
  return calcCompleteKitsInfo(costume, commonList).kits;
}

/* Helpers de Peças Compartilhadas */
const commonOf = it => {
  const r = getActiveRoom();
  return it.cid ? (r.common || []).find(x => x.id === it.cid) : null;
};
const eff = it => commonOf(it) || it;
const costumesOf = cm => {
  const r = getActiveRoom();
  return (r.costumes || []).filter(c => (c.items || []).some(i => i.cid === cm.id));
};
function cmLabel(cm) { return [cm.part, cm.type, cm.color].filter(Boolean).join(" · "); }

function chooseCostumes(cm, after) {
  const r = getActiveRoom();
  const ck = document.getElementById("ck"), list = document.getElementById("cklist");
  document.getElementById("cktit").textContent = cmLabel(cm) || "Peça compartilhada";
  const used = new Set(costumesOf(cm).map(c => c.id));
  
  function renderList(filterTxt = "") {
    const f = norm(filterTxt);
    const sorted = [...(r.costumes || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
    list.innerHTML = sorted
      .filter(c => !f || norm(c.name).includes(f))
      .map(c => `<label><input type="checkbox" value="${c.id}" ${used.has(c.id) ? "checked" : ""}> ${esc(c.name)}</label>`)
      .join("");
  }
  renderList();
  
  const searchInp = document.getElementById("ckSearch");
  searchInp.value = "";
  searchInp.oninput = e => renderList(e.target.value);
  
  document.getElementById("ckall").onclick = () => list.querySelectorAll("input").forEach(b => { b.checked = true; used.add(b.value); });
  document.getElementById("cknone").onclick = () => list.querySelectorAll("input").forEach(b => { b.checked = false; used.delete(b.value); });
  document.getElementById("ckcancel").onclick = () => ck.classList.remove("active");
  document.getElementById("ckok").onclick = () => {
    list.querySelectorAll("input").forEach(b => {
      if (b.checked) used.add(b.value);
      else used.delete(b.value);
    });
    (r.costumes || []).forEach(c => {
      const isSelected = used.has(c.id);
      const has = c.items.some(i => i.cid === cm.id);
      if (isSelected && !has) c.items.push({ id: uid(), cid: cm.id });
      if (!isSelected && has) c.items = c.items.filter(i => i.cid !== cm.id);
    });
    ck.classList.remove("active"); save(); toast("Trajes atualizados"); after();
  };
  ck.classList.add("active");
}

function newCommon(src = {}) {
  const r = getActiveRoom();
  const cm = { id: uid(), part: normalizePartName(src.part || ""), type: src.type || "", color: src.color || "", qty: src.qty || "", notes: src.notes || "", photo: src.photo || "" };
  r.common = r.common || [];
  r.common.push(cm);
  r.common.sort((a, b) => (a.part || "").localeCompare(b.part || "", "pt-BR", { sensitivity: "base" }));
  return cm;
}

function sharedIn(it, selfId) {
  const r = getActiveRoom();
  if (!it.cid) return [];
  return (r.costumes || []).filter(c => c.id !== selfId && (c.items || []).some(x => x.cid === it.cid));
}

function thumb(src, attr) { return src ? `<img class="thumb" ${attr} src="${src}" alt="">` : `<div class="nothumb" ${attr}>+ foto</div>`; }

function dancersCountFor(costumeName) {
  const normC = norm(costumeName);
  return (S.dancers || []).filter(p => Object.keys(p.nums || {}).some(d => norm(ALIAS[d] || d) === normC)).length;
}

function getCostumeGroupedComposition(costume) {
  const groups = {};
  let totalUnits = 0;
  
  (costume.items || []).forEach(raw => {
    const it = eff(raw);
    if (!it) return;
    const part = normalizePartName(it.part, costume.name);
    const q = parseQty(it.qty);
    totalUnits += q;
    
    if (!groups[part]) {
      groups[part] = { name: part, totalQty: 0, variations: {} };
    }
    groups[part].totalQty += q;
    
    const subKey = [it.type, it.color].filter(Boolean).join(" · ") || "(detalhe padrão)";
    if (!groups[part].variations[subKey]) {
      groups[part].variations[subKey] = { label: subKey, qty: 0, rawQtyStr: it.qty || "", notes: it.notes || "", isShared: !!raw.cid };
    }
    groups[part].variations[subKey].qty += q;
  });
  
  return {
    totalUnits,
    categoryCount: Object.keys(groups).length,
    groups: Object.values(groups)
  };
}

function getRoomInventoryStats(r) {
  const stats = {
    totalTrajes: (r.costumes || []).length,
    totalKits: 0,
    totalIncompleteKits: 0,
    totalUnits: 0,
    calcas: 0,
    camisas: 0,
    coletes: 0,
    capotes: 0,
    calcados: 0,
    aderecos: 0,
    outros: 0,
    comuns: (r.common || []).length
  };

  // 1. Calcula trajes completos por traje e soma peças exclusivas
  (r.costumes || []).forEach(c => {
    const kInfo = calcCompleteKitsInfo(c, r.common || []);
    stats.totalKits += kInfo.kits;
    stats.totalIncompleteKits += kInfo.incomplete;

    (c.items || []).forEach(raw => {
      // Peças exclusivas deste traje (não compartilhadas)
      if (!raw.cid) {
        const cat = classifyPiece(raw.part).key;
        const q = parseQty(raw.qty);
        stats.totalUnits += q;
        if (stats[cat] !== undefined) stats[cat] += q;
        else stats.outros += q;
      }
    });
  });

  // 2. Peças compartilhadas da sala (contadas estritamente UMA ÚNICA VEZ pelo acervo físico total)
  (r.common || []).forEach(cm => {
    const cat = classifyPiece(cm.part).key;
    const q = parseQty(cm.qty);
    stats.totalUnits += q;
    if (stats[cat] !== undefined) stats[cat] += q;
    else stats.outros += q;
  });

  return stats;
}

const bank = () => (S.bank = S.bank || []);
