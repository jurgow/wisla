/* ===== WISŁA - VIEW: PEÇAS, DANÇARINOS & PEÇAS COMPARTILHADAS ===== */

/* 1. Tela Todas as Peças com Submenus e Filtros */
function viewPieces() {
  const r = getActiveRoom();
  const stats = getRoomInventoryStats(r);
  const isUnlocked = isCurrentRoomUnlocked();
  const isBoots = isBootRoom(r);
  const isAder = isAccessoryRoom(r);
  const isCostume = isCostumeRoom(r);
  
  const allRows = [];
  (r.costumes || []).forEach(c => (c.items || []).forEach(raw => {
    const it = eff(raw); if (!it) return;
    const cat = classifyPiece(it.part);
    const q = parseQty(it.qty);
    const rep = parseInt(it.repair || 0, 10) || 0;
    allRows.push({ costume: c, raw, it, cat, q, rep, txt: norm([c.name, it.part, it.type, it.color, it.qty, it.notes].join(" ")) });
  }));

  // Adiciona peças compartilhadas que ainda não foram vinculadas a nenhum traje
  (r.common || []).forEach(cm => {
    const linked = (r.costumes || []).some(c => (c.items || []).some(i => i.cid === cm.id));
    if (!linked) {
      const cat = classifyPiece(cm.part);
      const q = parseQty(cm.qty);
      const rep = parseInt(cm.repair || 0, 10) || 0;
      allRows.push({
        costume: { id: "", name: "(Sem Traje Vinculado)" },
        raw: { cid: cm.id },
        it: cm,
        cat,
        q,
        rep,
        txt: norm(["Compartilhada", cm.part, cm.type, cm.color, cm.qty, cm.notes].join(" "))
      });
    }
  });

  allRows.sort((a, b) => {
    const cDiff = (a.costume.name || "").localeCompare(b.costume.name || "", "pt-BR", { sensitivity: "base" });
    if (cDiff !== 0) return cDiff;
    return (a.it.part || "").localeCompare(b.it.part || "", "pt-BR", { sensitivity: "base" });
  });

  const submenus = [
    { key: "all", label: isBoots ? "Todos os Calçados" : isAder ? "Todos os Itens" : "Todas as Peças", icon: isBoots ? "👢" : isAder ? "🎗️" : "📦", count: stats.totalUnits },
    ...(stats.totalRepair > 0 ? [{ key: "repair", label: "Em Conserto", icon: "🔧", count: stats.totalRepair }] : []),
    ...(stats.calcas > 0 || r.id === 'masculino' ? [{ key: "calcas", label: "Calças", icon: "👖", count: stats.calcas }] : []),
    { key: "camisas", label: r.id === 'feminino' ? "Blusas & Camisas" : "Camisas & Blusas", icon: "👔", count: stats.camisas },
    { key: "coletes", label: r.id === 'feminino' ? "Corpetes & Coletes" : "Coletes & Corpetes", icon: "🦺", count: stats.coletes },
    { key: "capotes", label: r.id === 'feminino' ? "Saias, Capotes & Aventais" : "Capotes, Sukmanas & Saias", icon: r.id === 'feminino' ? "👗" : "🧥", count: stats.capotes },
    { key: "calcados", label: "Botas & Calçados", icon: r.id === 'botas_fem' ? "👠" : "👢", count: stats.calcados },
    { key: "aderecos", label: "Adereços & Faixas", icon: "🎗️", count: stats.aderecos },
    ...(isCostume ? [{ key: "compartilhadas", label: "Compartilhadas", icon: "🔗", count: (r.common || []).length }] : [])
  ];

  let h = `
  ${renderModeBanner(r)}

  <div class="category-subnav noprint">
    ${submenus.map(sm => `
      <div class="cat-pill ${currentPieceCategory === sm.key ? 'active' : ''}" data-cat="${sm.key}">
        <span>${sm.icon} ${sm.label}</span>
        <span class="cat-pill-count">${sm.count} ${sm.key === 'compartilhadas' ? 'itens' : 'un'}</span>
      </div>
    `).join("")}
  </div>

  <div class="toolbar-bar noprint">
    <input type="search" id="q" placeholder="Buscar por modelo, cor, observação ou traje em ${esc(r.name)}...">
    ${isUnlocked && currentPieceCategory === 'compartilhadas' ? `<button class="btn primary" id="addPieceCmBtn">+ Nova Peça Compartilhada</button>` : ''}
    <span id="cnt" class="note" style="margin-left:auto; font-weight:700; color:#fff;"></span>
  </div>

  <div class="wrap"><table><thead><tr>
    <th>${isCostume ? 'Traje (A-Z)' : 'Modelo / Item (A-Z)'}</th>
    <th>${isBoots ? 'Item / Calçado' : isAder ? 'Item' : 'Peça'}</th>
    <th>Foto</th>
    <th>${isBoots ? 'Numeração / Tamanho' : 'Tipo / Detalhe'}</th>
    <th>Cor</th>
    <th style="text-align:center">Qtd Total</th>
    <th style="text-align:center; color:#fbbf24;">🔧 Em Conserto</th>
    <th>Observação</th>
  </tr></thead><tbody>`;

  allRows.forEach((row, rIdx) => {
    const { costume: c, raw, it, cat, txt, rep } = row;
    const isShared = !!raw.cid;
    const customTag = isShared ? formatSharedTag(it.part) : "";
    h += `<tr data-t="${esc(txt)}" data-cat="${cat.key}" data-is-repair="${rep > 0 ? 'true' : 'false'}" data-is-shared="${isShared ? 'true' : 'false'}" ${isShared ? 'class="link"' : ""}>
      <td>${c.id ? `<span class="chip" data-go="${c.id}">${esc(c.name)}</span>` : `<span style="color:var(--amber); font-size:12px;">${esc(c.name)}</span>`}</td>
      <td><b>${esc(it.part)}</b>${isShared ? ' <span class="tag shared" data-cm="' + raw.cid + '">' + esc(customTag) + '</span>' : ""}</td>
      <td>${thumb(it.photo, `data-row-ph="${rIdx}"`)}</td>
      <td>${esc(it.type)}</td>
      <td>${esc(it.color)}</td>
      <td style="text-align:center; font-weight:700;">${esc(it.qty)}</td>
      <td style="text-align:center;">${rep > 0 ? `<span class="badge-repair" style="background:rgba(245,158,11,0.2); color:#fbbf24; font-weight:700; padding:2px 6px; border-radius:4px; font-size:12px;">🔧 ${rep} un</span>` : '<span style="color:var(--text-light);">-</span>'}</td>
      <td>${esc(it.notes)}</td>
    </tr>`;
  });

  app.innerHTML = h + `</tbody></table></div>`;

  const filterRows = () => {
    const q = norm(document.getElementById("q").value);
    let n = 0;
    app.querySelectorAll("tbody tr").forEach(tr => {
      const matchCat = currentPieceCategory === "all" ? true :
                       currentPieceCategory === "repair" ? (tr.dataset.isRepair === "true") :
                       currentPieceCategory === "compartilhadas" ? (tr.dataset.isShared === "true") :
                       (tr.dataset.cat === currentPieceCategory);
      const matchTxt = !q || tr.dataset.t.includes(q);
      const ok = matchCat && matchTxt;
      tr.style.display = ok ? "" : "none";
      if (ok) n++;
    });
    document.getElementById("cnt").textContent = n + " item(ns) listado(s)";
  };

  document.getElementById("q").oninput = filterRows;
  app.querySelectorAll(".cat-pill").forEach(pill => {
    pill.onclick = () => {
      currentPieceCategory = pill.dataset.cat;
      app.querySelectorAll(".cat-pill").forEach(p => p.classList.toggle("active", p === pill));
      const addCmBtn = document.getElementById("addPieceCmBtn");
      if (currentPieceCategory === 'compartilhadas') {
        viewPieces();
      } else {
        if (addCmBtn) addCmBtn.style.display = "none";
        filterRows();
      }
    };
  });

  const addPieceCmBtn = document.getElementById("addPieceCmBtn");
  if (addPieceCmBtn) {
    addPieceCmBtn.onclick = () => {
      const cm = newCommon();
      save();
      updateCounters();
      viewCommon(cm.id);
    };
  }

  filterRows();
  app.querySelectorAll("[data-go]").forEach(ch => ch.onclick = () => go("#/traje/" + ch.dataset.go));
  app.querySelectorAll("[data-cm]").forEach(t => t.onclick = () => go("#/compartilhadas/" + t.dataset.cm));
  app.querySelectorAll("[data-row-ph]").forEach(el => {
    const rIdx = +el.dataset.rowPh;
    const row = allRows[rIdx];
    if (!row) return;
    el.onclick = () => {
      const set = p => { row.it.photo = p; save(); viewPieces(); };
      row.it.photo ? openPhoto(row.it.photo, set, () => { if (confirm("Remover a foto desta peça?")) set(""); }) : (isUnlocked ? pickImg(set) : null);
    };
  });
}

