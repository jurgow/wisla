/* ===== WISŁA - VIEW: DETALHES DO TRAJE ===== */

function viewCostume(id) {
  let r = getActiveRoom();
  let c = (r.costumes || []).find(x => x.id === id);
  if (!c) {
    const foundRoom = Object.values(S.rooms).find(room => (room.costumes || []).some(x => x.id === id));
    if (foundRoom) {
      setActiveRoomId(foundRoom.id);
      r = foundRoom;
      c = (r.costumes || []).find(x => x.id === id);
      updateThemeForActiveRoom();
      updateCounters();
    }
  }
  if (!c) { app.innerHTML = `<p style="padding:40px; text-align:center">Traje não encontrado nesta sala. <a href="#/">Voltar</a></p>`; return; }
  c.items = (c.items || []).filter(it => !it.cid || commonOf(it));
  const avail = (r.common || []).filter(cm => !c.items.some(i => i.cid === cm.id));
  const dancerCount = dancersCountFor(c.name);
  const comp = getCostumeGroupedComposition(c);
  const kitInfo = calcCompleteKitsInfo(c, r.common || []);
  const isUnlocked = isCurrentRoomUnlocked();

  // Contagem direta por categoria para os badges rápidos de quantidade
  const counts = { coletes: 0, camisas: 0, calcas: 0, capotes: 0, calcados: 0, aderecos: 0, outros: 0 };
  (c.items || []).forEach(raw => {
    const it = eff(raw); if (!it) return;
    const cat = classifyPiece(it.part).key;
    const q = parseQty(it.qty);
    if (counts[cat] !== undefined) counts[cat] += q;
    else counts.outros += q;
  });

  let h = `
  ${renderModeBanner(r)}
  
  <div class="costume-topbar noprint">
    <button class="btn" onclick="go('#/')">← Voltar (${esc(r.name)})</button>
    <div style="margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      ${isUnlocked ? `
        <button class="btn primary" id="addCustomPieceTopBtn">➕ Adicionar Peça</button>
        <button class="btn" id="renameCostumeBtn" title="Renomear traje (A-Z)">✏️ Renomear Traje</button>
      ` : ''}
      <button class="btn" onclick="window.print()" title="Imprimir ficha">🖨️ Imprimir</button>
      ${isUnlocked ? `
        <button class="btn red" id="delC" title="Excluir traje">🗑️ Excluir</button>
      ` : ''}
    </div>
  </div>
  
  <!-- HERO CARD DO TRAJE (FOCO MÁXIMO EM QUANTIDADES DE INÍCIO) -->
  <div class="costume-hero-card">
    <div class="costume-hero-photo" id="cover" title="${isUnlocked ? 'Clique para ver ou alterar a foto do traje' : 'Ver foto'}">
      ${c.photo ? `<img src="${c.photo}" alt="${esc(c.name)}">` : `<div class="costume-hero-no-photo">${r.icon || '👔'}<br><small>${isUnlocked ? '📷 + Foto' : 'Sem foto'}</small></div>`}
      ${isUnlocked ? `<span class="photo-edit-hint">📷 Alterar Foto</span>` : ''}
    </div>
    
    <div class="costume-hero-details">
      <div class="costume-title-row">
        <h1 class="costume-title">${esc(c.name)}</h1>
        ${isUnlocked ? `<button class="btn-edit-title" id="btnEditTitleDirect" title="Renomear traje">✏️ Renomear</button>` : ''}
      </div>

      <!-- DESTAQUE PRINCIPAL DE QUANTIDADE -->
      <div class="costume-main-kpis">
        <div class="costume-kpi-badge main">
          <span class="costume-kpi-val">${kitInfo.kits}</span>
          <span class="costume-kpi-lbl">${r.id.includes('botas') ? 'Itens Prontos' : 'Trajes Completos'}</span>
        </div>
        ${kitInfo.incomplete > 0 ? `
        <div class="costume-kpi-badge warning" title="${kitInfo.incompleteNote}">
          <span class="costume-kpi-val">+${kitInfo.incomplete}</span>
          <span class="costume-kpi-lbl">s/ capote</span>
        </div>` : ''}
        <div class="costume-kpi-badge">
          <span class="costume-kpi-val">${comp.totalUnits || c.items.length} un</span>
          <span class="costume-kpi-lbl">Peças no Traje</span>
        </div>
        <div class="costume-kpi-badge">
          <span class="costume-kpi-val">${dancerCount}</span>
          <span class="costume-kpi-lbl">👥 Dançarinos</span>
        </div>
      </div>

      <!-- RESUMO RÁPIDO DE QUANTIDADES POR PEÇA -->
      <div class="costume-qty-pills-bar">
        ${counts.coletes > 0 ? `<span class="qty-pill">🦺 ${r.id === 'feminino' ? 'Corpetes' : 'Coletes'}: <b>${counts.coletes} un</b></span>` : ''}
        ${counts.camisas > 0 ? `<span class="qty-pill">👔 ${r.id === 'feminino' ? 'Blusas' : 'Camisas'}: <b>${counts.camisas} un</b></span>` : ''}
        ${counts.calcas > 0 ? `<span class="qty-pill">👖 Calças: <b>${counts.calcas} un</b></span>` : ''}
        ${counts.capotes > 0 ? `<span class="qty-pill">${r.id === 'feminino' ? '👗 Saias' : '🧥 Capotes'}: <b>${counts.capotes} un</b></span>` : ''}
        ${counts.calcados > 0 ? `<span class="qty-pill">${r.id === 'botas_fem' ? '👠 Calçados' : '👢 Botas'}: <b>${counts.calcados} un</b></span>` : ''}
        ${counts.aderecos > 0 ? `<span class="qty-pill">🎗️ Adereços: <b>${counts.aderecos} un</b></span>` : ''}
        ${counts.outros > 0 ? `<span class="qty-pill">📦 Outras Peças: <b>${counts.outros} un</b></span>` : ''}
      </div>
    </div>
  </div>

  ${kitInfo.incomplete > 0 ? `
  <div style="margin: 0 0 16px; padding: 10px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; font-size: 13px; color: #fde68a; display: flex; align-items: center; gap: 8px;">
    <span>ℹ️</span>
    <span><b>Regra Sącz:</b> ${kitInfo.kits} trajes completos (Colete + Calça + Capote) e ${kitInfo.incomplete} parciais (${kitInfo.incompleteNote}).</span>
  </div>` : ''}

  <!-- PAINEL DE ADIÇÃO RÁPIDA DE PEÇAS NO MODO EDIÇÃO -->
  ${isUnlocked ? `
  <div class="costume-quick-add-section noprint">
    <div class="quick-add-title">
      <span>⚡ <b>Inserção Rápida de Peça:</b></span>
    </div>
    <div class="quick-add-buttons-flow">
      ${r.id === 'feminino' ? `
        <button class="btn-preset-add" data-qa-part="CORPETE">🦺 + Corpete</button>
        <button class="btn-preset-add" data-qa-part="BLUSA">👔 + Blusa</button>
        <button class="btn-preset-add" data-qa-part="SAIA">👗 + Saia</button>
        <button class="btn-preset-add" data-qa-part="AVENTAL">👗 + Avental (Zapaska)</button>
        <button class="btn-preset-add" data-qa-part="BOTAS">👠 + Botas / Sapatos</button>
        <button class="btn-preset-add" data-qa-part="COROA">👑 + Coroa / Wianek</button>
        <button class="btn-preset-add" data-qa-part="FAIXA">🎗️ + Faixa / Fitas</button>
      ` : `
        <button class="btn-preset-add" data-qa-part="COLETE">🦺 + Colete</button>
        <button class="btn-preset-add" data-qa-part="CAMISA">👔 + Camisa</button>
        <button class="btn-preset-add" data-qa-part="CALÇA">👖 + Calça</button>
        <button class="btn-preset-add" data-qa-part="SUKMANA">🧥 + Sukmana</button>
        <button class="btn-preset-add" data-qa-part="CAPOTE">🧥 + Capote</button>
        <button class="btn-preset-add" data-qa-part="BOTAS">👢 + Botas</button>
        <button class="btn-preset-add" data-qa-part="FAIXA">🎗️ + Faixa</button>
        <button class="btn-preset-add" data-qa-part="CHAPÉU">🎩 + Chapéu</button>
      `}
      <button class="btn-preset-add custom" data-qa-part="">➕ + Personalizada</button>
      ${avail.length > 0 ? `
        <select id="quickAddCmSelect" class="select-quick-common">
          <option value="">🔗 + Vincular Compartilhada (${avail.length} disp.)...</option>
          ${avail.map(cm => `<option value="${cm.id}">🔗 ${esc(cmLabel(cm))} (${cm.qty ? cm.qty + ' un' : 'disp.'})</option>`).join("")}
        </select>
      ` : ''}
    </div>
  </div>` : ''}

  <!-- TABELA DE ITENS COM FOCO EM QUANTIDADE -->
  <div class="wrap"><table><thead><tr>
    <th style="min-width:160px;">Peça</th>
    <th style="width:50px; text-align:center;">Foto</th>
    <th>Tipo / Detalhe</th>
    <th>Cor</th>
    <th style="text-align:center; min-width:110px; color:var(--pri-light);">Quantidade</th>
    <th>Observação</th>
    <th>Também Usada Em</th>
    ${isUnlocked ? `<th class="acts noprint" style="width:130px; text-align:center;">Ações</th>` : ''}
  </tr></thead><tbody>`;

  c.items.forEach((it, i) => {
    const cm = commonOf(it);
    if (cm) {
      const customTag = formatSharedTag(cm.part);
      if (isUnlocked) {
        h += `<tr data-i="${i}" class="link">
          <td class="part">
            <input data-cm-f="part" list="listPieces" value="${esc(cm.part)}" placeholder="Ex: COLETE, CAMISA">
            <div style="margin-top:3px; display:flex; align-items:center; gap:5px;">
              <span class="tag shared" data-cm="${cm.id}" title="Ver detalhes da peça compartilhada">${esc(customTag)}</span>
              <small style="font-size:10px; color:#38bdf8;">(compartilhada)</small>
            </div>
          </td>
          <td style="text-align:center">${thumb(cm.photo, `data-cmph="${cm.id}"`)}</td>
          <td><input data-cm-f="type" list="listTypes" value="${esc(cm.type)}" placeholder="Ex: BOTÃO SIMPLES"></td>
          <td><input data-cm-f="color" list="listColors" value="${esc(cm.color)}" placeholder="Ex: PRETO, AZUL"></td>
          <td style="text-align:center">
            <div class="qty-stepper">
              <button type="button" class="qty-btn" data-cm-step="-1" title="Diminuir">-</button>
              <input data-cm-f="qty" type="text" inputmode="numeric" value="${esc(cm.qty)}" placeholder="1" style="font-weight:800; color:#38bdf8; text-align:center;">
              <button type="button" class="qty-btn" data-cm-step="1" title="Aumentar">+</button>
            </div>
          </td>
          <td><textarea data-cm-f="notes" rows="1" placeholder="Observações...">${esc(cm.notes)}</textarea></td>
          <td>${sharedIn(it, c.id).map(s => `<span class="chip" data-go="${s.id}">${esc(s.name)}</span>`).join("")}</td>
          <td class="acts noprint">
            <button title="Subir" data-mv="-1">▲</button>
            <button title="Descer" data-mv="1">▼</button>
            <button title="Desvincular deste traje" data-del>🗑</button>
          </td>
        </tr>`;
      } else {
        h += `<tr data-i="${i}" class="link">
          <td class="part"><span class="ro"><b>${esc(cm.part)}</b><br><span class="tag shared" data-cm="${cm.id}">${esc(customTag)}</span></span></td>
          <td style="text-align:center">${thumb(cm.photo, `data-cmph="${cm.id}"`)}</td>
          <td><span class="ro">${esc(cm.type) || '-'}</span></td>
          <td><span class="ro">${esc(cm.color) || '-'}</span></td>
          <td style="text-align:center"><span class="badge-qty">${esc(cm.qty || '1')} un</span></td>
          <td><span class="ro">${esc(cm.notes) || '-'}</span></td>
          <td>${sharedIn(it, c.id).map(s => `<span class="chip" data-go="${s.id}">${esc(s.name)}</span>`).join("")}</td>
        </tr>`;
      }
    } else {
      if (isUnlocked) {
        h += `<tr data-i="${i}">
          <td class="part"><input data-f="part" list="listPieces" value="${esc(it.part)}" placeholder="Ex: COLETE, CAMISA, SUKMANA"></td>
          <td style="text-align:center">${thumb(it.photo, `data-ph="${i}"`)}</td>
          <td><input data-f="type" list="listTypes" value="${esc(it.type)}" placeholder="Ex: BOTÃO SIMPLES, BORDADA"></td>
          <td><input data-f="color" list="listColors" value="${esc(it.color)}" placeholder="Ex: PRETO, AZUL, BRANCA"></td>
          <td style="text-align:center">
            <div class="qty-stepper">
              <button type="button" class="qty-btn" data-step="-1" title="Diminuir">-</button>
              <input data-f="qty" type="text" inputmode="numeric" value="${esc(it.qty)}" placeholder="1" style="font-weight:800; color:#38bdf8; text-align:center;">
              <button type="button" class="qty-btn" data-step="1" title="Aumentar">+</button>
            </div>
          </td>
          <td><textarea data-f="notes" rows="1" placeholder="Observações...">${esc(it.notes)}</textarea></td>
          <td></td>
          <td class="acts noprint">
            <button title="Subir" data-mv="-1">▲</button>
            <button title="Descer" data-mv="1">▼</button>
            <button title="Duplicar peça" data-dup>⧉</button>
            <button title="Transformar em peça compartilhada" data-mk>🔗</button>
            <button title="Excluir peça" data-del>🗑</button>
          </td>
        </tr>`;
      } else {
        h += `<tr data-i="${i}">
          <td class="part"><span class="ro"><b>${esc(it.part)}</b></span></td>
          <td style="text-align:center">${thumb(it.photo, `data-ph="${i}"`)}</td>
          <td><span class="ro">${esc(it.type) || '-'}</span></td>
          <td><span class="ro">${esc(it.color) || '-'}</span></td>
          <td style="text-align:center"><span class="badge-qty">${esc(it.qty || '1')} un</span></td>
          <td><span class="ro">${esc(it.notes) || '-'}</span></td>
          <td></td>
        </tr>`;
      }
    }
  });

  app.innerHTML = h + `</tbody></table></div>`;
  const re = () => viewCostume(id);

  // Inserção Rápida de Peças por Preset
  app.querySelectorAll("[data-qa-part]").forEach(btn => {
    btn.onclick = () => {
      const part = btn.dataset.qaPart;
      const newItem = { id: uid(), part: part, type: "", color: "", qty: "1", notes: "", photo: "" };
      c.items.push(newItem);
      save();
      re();
      updateCounters();
      toast(`Peça "${part || 'Nova'}" adicionada!`);
      setTimeout(() => {
        const rows = app.querySelectorAll("tbody tr");
        if (rows.length) {
          const last = rows[rows.length - 1];
          const inp = last.querySelector(part ? '[data-f="type"]' : '[data-f="part"]');
          if (inp) inp.focus();
        }
      }, 60);
    };
  });

  // Botão Adicionar Peça do Topo
  const addTopBtn = document.getElementById("addCustomPieceTopBtn");
  if (addTopBtn) {
    addTopBtn.onclick = () => {
      c.items.push({ id: uid(), part: "", type: "", color: "", qty: "1", notes: "", photo: "" });
      save();
      re();
      updateCounters();
      setTimeout(() => {
        const rows = app.querySelectorAll("tbody tr");
        if (rows.length) {
          const last = rows[rows.length - 1];
          const inp = last.querySelector('[data-f="part"]');
          if (inp) inp.focus();
        }
      }, 60);
    };
  }

  // Vincular Compartilhada Rápido
  const quickCmSel = document.getElementById("quickAddCmSelect");
  if (quickCmSel) {
    quickCmSel.onchange = e => {
      if (!e.target.value) return;
      c.items.push({ id: uid(), cid: e.target.value });
      save();
      re();
      updateCounters();
      toast("Peça compartilhada vinculada ao traje ✓");
    };
  }

  // Renomear Traje (Fácil e Direto)
  const handleRenameCostume = () => {
    const newName = prompt(`Novo nome para o traje:`, c.name);
    if (!newName || !newName.trim()) return;
    c.name = fixPolishName(newName.trim());
    r.costumes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
    save();
    re();
    toast(`Traje renomeado para "${c.name}" ✓`);
  };

  const renameBtn = document.getElementById("renameCostumeBtn");
  if (renameBtn) renameBtn.onclick = handleRenameCostume;

  const btnEditTitle = document.getElementById("btnEditTitleDirect");
  if (btnEditTitle) btnEditTitle.onclick = handleRenameCostume;

  // Foto do Traje
  const covEl = document.getElementById("cover");
  if (covEl) {
    covEl.onclick = () => {
      const set = p => { c.photo = p; save(); re(); };
      c.photo ? openPhoto(c.photo, isUnlocked ? set : null, isUnlocked ? () => { if (confirm("Remover a foto do traje?")) set(""); } : null) : (isUnlocked ? pickImg(set) : null);
    };
  }

  // Excluir Traje
  const delCEl = document.getElementById("delC");
  if (delCEl) {
    delCEl.onclick = () => {
      if (confirm(`Excluir permanentemente o traje "${c.name}"?`)) {
        r.costumes = r.costumes.filter(x => x !== c);
        save();
        updateCounters();
        toast(`Traje "${c.name}" excluído.`);
        go("#/");
      }
    };
  }

  // Bindings das Linhas da Tabela
  app.querySelectorAll("tbody tr").forEach(tr => {
    const i = +tr.dataset.i, it = c.items[i];
    if (!it) return;
    const cm = commonOf(it);

    // Inputs normais
    tr.querySelectorAll("[data-f]").forEach(inp => {
      inp.oninput = () => { it[inp.dataset.f] = inp.value; save(); };
      inp.onchange = () => {
        if (inp.dataset.f === "part") inp.value = normalizePartName(inp.value, c.name);
        else if (inp.dataset.f !== "notes" && inp.dataset.f !== "qty") inp.value = inp.value.toUpperCase();
        it[inp.dataset.f] = inp.value; save();
      };
    });

    // Inputs de compartilhada editável in-place
    if (cm) {
      tr.querySelectorAll("[data-cm-f]").forEach(inp => {
        inp.oninput = () => { cm[inp.dataset.cmF] = inp.value; save(); };
        inp.onchange = () => {
          if (inp.dataset.cmF === "part") inp.value = normalizePartName(inp.value);
          else if (inp.dataset.cmF !== "notes" && inp.dataset.cmF !== "qty") inp.value = inp.value.toUpperCase();
          cm[inp.dataset.cmF] = inp.value;
          r.common.sort((a, b) => (a.part || "").localeCompare(b.part || "", "pt-BR", { sensitivity: "base" }));
          save();
          toast("Peça compartilhada atualizada em todos os trajes ✓");
        };
      });

      tr.querySelectorAll("[data-cm-step]").forEach(btn => {
        btn.onclick = () => {
          const val = parseInt(cm.qty || "0", 10) || 0;
          const step = parseInt(btn.dataset.cmStep, 10);
          const next = Math.max(0, val + step);
          cm.qty = next > 0 ? String(next) : "";
          save();
          re();
          updateCounters();
          toast("Quantidade atualizada ✓");
        };
      });
    }

    // Steppers normais (+ e -)
    tr.querySelectorAll("[data-step]").forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(it.qty || "0", 10) || 0;
        const step = parseInt(btn.dataset.step, 10);
        const next = Math.max(0, val + step);
        it.qty = next > 0 ? String(next) : "";
        save();
        re();
        updateCounters();
      };
    });

    // Foto da peça personalizada
    const ph = tr.querySelector("[data-ph]");
    if (ph) ph.onclick = () => {
      const set = p => { it.photo = p; save(); re(); };
      it.photo ? openPhoto(it.photo, isUnlocked ? set : null, isUnlocked ? () => { if (confirm("Remover foto?")) set(""); } : null) : (isUnlocked ? pickImg(set) : null);
    };

    // Foto da peça compartilhada
    const cph = tr.querySelector("[data-cmph]");
    if (cph && cm) {
      cph.onclick = () => {
        const set = p => { cm.photo = p; save(); re(); };
        cm.photo ? openPhoto(cm.photo, isUnlocked ? set : null, isUnlocked ? () => { if (confirm("Remover foto da peça compartilhada?")) set(""); } : null) : (isUnlocked ? pickImg(set) : null);
      };
    }

    // Links de navegação e compartilhadas
    tr.querySelectorAll("[data-cm]").forEach(t => t.onclick = () => go("#/compartilhadas/" + t.dataset.cm));
    tr.querySelectorAll("[data-go]").forEach(ch => ch.onclick = () => go("#/traje/" + ch.dataset.go));

    // Ações de ordenação e manipulação
    tr.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => {
      const j = i + +b.dataset.mv; if (j < 0 || j >= c.items.length) return;
      [c.items[i], c.items[j]] = [c.items[j], c.items[i]]; save(); re();
    });

    const dup = tr.querySelector("[data-dup]");
    if (dup) dup.onclick = () => { c.items.splice(i + 1, 0, { ...it, id: uid() }); save(); re(); updateCounters(); };

    const mk = tr.querySelector("[data-mk]");
    if (mk) mk.onclick = () => {
      if (!it.part) return alert("Preencha o nome da peça primeiro.");
      const cmObj = newCommon(it); c.items[i] = { id: it.id, cid: cmObj.id }; save(); chooseCostumes(cmObj, re);
    };

    const delBtn = tr.querySelector("[data-del]");
    if (delBtn) delBtn.onclick = () => {
      if (!confirm("Excluir/desvincular esta peça deste traje?")) return;
      c.items.splice(i, 1); save(); re(); updateCounters();
    };
  });
}
