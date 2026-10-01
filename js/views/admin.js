/* ===== WISŁA - VIEW: ADMIN, ACERVO DE FOTOS, BACKUP & CONFIGURAÇÕES ===== */

/* 1. Tela Banco de Fotos do Acervo (Apenas Master) */
function viewBank() {
  if (!isMasterUnlocked) { go("#/"); return; }
  const r = getActiveRoom();
  const isUnlocked = isCurrentRoomUnlocked();
  const B = bank();

  let h = `
    ${renderModeBanner(r)}
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
      <div>
        <h2 style="margin:0; font-size:20px; display:flex; align-items:center; gap:8px;">
          <span>📷</span> <span>Acervo Central de Fotos Wisła</span>
        </h2>
        <p class="note" style="margin-top:2px; margin-bottom:0">Galeria geral de fotos compartilhadas e reutilizáveis entre todas as salas e trajes.</p>
      </div>
    </div>

    ${isUnlocked ? `
      <div id="bkDrop">
        <div style="font-size:30px; margin-bottom:6px">📥</div>
        <b>Arraste as fotos para cá</b> ou <button class="btn primary sm" id="bkUp" style="margin:0 8px">⬆ Enviar do Dispositivo</button>
      </div>
    ` : ''}

    <div class="toolbar-bar noprint">
      <input type="search" id="bkQ" placeholder="Buscar foto pelo nome no acervo...">
      ${isUnlocked ? `<button class="btn primary" id="bkUpBtn">+ Nova Foto</button>` : ''}
      <span class="note" style="margin-left:auto; color:#fff; font-weight:700;">${B.length} foto(s) no acervo</span>
    </div>
    
    <div class="bk-grid">`;

  if (!B.length) {
    h += `<div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--bd);">
      <p style="color:var(--text-muted)">Nenhuma foto cadastrada no acervo geral ainda.<br>${isUnlocked ? 'Clique em <b>+ Nova Foto</b> para adicionar a primeira.' : 'Desbloqueie o modo de edição para adicionar fotos.'}</p>
    </div>`;
  } else {
    B.forEach((b, i) => {
      h += `<div class="bk-card" data-i="${i}" data-n="${esc(norm(b.name))}">
        <img src="${b.img}" alt="${esc(b.name)}" data-zoom style="cursor:zoom-in;">
        <div class="bd">
          ${isUnlocked ? `
            <input data-nm value="${esc(b.name)}" title="Nome da foto no acervo" placeholder="Nome da foto...">
            <div class="row">
              <button class="btn sm" data-zoom-btn title="Ampliar foto">🔍 Ver</button>
              <button class="btn red sm" data-del title="Excluir do acervo">🗑 Excluir</button>
            </div>
          ` : `
            <span style="font-size:12px; font-weight:700; text-align:center; padding:4px 0; color:#fff;">${esc(b.name || 'FOTO')}</span>
          `}
        </div>
      </div>`;
    });
  }

  app.innerHTML = h + `</div>`;

  const handleUploadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    openImageResizer(file, file.name, (finalImg) => {
      const defaultName = file.name.replace(/\.[^.]+$/, "").toUpperCase();
      const photoName = prompt("Nome da foto para o Acervo:", defaultName) || defaultName;
      bank().push({
        id: uid(),
        name: photoName.toUpperCase().trim(),
        img: finalImg,
        date: new Date().toISOString().slice(0, 10)
      });
      save();
      toast(`Foto "${photoName.toUpperCase()}" adicionada com sucesso ao Acervo!`);
      updateCounters();
      viewBank();
    });
  };

  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.multiple = true;
  inp.onchange = async () => {
    if (!inp.files.length) return;
    if (inp.files.length === 1) {
      handleUploadFile(inp.files[0]);
      return;
    }
    let n = 0;
    for (const f of inp.files) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const img = await readImg(f);
        bank().push({ id: uid(), name: f.name.replace(/\.[^.]+$/, "").toUpperCase(), img, date: new Date().toISOString().slice(0, 10) });
        n++;
      } catch (e) {}
    }
    save();
    toast(`${n} fotos adicionadas com sucesso ao Acervo!`);
    updateCounters();
    viewBank();
  };

  const bkUpBtn1 = document.getElementById("bkUp");
  const bkUpBtn2 = document.getElementById("bkUpBtn");
  if (bkUpBtn1) bkUpBtn1.onclick = () => inp.click();
  if (bkUpBtn2) bkUpBtn2.onclick = () => inp.click();

  const d = document.getElementById("bkDrop");
  if (d) {
    d.ondragover = e => { e.preventDefault(); d.classList.add("over"); };
    d.ondragleave = () => d.classList.remove("over");
    d.ondrop = async e => {
      e.preventDefault();
      d.classList.remove("over");
      if (!e.dataTransfer.files.length) return;
      if (e.dataTransfer.files.length === 1 && e.dataTransfer.files[0].type.startsWith("image/")) {
        handleUploadFile(e.dataTransfer.files[0]);
        return;
      }
      let n = 0;
      for (const f of e.dataTransfer.files) {
        if (!f.type.startsWith("image/")) continue;
        try {
          const img = await readImg(f);
          bank().push({ id: uid(), name: f.name.replace(/\.[^.]+$/, "").toUpperCase(), img, date: new Date().toISOString().slice(0, 10) });
          n++;
        } catch (err) {}
      }
      save();
      toast(`${n} fotos adicionadas ao Acervo!`);
      updateCounters();
      viewBank();
    };
  }

  document.getElementById("bkQ").oninput = e => {
    const q = norm(e.target.value);
    app.querySelectorAll(".bk-card").forEach(el => el.style.display = el.dataset.n.includes(q) ? "" : "none");
  };

  app.querySelectorAll(".bk-card").forEach(el => {
    const b = B[+el.dataset.i];
    if (!b) return;
    const nmInp = el.querySelector("[data-nm]");
    if (nmInp) {
      nmInp.onchange = e => {
        b.name = e.target.value.toUpperCase().trim();
        save();
        toast("Nome da foto atualizado ✓");
      };
    }
    const zoomImg = el.querySelector("[data-zoom]");
    if (zoomImg) zoomImg.onclick = () => openPhoto(b.img, null, null);
    const zoomBtn = el.querySelector("[data-zoom-btn]");
    if (zoomBtn) zoomBtn.onclick = () => openPhoto(b.img, null, null);
    const delBtn = el.querySelector("[data-del]");
    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm(`Excluir permanentemente a foto "${b.name}" do Acervo Geral?`)) return;
        S.bank = B.filter(x => x !== b);
        save();
        updateCounters();
        viewBank();
        toast("Foto removida do acervo.");
      };
    }
  });
}

