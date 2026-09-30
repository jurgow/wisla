/* ===== WISŁA - VIEW: TELA INICIAL (HOME DA SALA ATIVA) ===== */

function viewHome() {
  const r = getActiveRoom();
  const stats = getRoomInventoryStats(r);
  const isUnlocked = isCurrentRoomUnlocked();
  r.costumes = r.costumes || [];
  r.costumes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));

  let h = `
  ${renderModeBanner(r)}

  <!-- Banner Hero da Sala com Foco em Trajes Completos -->
  <div class="room-hero-card noprint" onclick="openRoomSwitcher()" style="cursor:pointer;" title="Clique para trocar de sala">
    <div class="room-hero-info">
      <div class="room-hero-icon">${r.icon || '📁'}</div>
      <div>
        <div class="room-hero-title" style="display:flex; align-items:center; gap:8px;">
          <span>${esc(r.name)}</span>
          <span style="font-size:11px; background:rgba(255,255,255,0.12); border-radius:6px; padding:2px 8px; font-weight:600;">Trocar sala ▾</span>
        </div>
        <div class="room-hero-desc">${esc(r.desc || 'Gestão de Trajes Folclóricos · Wisła')}</div>
      </div>
    </div>
    <div class="room-hero-stats">
      <div class="hero-stat-chip highlight">
        <span class="hero-stat-num">${stats.totalKits}</span>
        <span class="hero-stat-label">Trajes Completos</span>
      </div>
      <div class="hero-stat-chip">
        <span class="hero-stat-num">${stats.totalTrajes}</span>
        <span class="hero-stat-label">Modelos / Regiões</span>
      </div>
    </div>
  </div>

  <!-- KPIs de Categorias Clicáveis -->
  <div class="kpi-grid noprint">
    <div class="kpi-card" onclick="currentPieceCategory='all'; go('#/pecas');">
      <span class="kpi-card-icon">${r.icon || '📁'}</span>
      <span class="kpi-num">${stats.totalKits} <small style="font-size:11px;font-weight:600;">kits</small></span>
      <span class="kpi-label">${r.id.includes('botas') ? 'Itens Prontos' : 'Trajes Completos'}</span>
    </div>
    ${(stats.calcas > 0 || r.id === 'masculino') ? `
    <div class="kpi-card" onclick="currentPieceCategory='calcas'; go('#/pecas');">
      <span class="kpi-card-icon">👖</span>
      <span class="kpi-num">${stats.calcas} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">Calças</span>
    </div>` : ''}
    <div class="kpi-card" onclick="currentPieceCategory='camisas'; go('#/pecas');">
      <span class="kpi-card-icon">👔</span>
      <span class="kpi-num">${stats.camisas} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">${r.id === 'feminino' ? 'Blusas & Camisas' : 'Camisas'}</span>
    </div>
    <div class="kpi-card" onclick="currentPieceCategory='coletes'; go('#/pecas');">
      <span class="kpi-card-icon">🦺</span>
      <span class="kpi-num">${stats.coletes} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">${r.id === 'feminino' ? 'Corpetes & Coletes' : 'Coletes'}</span>
    </div>
    <div class="kpi-card" onclick="currentPieceCategory='capotes'; go('#/pecas');">
      <span class="kpi-card-icon">${r.id === 'feminino' ? '👗' : '🧥'}</span>
      <span class="kpi-num">${stats.capotes} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">${r.id === 'feminino' ? 'Saias & Aventais' : 'Capotes / Sukmanas'}</span>
    </div>
    <div class="kpi-card" onclick="currentPieceCategory='calcados'; go('#/pecas');">
      <span class="kpi-card-icon">${r.id === 'botas_fem' ? '👠' : '👢'}</span>
      <span class="kpi-num">${stats.calcados} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">Botas & Calçados</span>
    </div>
    <div class="kpi-card" onclick="currentPieceCategory='aderecos'; go('#/pecas');">
      <span class="kpi-card-icon">🎗️</span>
      <span class="kpi-num">${stats.aderecos} <small style="font-size:11px;font-weight:600;">un</small></span>
      <span class="kpi-label">Adereços & Faixas</span>
    </div>
  </div>

  <div class="toolbar-bar noprint">
    <input type="search" id="q" placeholder="Filtrar traje em ordem alfabética...">
    <div class="view-switcher">
      <button class="view-btn ${currentHomeView === 'cards' ? 'active' : ''}" id="vCards">📇 Cartões</button>
      <button class="view-btn ${currentHomeView === 'matrix' ? 'active' : ''}" id="vMatrix">📊 Matriz de Estoque</button>
    </div>
    <button class="btn primary" id="addC">+ Novo Traje</button>
  </div>`;

  if (!r.costumes.length) {
    h += `<div style="padding: 40px 16px; text-align: center; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--bd);">
      <div style="font-size: 40px; margin-bottom: 10px;">${r.icon || '📁'}</div>
      <h3 style="font-size: 16px; margin-bottom: 6px; color:#fff;">Nenhum traje cadastrado em "${esc(r.name)}"</h3>
      <p style="color: var(--text-muted); margin-bottom: 16px; font-size:13px;">Adicione o primeiro item desta sala.</p>
      <button class="btn primary" onclick="document.getElementById('addC').click()">+ Criar Primeiro</button>
    </div>`;
  } else if (currentHomeView === 'cards') {
    h += `<div class="grid">`;
    r.costumes.forEach(c => {
      const comp = getCostumeGroupedComposition(c);
      const kitInfo = calcCompleteKitsInfo(c, r.common || []);
      const dancerCount = dancersCountFor(c.name);
      
      const pills = comp.groups.map(g => {
        return `<span class="part-pill">${esc(g.name)}: <b>${g.totalQty ? g.totalQty : '✓'}</b></span>`;
      }).slice(0, 3).join("");
      
      const extraCount = comp.groups.length > 3 ? `<span class="part-pill">+${comp.groups.length - 3}</span>` : "";

      h += `<div class="card" data-id="${c.id}" data-name="${esc(norm(c.name))}">
        <div class="ph">
          ${c.photo ? `<img src="${c.photo}" alt="${esc(c.name)}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit; display:block;">` : `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:36px; opacity:0.6;">${r.icon || "👔"}</div>`}
          <div class="card-badges">
            <span class="badge-count room">
              <span><b>${kitInfo.kits || comp.totalUnits || 0}</b> ${kitInfo.kits ? ((r.id.includes('botas') || r.id.includes('aderecos')) ? 'prontos' : 'kits') : (comp.totalUnits ? 'peças' : 'Novo')}</span>
              ${kitInfo.incomplete > 0 ? `<span class="badge-incomplete">+${kitInfo.incomplete} s/ capote</span>` : ''}
            </span>
          </div>
          ${isUnlocked ? `
            <button class="btn-card-photo-edit" data-photo-edit="${c.id}" title="Alterar foto do traje (${esc(c.name)})">
              📷 Foto
            </button>
          ` : ''}
        </div>
        <div class="nm-row">
          <div class="nm">${esc(c.name)}</div>
          ${isUnlocked ? `<button class="btn-rename-card" data-rename="${c.id}" title="Renomear traje (A-Z)">✏️</button>` : ''}
        </div>
        <div class="comp-preview">
          ${pills ? pills + extraCount : '<span style="color:var(--text-light)">(sem peças)</span>'}
        </div>
        <div class="card-footer">
          <span>👥 ${dancerCount}</span>
          <span style="color:var(--pri-light); font-weight:700;">Ver Ficha →</span>
        </div>
      </div>`;
    });
    h += `</div>`;
  } else {
    h += `<div class="wrap"><table><thead><tr>
      <th>Traje / Item (A-Z)</th>
      <th>Foto</th>
      <th style="text-align:center; color:var(--pri-light);">${(r.id.includes('botas') || r.id.includes('aderecos')) ? 'Itens Prontos' : 'Trajes Completos'}</th>
      <th style="text-align:center">${r.id === 'feminino' ? '🦺 Corpetes' : '🦺 Coletes'}</th>
      <th style="text-align:center">${r.id === 'feminino' ? '👔 Blusas' : '👔 Camisas'}</th>
      ${r.id === 'feminino' ? '<th style="text-align:center">👗 Saias</th>' : '<th style="text-align:center">👖 Calças</th>'}
      <th style="text-align:center">${r.id === 'feminino' ? '🧥 Aventais / Capotes' : '🧥 Capotes / Sukmanas'}</th>
      <th style="text-align:center">${r.id === 'botas_fem' ? '👠 Calçados' : '👢 Botas'}</th>
      <th style="text-align:center">🎗️ Adereços</th>
      <th style="text-align:center">👥 Dançarinos</th>
    </tr></thead><tbody>`;

    r.costumes.forEach(c => {
      const kitInfo = calcCompleteKitsInfo(c, r.common || []);
      const dancerCount = dancersCountFor(c.name);
      const counts = { coletes: 0, camisas: 0, calcas: 0, capotes: 0, calcados: 0, aderecos: 0, outros: 0 };
      (c.items || []).forEach(raw => {
        const it = eff(raw); if (!it) return;
        const cat = classifyPiece(it.part).key;
        const q = parseQty(it.qty);
        if (counts[cat] !== undefined) counts[cat] += q;
        else counts.outros += q;
      });

      h += `<tr data-id="${c.id}" data-name="${esc(norm(c.name))}" style="cursor:pointer" onclick="go('#/traje/${c.id}')">
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <b style="color:#fff; font-size:14px;">${esc(c.name)}</b>
            ${isUnlocked ? `<button class="btn-rename-card" data-rename="${c.id}" onclick="event.stopPropagation()" title="Renomear traje">✏️</button>` : ''}
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            ${c.photo ? `<img class="thumb" src="${c.photo}" style="width:40px; height:40px;">` : `<span style="color:var(--text-light)">-</span>`}
            ${isUnlocked ? `<button class="btn-rename-card" data-photo-edit="${c.id}" onclick="event.stopPropagation()" title="Alterar foto">📷</button>` : ''}
          </div>
        </td>
        <td style="text-align:center; font-weight:800; color:var(--pri-light); font-size:15px;">
          ${kitInfo.kits} ${r.id.includes('botas') ? 'itens' : 'trajes'}
          ${kitInfo.incomplete > 0 ? `<div style="font-size:11px; font-weight:700; color:#fbbf24; margin-top:2px;">+${kitInfo.incomplete} não completos<br><span style="font-weight:400; font-size:10px; color:#cbd5e1;">(${kitInfo.incompleteNote})</span></div>` : ''}
        </td>
        <td style="text-align:center; font-weight:700;">${counts.coletes ? counts.coletes + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${counts.camisas ? counts.camisas + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${(r.id === 'feminino' ? counts.capotes : counts.calcas) ? (r.id === 'feminino' ? counts.capotes : counts.calcas) + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${(r.id === 'feminino' ? counts.outros : counts.capotes) ? (r.id === 'feminino' ? counts.outros : counts.capotes) + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${counts.calcados ? counts.calcados + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${counts.aderecos ? counts.aderecos + ' un' : '-'}</td>
        <td style="text-align:center; font-weight:700;">${dancerCount ? dancerCount + ' 👥' : '-'}</td>
      </tr>`;
    });
    h += `</tbody></table></div>`;
  }

  app.innerHTML = h;

  if (currentHomeView === 'cards') {
    app.querySelectorAll(".card").forEach(el => el.onclick = () => go("#/traje/" + el.dataset.id));
  }

  // Alterar Foto Diretamente pela Home (Cartões ou Matriz)
  app.querySelectorAll("[data-photo-edit]").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const cid = btn.dataset.photoEdit;
      const targetCostume = r.costumes.find(x => x.id === cid);
      if (!targetCostume) return;
      const set = p => {
        targetCostume.photo = p;
        save();
        viewHome();
      };
      if (targetCostume.photo) {
        openPhoto(targetCostume.photo, set, () => {
          if (confirm(`Remover a foto do traje "${targetCostume.name}"?`)) set("");
        });
      } else {
        pickImg(set);
      }
    };
  });

  // Renomear Fácil na Tela Inicial
  app.querySelectorAll("[data-rename]").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const cid = btn.dataset.rename;
      const targetCostume = r.costumes.find(x => x.id === cid);
      if (!targetCostume) return;
      const newName = prompt(`Renomear traje "${targetCostume.name}" para:`, targetCostume.name);
      if (newName && newName.trim()) {
        targetCostume.name = fixPolishName(newName.trim());
        r.costumes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
        save();
        toast(`Traje renomeado para "${targetCostume.name}"!`);
        viewHome();
      }
    };
  });

  const qEl = document.getElementById("q");
  if (qEl) qEl.oninput = e => {
    const q = norm(e.target.value);
    const sel = currentHomeView === 'cards' ? ".card" : "tbody tr";
    app.querySelectorAll(sel).forEach(el => el.style.display = el.dataset.name.includes(q) ? "" : "none");
  };

  document.getElementById("vCards").onclick = () => { currentHomeView = "cards"; localStorage.setItem("wislaHomeView", "cards"); viewHome(); };
  document.getElementById("vMatrix").onclick = () => { currentHomeView = "matrix"; localStorage.setItem("wislaHomeView", "matrix"); viewHome(); };

  document.getElementById("addC").onclick = () => {
    const name = prompt(`Nome do novo traje para ${r.name} (ex: ŁOWICZ, KRAKOWIAK, SĄCZ):`); if (!name) return;
    const c = { id: uid(), name: fixPolishName(name), photo: "", items: [] };
    r.costumes.push(c);
    r.costumes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
    save(); updateCounters(); go("#/traje/" + c.id);
  };
}