/* 2. Tela Dançarinos */
function viewDancers() {
  S.dancers = S.dancers || [];
  S.dancers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));

  let h = `<div class="toolbar-bar noprint">
    <input type="search" id="q" placeholder="Buscar dançarino em ordem alfabética...">
    <button class="btn primary" id="addD">+ Dançarino</button>
    <button class="btn" id="addDz">+ Dança</button>
    <button class="btn" onclick="window.print()">🖨 Imprimir Grade</button>
    <span class="note" style="margin-left:auto">${S.dancers.length} dançarinos · ${S.dances.length} danças</span>
  </div>
  <div class="wrap"><table class="dz"><thead><tr><th>Dançarino (A-Z)</th>`;

  S.dances.forEach((d, j) => {
    const r = getActiveRoom();
    const c = (r.costumes || []).find(x => norm(x.name) === norm(d));
    h += `<th>
      ${c ? `<a href="#/traje/${c.id}">${esc(d)}</a>` : esc(d)}
      <br>
      <span class="acts noprint">
        <button data-dl="${j}">◀</button>
        <button data-dx="${j}">✕</button>
        <button data-dr="${j}">▶</button>
      </span>
    </th>`;
  });
  h += `<th class="noprint"></th></tr></thead><tbody>`;

  S.dancers.forEach((p, i) => {
    h += `<tr data-i="${i}" data-n="${esc(norm(p.name))}">
      <td><input data-name value="${esc(p.name)}" placeholder="NOME DO DANÇARINO"></td>`;
    S.dances.forEach(d => {
      h += `<td><input data-d="${esc(d)}" value="${esc(p.nums[d] || "")}" placeholder="-"></td>`;
    });
    h += `<td class="acts noprint"><button data-del title="Excluir">🗑</button></td></tr>`;
  });

  app.innerHTML = h + `</tbody></table></div>`;

  document.getElementById("q").oninput = e => {
    const q = norm(e.target.value);
    app.querySelectorAll("tbody tr").forEach(tr => tr.style.display = tr.dataset.n.includes(q) ? "" : "none");
  };
  document.getElementById("addD").onclick = () => {
    const n = prompt("Nome do dançarino:"); if (!n) return;
    S.dancers.push({ id: uid(), name: n.toUpperCase().trim(), nums: {} });
    S.dancers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
    save(); updateCounters(); viewDancers();
  };
  document.getElementById("addDz").onclick = () => {
    const n = prompt("Nome da dança (ex: ŁOWICZ, KRAKOWIAK, SĄCZ, ŚLĄSK):"); if (!n) return;
    const d = fixPolishName(n); if (S.dances.includes(d)) return alert("Essa dança já existe.");
    S.dances.push(d); save(); viewDancers();
  };
  app.querySelectorAll("[data-dx]").forEach(b => b.onclick = () => {
    const d = S.dances[+b.dataset.dx];
    if (!confirm(`Excluir a dança "${d}"?`)) return;
    S.dances.splice(+b.dataset.dx, 1); S.dancers.forEach(p => delete p.nums[d]); save(); viewDancers();
  });
  const mv = (j, k) => { if (k < 0 || k >= S.dances.length) return; [S.dances[j], S.dances[k]] = [S.dances[k], S.dances[j]]; save(); viewDancers(); };
  app.querySelectorAll("[data-dl]").forEach(b => b.onclick = () => mv(+b.dataset.dl, +b.dataset.dl - 1));
  app.querySelectorAll("[data-dr]").forEach(b => b.onclick = () => mv(+b.dataset.dr, +b.dataset.dr + 1));
  app.querySelectorAll("tbody tr").forEach(tr => {
    const p = S.dancers[+tr.dataset.i];
    tr.querySelector("[data-name]").onchange = e => {
      p.name = e.target.value.toUpperCase().trim() || p.name;
      e.target.value = p.name;
      S.dancers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
      save();
    };
    tr.querySelectorAll("[data-d]").forEach(inp => inp.oninput = () => {
      if (inp.value.trim()) p.nums[inp.dataset.d] = inp.value.trim(); else delete p.nums[inp.dataset.d];
      save();
    });
    tr.querySelector("[data-del]").onclick = () => {
      if (!confirm(`Excluir "${p.name}"?`)) return;
      S.dancers.splice(+tr.dataset.i, 1); save(); updateCounters(); viewDancers();
    };
  });
}