/* 2. Tela Backup e Sincronização Compartilhada (Apenas Master) */
function viewBackup() {
  if (!isMasterUnlocked) { go("#/"); return; }
  const r = getActiveRoom();
  const getActiveGithubRepo = () => {
    return localStorage.getItem("wisla_gh_repo") || S.githubRepo || "jurgow/wisla";
  };
  const activeRepo = getActiveGithubRepo();
  const kb = Math.round(JSON.stringify(S).length / 1024);

  app.innerHTML = `<h2>💾 Salvar & Sincronizar Trajes</h2>
  <p class="note" style="margin-top:0">Publique as alterações no repositório compartilhado para que todos tenham acesso aos dados atualizados.</p>
  
  <!-- Cartão de Sincronização GitHub -->
  <div style="background:linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(15, 23, 42, 0.95)); border:1px solid rgba(2, 132, 199, 0.4); border-radius:16px; padding:20px; margin:16px 0; box-shadow:var(--shadow)">
    <h3 style="font-size:16px; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
      <span>☁️</span> <span>Sincronização Direta no Repositório (GitHub)</span>
    </h3>
    <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
      Ao salvar aqui, o arquivo de dados compartilhado (<code>trajes-data.js</code>) é atualizado diretamente na nuvem do repositório <b>${esc(activeRepo)}</b>.
    </p>
    
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      <button class="btn primary" id="btnPageSyncGithub" style="min-height:42px; font-size:14px;">
        <span>☁️</span> <span>Publicar Alterações no GitHub</span>
      </button>
      <button class="btn blue" id="btnPageDownloadJs" style="min-height:42px;">
        <span>⬇</span> <span>Baixar trajes-data.js Atualizado</span>
      </button>
    </div>
  </div>

  <div style="background:var(--surface-card); border:1px solid var(--bd); border-radius:16px; padding:20px; margin:16px 0; box-shadow:var(--shadow)">
    <h3 style="font-size:15px; margin-bottom:12px; color:#fff;">Estatísticas do Acervo</h3>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:18px;">
      <div style="background:#0d1322; padding:10px; border-radius:8px; text-align:center;"><b style="font-size:18px; color:var(--room-color)">${Object.keys(S.rooms).length}</b><br><span style="font-size:11px; color:var(--text-muted)">Salas</span></div>
      <div style="background:#0d1322; padding:10px; border-radius:8px; text-align:center;"><b style="font-size:18px; color:var(--room-color)">${Object.values(S.rooms).reduce((a, rm) => a + (rm.costumes || []).length, 0)}</b><br><span style="font-size:11px; color:var(--text-muted)">Trajes Totais</span></div>
      <div style="background:#0d1322; padding:10px; border-radius:8px; text-align:center;"><b style="font-size:18px; color:var(--room-color)">${S.dancers.length}</b><br><span style="font-size:11px; color:var(--text-muted)">Dançarinos</span></div>
      <div style="background:#0d1322; padding:10px; border-radius:8px; text-align:center;"><b style="font-size:18px; color:var(--room-color)">${(S.bank || []).length}</b><br><span style="font-size:11px; color:var(--text-muted)">Fotos</span></div>
      <div style="background:#0d1322; padding:10px; border-radius:8px; text-align:center;"><b style="font-size:18px; color:var(--room-color)">${kb} KB</b><br><span style="font-size:11px; color:var(--text-muted)">Tamanho</span></div>
    </div>
    
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn" id="bAll">⬇ Baixar Backup JSON (.json)</button>
      <button class="btn" id="bRoom">⬇ Baixar Backup de "${esc(r.name)}"</button>
      <button class="btn red" id="bI">⬆ Restaurar Backup Local (.json)</button>
      <button class="btn blue" id="btnRestoreBootsFem">👢 Recarregar Botas Femininas Padrão</button>
    </div>
  </div>`;

  const doDownloadJs = () => {
    const jsContent = 'window.WISLA_DEFAULT_DATA = ' + JSON.stringify(S) + ';';
    download('trajes-data.js', jsContent, 'application/javascript');
    toast("trajes-data.js baixado com sucesso!");
  };

  const doSyncGitHub = async () => {
    let token = localStorage.getItem("wisla_gh_pat") || "";
    if (!token) {
      token = prompt("Digite seu Token do GitHub (PAT) para sincronizar:", "");
      if (!token) return;
      localStorage.setItem("wisla_gh_pat", token.trim());
    }

    const repoInput = document.getElementById("ghRepoInput");
    if (repoInput && repoInput.value.trim()) {
      localStorage.setItem("wisla_gh_repo", repoInput.value.trim());
    }
    const repo = getActiveGithubRepo();

    toast(`Sincronizando com GitHub (${repo})...`);
    try {
      const path = "trajes-data.js";
      let apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      
      let sha = "";
      let getRes = await fetch(apiUrl, {
        headers: { "Authorization": `token ${token.trim()}`, "Accept": "application/vnd.github.v3+json" }
      });
      // Fallback para trajes-masculinos se o repositorio wisla ainda nao foi renomeado no GitHub
      if (getRes.status === 404 && repo.includes("wisla")) {
        const fallbackUrl = `https://api.github.com/repos/jurgow/trajes-masculinos/contents/${path}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { "Authorization": `token ${token.trim()}`, "Accept": "application/vnd.github.v3+json" }
        });
        if (fallbackRes.ok) {
          apiUrl = fallbackUrl;
          getRes = fallbackRes;
        }
      }
      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }

      const jsContent = 'window.WISLA_DEFAULT_DATA = ' + JSON.stringify(S) + ';';
      const utf8Bytes = new TextEncoder().encode(jsContent);
      let binaryStr = "";
      for (let i = 0; i < utf8Bytes.length; i++) binaryStr += String.fromCharCode(utf8Bytes[i]);
      const base64Content = btoa(binaryStr);

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Authorization": `token ${token.trim()}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `update: alteracao de dados via app Wisla (${today()})`,
          content: base64Content,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        toast("✓ Publicado no GitHub com sucesso!");
        alert(`Sucesso! As alterações foram publicadas no repositório GitHub (${repo}) e estão disponíveis para todos.`);
      } else {
        const err = await putRes.json();
        alert("Erro ao sincronizar com GitHub: " + (err.message || "Verifique o token e o repositório."));
      }
    } catch (e) {
      alert("Erro na conexão com GitHub: " + e.message);
    }
  };

  const btnPageSync = document.getElementById("btnPageSyncGithub");
  if (btnPageSync) btnPageSync.onclick = doSyncGitHub;
  const btnSync = document.getElementById("btnSyncGithub");
  if (btnSync) btnSync.onclick = doSyncGitHub;
  const btnPageDown = document.getElementById("btnPageDownloadJs");
  if (btnPageDown) btnPageDown.onclick = doDownloadJs;
  const btnDown = document.getElementById("btnDownloadDataJs");
  if (btnDown) btnDown.onclick = doDownloadJs;

  document.getElementById("bAll").onclick = () => download(`wisla-trajes-geral-${today()}.json`, JSON.stringify(S), "application/json");
  document.getElementById("bRoom").onclick = () => download(`wisla-${r.id}-${today()}.json`, JSON.stringify(r), "application/json");
  document.getElementById("bI").onclick = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = async () => {
      try {
        const d = JSON.parse(await inp.files[0].text());
        if (confirm("Restaurar este backup substituindo os dados correspondentes?")) {
          S = migrateState(d);
          save();
          updateThemeForActiveRoom();
          toast("Backup do Wisła restaurado com sucesso!");
          go("#/");
        }
      } catch (e) { alert("Arquivo de backup inválido."); }
    };
    inp.click();
  };

  const bRestoreBoots = document.getElementById("btnRestoreBootsFem");
  if (bRestoreBoots) {
    bRestoreBoots.onclick = () => {
      if (confirm("Deseja restaurar os 12 modelos e 291 calçados padrão na sala 'Botas Femininas'? (Se houver trajes femininos criados lá por engano, eles serão transferidos automaticamente para 'Trajes Femininos')")) {
        const defaultBootList = (typeof window !== "undefined" && window.WISLA_DEFAULT_DATA && window.WISLA_DEFAULT_DATA.rooms && window.WISLA_DEFAULT_DATA.rooms.botas_fem && window.WISLA_DEFAULT_DATA.rooms.botas_fem.costumes) || [];
        if (defaultBootList.length > 0) {
          if (!S.rooms.botas_fem) S.rooms.botas_fem = JSON.parse(JSON.stringify(DEFAULT_ROOMS.botas_fem));
          
          const currentCostumes = S.rooms.botas_fem.costumes || [];
          const officialNames = new Set(defaultBootList.map(b => (b.name || "").toUpperCase().trim()));
          const nonBootCostumes = currentCostumes.filter(c => {
            const nm = (c.name || "").toUpperCase().trim();
            return !officialNames.has(nm) && !nm.startsWith("BOTA") && !nm.startsWith("SAPATO") && !nm.startsWith("SANDÁLIA") && !nm.startsWith("SAPATILHA");
          });
          if (nonBootCostumes.length > 0) {
            if (!S.rooms.feminino) S.rooms.feminino = JSON.parse(JSON.stringify(DEFAULT_ROOMS.feminino));
            if (!Array.isArray(S.rooms.feminino.costumes)) S.rooms.feminino.costumes = [];
            nonBootCostumes.forEach(nb => {
              if (!S.rooms.feminino.costumes.some(fc => fc.id === nb.id || fc.name === nb.name)) {
                S.rooms.feminino.costumes.push(nb);
              }
            });
          }
          
          S.rooms.botas_fem.costumes = JSON.parse(JSON.stringify(defaultBootList));
          save();
          updateThemeForActiveRoom();
          toast("12 modelos de calçados restaurados com sucesso em Botas Femininas!");
          viewAdmin();
        }
      }
    };
  }
}

/* 3. Configurações & Gestão de Salas (Apenas Master) */
function renderRoomsManagement() {
  const container = document.getElementById("roomsManagementList");
  if (!container) return;

  const addBtn = document.getElementById("adminAddNewRoomBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      requireMasterAuth(() => {
        const name = prompt("Nome da nova sala / departamento de trajes:");
        if (!name || !name.trim()) return;
        const icon = prompt("Ícone (emoji) para a sala:", "📁") || "📁";
        const desc = prompt("Descrição breve da sala:", "Departamento de trajes") || "";
        const id = uid();
        S.rooms[id] = {
          id,
          name: name.trim(),
          icon,
          color: "#0284c7",
          desc,
          pin: "",
          costumes: [],
          common: []
        };
        save();
        toast(`Sala "${name}" criada com sucesso!`);
        renderRoomsManagement();
      });
    };
  }

  container.innerHTML = getSortedRoomsList(S.rooms).map(r => {
    const hasPin = !!r.pin;
    const stats = getRoomInventoryStats(r);
    const isDefault = ["masculino", "feminino", "botas_masc", "botas_fem", "aderecos_fem"].includes(r.id);
    return `<div style="background:var(--surface-card); border:1px solid var(--bd); border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:22px;">${r.icon || '📁'}</span>
        <div>
          <b style="color:#fff; font-size:14px;">${esc(r.name)}</b>
          <div style="font-size:11px; color:var(--text-muted);"><b>${stats.totalKits} ${(r.id.includes('botas') || r.id.includes('aderecos')) ? 'itens prontos' : 'trajes completos'}</b> (${stats.totalTrajes} modelos) · Status: ${hasPin ? '🔒 PIN Protegido' : '🔓 Acesso Livre'}</div>
        </div>
      </div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <button class="btn sm" data-setpin="${r.id}">${hasPin ? 'Alterar PIN' : 'Definir PIN'}</button>
        ${hasPin ? `<button class="btn sm red" data-rempin="${r.id}">Remover PIN</button>` : ''}
        ${!isDefault ? `<button class="btn sm red" data-delroom="${r.id}" title="Excluir Sala Permanentemente">🗑️ Excluir</button>` : ''}
      </div>
    </div>`;
  }).join("");

  container.querySelectorAll("[data-setpin]").forEach(btn => {
    btn.onclick = () => {
      requireMasterAuth(() => {
        const rid = btn.dataset.setpin;
        const targetRoom = S.rooms[rid];
        const np = prompt(`Digite o novo PIN numérico para "${targetRoom.name}":`);
        if (np) {
          targetRoom.pin = hash(np);
          save();
          toast(`PIN de ${targetRoom.name} atualizado!`);
          renderRoomsManagement();
        }
      });
    };
  });

  container.querySelectorAll("[data-rempin]").forEach(btn => {
    btn.onclick = () => {
      requireMasterAuth(() => {
        const rid = btn.dataset.rempin;
        const targetRoom = S.rooms[rid];
        if (confirm(`Remover a senha de "${targetRoom.name}"? Ela ficará sempre aberta para edição.`)) {
          targetRoom.pin = "";
          save();
          toast(`PIN de ${targetRoom.name} removido!`);
          renderRoomsManagement();
        }
      });
    };
  });

  container.querySelectorAll("[data-delroom]").forEach(btn => {
    btn.onclick = () => {
      requireMasterAuth(() => {
        const rid = btn.dataset.delroom;
        const targetRoom = S.rooms[rid];
        if (!targetRoom) return;
        const totalItems = (targetRoom.costumes || []).length;
        if (confirm(`Tem certeza que deseja excluir permanentemente a sala "${targetRoom.name}"? ${totalItems > 0 ? `\n\nATENÇÃO: Ela possui ${totalItems} trajes cadastrados que serão apagados!` : ''}`)) {
          if (getActiveRoomId() === rid) {
            setActiveRoomId("masculino");
            updateThemeForActiveRoom();
          }
          delete S.rooms[rid];
          save();
          toast(`Sala "${targetRoom.name}" excluída.`);
          renderRoomsManagement();
          route();
        }
      });
    };
  });
}