/* 3. Tela Peças Compartilhadas */
function viewCommon(focusId) {
  const r = getActiveRoom();
  r.common = r.common || [];
  r.common.sort((a, b) => (a.part || "").localeCompare(b.part || "", "pt-BR", { sensitivity: "base" }));
  const isUnlocked = isCurrentRoomUnlocked();

  let h = `<h2>🔗 Peças Compartilhadas · ${esc(r.name)}</h2>
  <p class="note" style="margin-top:0">Peças reutilizadas em múltiplos trajes desta sala. A alteração de foto e detalhes aqui sincroniza em todos os trajes vinculados.</p>
  <div class="toolbar-bar noprint">
    <input type="search" id="q" placeholder="Buscar peça compartilhada em ordem alfabética...">
    <button class="btn primary" id="addCm">+ Nova Peça Compartilhada</button>
  </div>`;

  if (!r.common.length) {
    h += `<div style="padding: 40px; text-align: center; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--bd);">
      <p style="color:var(--text-muted)">Nenhuma peça compartilhada cadastrada nesta sala.<br>Clique em <b>+ Nova Peça Compartilhada</b> para criar.</p>
    </div>`;
  } else {
    h += `<div class="wrap"><table><thead><tr><th>Foto</th><th>Peça (A-Z)</th><th>Tipo / Detalhe</th><th>Cor</th><th style="text-align:center; min-width:90px;">Quant.</th><th>Observação</th><th>Trajes Vinculados</th><th class="acts noprint"></th></tr></thead><tbody>`;
    r.common.forEach((cm, i) => {
      const cs = costumesOf(cm);
      const customTag = formatSharedTag(cm.part);
      if (isUnlocked) {
        h += `<tr data-i="${i}" id="cm-${cm.id}" data-n="${esc(norm(cmLabel(cm)))}">
          <td>${thumb(cm.photo, "data-ph")}</td>
          <td class="part"><input data-f="part" list="listPieces" value="${esc(cm.part)}" placeholder="NOME DA PEÇA"><br><span class="tag shared">${esc(customTag)}</span></td>
          <td><input data-f="type" list="listTypes" value="${esc(cm.type)}" placeholder="TIPO"></td>
          <td><input data-f="color" list="listColors" value="${esc(cm.color)}" placeholder="COR"></td>
          <td style="text-align:center">
            <div class="qty-stepper">
              <button type="button" class="qty-btn" data-step="-1" title="Diminuir">-</button>
              <input data-f="qty" type="text" inputmode="numeric" value="${esc(cm.qty)}" placeholder="1">
              <button type="button" class="qty-btn" data-step="1" title="Aumentar">+</button>
            </div>
          </td>
          <td><textarea data-f="notes" rows="1" placeholder="Observações...">${esc(cm.notes)}</textarea></td>
          <td style="min-width:200px">
            ${cs.map(c => `<span class="chip" data-go="${c.id}">${esc(c.name)}</span>`).join("") || '<span style="color:var(--amber)">Nenhum traje</span>'}<br>
            <button class="btn sm noprint" data-ch style="margin-top:6px">Vincular Trajes (${cs.length})</button>
          </td>
          <td class="acts noprint"><button title="Excluir" data-del>🗑</button></td>
        </tr>`;
      } else {
        h += `<tr data-i="${i}" id="cm-${cm.id}" data-n="${esc(norm(cmLabel(cm)))}">
          <td>${thumb(cm.photo, "data-ph")}</td>
          <td class="part"><span class="ro"><b>${esc(cm.part)}</b><br><span class="tag shared">${esc(customTag)}</span></span></td>
          <td><span class="ro">${esc(cm.type)}</span></td>
          <td><span class="ro">${esc(cm.color)}</span></td>
          <td style="text-align:center"><span class="ro" style="font-weight:700;">${esc(cm.qty)}</span></td>
          <td><span class="ro">${esc(cm.notes)}</span></td>
          <td style="min-width:200px">
            ${cs.map(c => `<span class="chip" data-go="${c.id}">${esc(c.name)}</span>`).join("") || '<span style="color:var(--amber)">Nenhum traje</span>'}
          </td>
          <td class="acts noprint"></td>
        </tr>`;
      }
    });
    h += `</tbody></table></div>`;
  }

  app.innerHTML = h;
  const re = () => viewCommon();

  document.getElementById("q").oninput = e => {
    const q = norm(e.target.value);
    app.querySelectorAll("tbody tr").forEach(tr => tr.style.display = tr.dataset.n.includes(q) ? "" : "none");
  };
  const addCmBtn = document.getElementById("addCm");
  if (addCmBtn) {
    addCmBtn.onclick = () => { const cm = newCommon(); save(); updateCounters(); viewCommon(cm.id); };
  }

  app.querySelectorAll("tbody tr").forEach(tr => {
    const cm = r.common[+tr.dataset.i];
    tr.querySelectorAll("[data-f]").forEach(inp => {
      inp.oninput = () => { cm[inp.dataset.f] = inp.value; save(); };
      inp.onchange = () => {
        if (inp.dataset.f === "part") inp.value = normalizePartName(inp.value);
        else if (inp.dataset.f !== "notes" && inp.dataset.f !== "qty") inp.value = inp.value.toUpperCase();
        cm[inp.dataset.f] = inp.value;
        r.common.sort((a, b) => (a.part || "").localeCompare(b.part || "", "pt-BR", { sensitivity: "base" }));
        save();
      };
    });

    tr.querySelectorAll("[data-step]").forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(cm.qty || "0", 10) || 0;
        const step = parseInt(btn.dataset.step, 10);
        const next = Math.max(0, val + step);
        cm.qty = next > 0 ? String(next) : "";
        save();
        re();
        updateCounters();
        toast("Quantidade da peça compartilhada atualizada ✓");
      };
    });

    const phBtn = tr.querySelector("[data-ph]");
    if (phBtn) phBtn.onclick = () => {
      const set = p => { cm.photo = p; save(); re(); };
      cm.photo ? openPhoto(cm.photo, set, () => { if (confirm("Remover a foto?")) set(""); }) : pickImg(set);
    };
    const chBtn = tr.querySelector("[data-ch]");
    if (chBtn) chBtn.onclick = () => chooseCostumes(cm, re);
    tr.querySelectorAll("[data-go]").forEach(ch => ch.onclick = () => go("#/traje/" + ch.dataset.go));
    const delBtn = tr.querySelector("[data-del]");
    if (delBtn) delBtn.onclick = () => {
      if (!confirm("Excluir esta peça compartilhada?")) return;
      r.common = r.common.filter(x => x !== cm);
      r.costumes.forEach(c => { c.items = c.items.filter(i => i.cid !== cm.id); });
      save(); updateCounters(); re();
    };
  });
}