async function testCloudConnection(silent = false) {
  const url = getCloudDbUrl();
  if (!url) {
    updateCloudStatus("local");
    if (!silent) alert("Informe uma URL de banco na nuvem antes de testar.");
    return;
  }
  try {
    updateCloudStatus("syncing");
    const testUrl = url.replace(/\.json(\?.*)?$/, "/version.json");
    const res = await fetchWithTimeout(testUrl, {}, 6000);
    if (res.ok) {
      updateCloudStatus("online");
      if (!silent) alert("✓ Conexão com o banco na nuvem estabelecida com sucesso!");
    } else {
      updateCloudStatus("error");
      if (!silent) alert(`Erro na conexão com a nuvem (HTTP ${res.status}). Verifique as regras de leitura/escrita do Firebase.`);
    }
  } catch (e) {
    updateCloudStatus("offline");
    if (!silent) alert("Erro ao acessar a URL da nuvem. Verifique sua conexão e se a URL está correta (ex: https://...firebaseio.com/acervo.json).");
  }
}

function initSettingsModal() {
  document.getElementById("settingsDlg").classList.add("active");
  
  // Nuvem / Firebase
  const cloudInp = document.getElementById("cloudDbUrlInput");
  if (cloudInp) {
    cloudInp.value = getCloudDbUrl();
    cloudInp.onchange = () => {
      setCloudDbUrl(cloudInp.value);
      testCloudConnection(true);
    };
  }

  // GitHub Backup
  const ghInp = document.getElementById("ghTokenInput");
  if (ghInp) {
    ghInp.value = localStorage.getItem("wisla_gh_pat") || "";
    ghInp.onchange = () => localStorage.setItem("wisla_gh_pat", ghInp.value.trim());
  }
  const ghRepoInp = document.getElementById("ghRepoInput");
  if (ghRepoInp) {
    ghRepoInp.value = localStorage.getItem("wisla_gh_repo") || S.githubRepo || "jurgow/wisla";
    ghRepoInp.onchange = () => {
      localStorage.setItem("wisla_gh_repo", ghRepoInp.value.trim());
      toast("Repositório atualizado!");
    };
  }
  renderRoomsManagement();
}

function setupAdminListeners() {
  // Botões da Nuvem em Tempo Real
  const btnTestCloud = document.getElementById("btnTestCloud");
  if (btnTestCloud) btnTestCloud.onclick = () => testCloudConnection(false);

  const btnPullCloud = document.getElementById("btnPullCloud");
  if (btnPullCloud) btnPullCloud.onclick = () => cloudSyncPull(true);

  const btnPushCloud = document.getElementById("btnPushCloud");
  if (btnPushCloud) btnPushCloud.onclick = () => {
    cloudSyncPush();
    toast("⬆ Enviando dados para a nuvem...");
  };

  const btnDisconnectCloud = document.getElementById("btnDisconnectCloud");
  if (btnDisconnectCloud) btnDisconnectCloud.onclick = () => {
    if (confirm("Desconectar do banco na nuvem? O aplicativo voltará a salvar apenas na memória local deste dispositivo.")) {
      setCloudDbUrl("");
      updateCloudStatus("local");
      const cloudInp = document.getElementById("cloudDbUrlInput");
      if (cloudInp) cloudInp.value = "";
      toast("Desconectado da nuvem 💾");
    }
  };

  // Pill de Nuvem no Header (atalho rápido)
  const cloudPill = document.getElementById("cloudPill");
  if (cloudPill) cloudPill.onclick = () => {
    const url = getCloudDbUrl();
    if (url) {
      cloudSyncPull(true);
    } else {
      requireMasterAuth(() => {
        initSettingsModal();
        // Ativa aba de nuvem
        document.querySelectorAll(".settings-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
        const tabSyncBtn = document.querySelector(".settings-tab-btn[data-tab='tab-sync']");
        if (tabSyncBtn) tabSyncBtn.classList.add("active");
        const tabSyncSec = document.getElementById("tab-sync");
        if (tabSyncSec) tabSyncSec.classList.add("active");
      });
    }
  };

  const openSettingsBtn = document.getElementById("openSettingsBtn");
  if (openSettingsBtn) {
    openSettingsBtn.onclick = () => {
      if (!isMasterUnlocked) {
        requireMasterAuth(() => initSettingsModal());
        return;
      }
      initSettingsModal();
    };
  }
  const sideManageRoomsBtn = document.getElementById("sideManageRoomsBtn");
  if (sideManageRoomsBtn) {
    sideManageRoomsBtn.onclick = () => {
      requireMasterAuth(() => initSettingsModal());
    };
  }
  const closeSettingsBtn = document.getElementById("closeSettingsModalBtn");
  if (closeSettingsBtn) closeSettingsBtn.onclick = () => document.getElementById("settingsDlg").classList.remove("active");
  const settingsDlg = document.getElementById("settingsDlg");
  if (settingsDlg) settingsDlg.onclick = e => { if (e.target.id === "settingsDlg") settingsDlg.classList.remove("active"); };

  document.querySelectorAll(".settings-tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".settings-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });

  const ghTokenInp = document.getElementById("ghTokenInput");
  if (ghTokenInp) {
    ghTokenInp.onchange = e => {
      localStorage.setItem("wisla_gh_pat", e.target.value.trim());
      toast("Token do GitHub salvo no navegador!");
    };
  }

  const changeLogoBtn = document.getElementById("changeLogoBtn");
  if (changeLogoBtn) {
    changeLogoBtn.onclick = () => {
      requireMasterAuth(() => {
        pickImg(img => {
          S.logo = img;
          save();
          document.getElementById("logoImg").src = img;
          toast("Logo do Wisła atualizada com sucesso!");
        });
      });
    };
  }
}
