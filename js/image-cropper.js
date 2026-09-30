/* ===== WISŁA - PROCESSAMENTO, CORTE E SELEÇÃO DE FOTOS ===== */

function exportCanvasOptimized(cv) {
  try {
    const webp = cv.toDataURL("image/webp", 0.78);
    if (webp && webp.startsWith("data:image/webp")) return webp;
  } catch (e) {}
  return cv.toDataURL("image/jpeg", 0.78);
}

function readImg(file, max = 600) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(im.width * k);
        cv.height = Math.round(im.height * k);
        const g = cv.getContext("2d");
        g.fillStyle = "#0b101c";
        g.fillRect(0, 0, cv.width, cv.height);
        g.filter = "brightness(1.05) contrast(1.08)";
        g.drawImage(im, 0, 0, cv.width, cv.height);
        res(exportCanvasOptimized(cv));
      };
      im.onerror = () => rej(new Error("Formato não suportado"));
      im.src = fr.result;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* Redimensionador e Ajuste de Imagens antes de Aplicar */
function openImageResizer(source, defaultName, callback) {
  const modal = document.getElementById("imgCropModal");
  const canvas = document.getElementById("cropCanvas");
  const dimInfo = document.getElementById("cropDimInfo");
  const sizeInfo = document.getElementById("cropSizeInfo");
  const selMaxSize = document.getElementById("cropMaxSize");
  const selAspect = document.getElementById("cropAspect");
  const zoomInp = document.getElementById("cropZoom");
  const zoomVal = document.getElementById("cropZoomVal");
  const btnRotL = document.getElementById("cropRotL");
  const btnRotR = document.getElementById("cropRotR");
  const btnReset = document.getElementById("cropResetBtn");
  const btnApply = document.getElementById("cropApplyBtn");
  const btnCancel = document.getElementById("cropCancelBtn");
  const btnCancelX = document.getElementById("cropCancelXBtn");

  let rotation = 0;
  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let initialPinchDist = 0;
  let initialZoom = 1.0;

  const im = new Image();
  im.onload = () => {
    // Reset state on modal open
    zoomInp.value = "1";
    zoomVal.textContent = "1.0x";
    rotation = 0;
    zoom = 1.0;
    panX = 0;
    panY = 0;
    selAspect.value = "free";
    selMaxSize.value = "600";

    const redraw = () => {
      const maxSize = parseInt(selMaxSize.value, 10) || 600;
      const aspect = selAspect.value || "free";
      const rot = ((rotation % 360) + 360) % 360;
      const isSwapped = rot === 90 || rot === 270;
      
      const naturalW = isSwapped ? im.height : im.width;
      const naturalH = isSwapped ? im.width : im.height;

      let targetW, targetH;
      if (aspect === "1:1") {
        targetW = maxSize;
        targetH = maxSize;
      } else if (aspect === "3:4") {
        targetW = Math.round(maxSize * 0.75);
        targetH = maxSize;
      } else if (aspect === "4:3") {
        targetW = maxSize;
        targetH = Math.round(maxSize * 0.75);
      } else {
        // Free / Original
        const scale = Math.min(1, maxSize / Math.max(naturalW, naturalH));
        targetW = Math.max(40, Math.round(naturalW * scale));
        targetH = Math.max(40, Math.round(naturalH * scale));
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const g = canvas.getContext("2d");
      g.clearRect(0, 0, targetW, targetH);
      g.fillStyle = "#0b101c";
      g.fillRect(0, 0, targetW, targetH);

      g.save();
      // Enquadramento e Deslocamento Livre (Pan/Drag)
      g.translate(targetW / 2 + panX, targetH / 2 + panY);
      g.rotate((rot * Math.PI) / 180);
      g.scale(zoom, zoom);

      let drawW, drawH;
      if (aspect === "free") {
        drawW = isSwapped ? targetH : targetW;
        drawH = isSwapped ? targetW : targetH;
      } else {
        const rImg = im.width / im.height;
        const rBox = isSwapped ? targetH / targetW : targetW / targetH;
        if (rImg > rBox) {
          drawH = isSwapped ? targetW : targetH;
          drawW = drawH * rImg;
        } else {
          drawW = isSwapped ? targetH : targetW;
          drawH = drawW / rImg;
        }
      }

      g.filter = "brightness(1.02) contrast(1.05)";
      g.drawImage(im, -drawW / 2, -drawH / 2, drawW, drawH);
      g.restore();

      if (dimInfo) dimInfo.textContent = `${targetW} × ${targetH} px`;
      try {
        const estData = exportCanvasOptimized(canvas);
        const kb = Math.round((estData.length * 0.75) / 1024);
        if (sizeInfo) sizeInfo.textContent = `~${kb} KB (Otimizado)`;
      } catch (e) {}
    };

    // Eventos de Mouse para Arrastar (Pan/Drag)
    canvas.onmousedown = (e) => {
      isDragging = true;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / (rect.width || 1);
      const dx = (e.clientX - lastClientX) * scale;
      const dy = (e.clientY - lastClientY) * scale;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      panX += dx;
      panY += dy;
      redraw();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = "grab";
      }
    };

    window.removeEventListener("mousemove", window._cropMouseMove);
    window.removeEventListener("mouseup", window._cropMouseUp);
    window._cropMouseMove = onMouseMove;
    window._cropMouseUp = onMouseUp;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Zoom com Scroll do Mouse
    canvas.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      zoom = Math.max(0.5, Math.min(3.5, zoom + delta));
      zoomInp.value = zoom.toFixed(2);
      zoomVal.textContent = zoom.toFixed(2) + "x";
      redraw();
    };

    // Eventos de Touch para Celular (Arrastar e Pinch Zoom)
    canvas.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastClientX = e.touches[0].clientX;
        lastClientY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialZoom = zoom;
      }
    };

    canvas.ontouchmove = (e) => {
      if (e.cancelable) e.preventDefault();
      if (isDragging && e.touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / (rect.width || 1);
        const dx = (e.touches[0].clientX - lastClientX) * scale;
        const dy = (e.touches[0].clientY - lastClientY) * scale;
        lastClientX = e.touches[0].clientX;
        lastClientY = e.touches[0].clientY;
        panX += dx;
        panY += dy;
        redraw();
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / initialPinchDist;
        zoom = Math.max(0.5, Math.min(3.5, initialZoom * factor));
        zoomInp.value = zoom.toFixed(2);
        zoomVal.textContent = zoom.toFixed(2) + "x";
        redraw();
      }
    };

    canvas.ontouchend = () => {
      isDragging = false;
      initialPinchDist = 0;
    };

    selMaxSize.onchange = redraw;
    selAspect.onchange = () => {
      panX = 0;
      panY = 0;
      redraw();
    };
    zoomInp.oninput = () => {
      zoom = parseFloat(zoomInp.value) || 1.0;
      zoomVal.textContent = zoom.toFixed(2) + "x";
      redraw();
    };
    btnRotL.onclick = () => { rotation = (rotation - 90 + 360) % 360; redraw(); };
    btnRotR.onclick = () => { rotation = (rotation + 90) % 360; redraw(); };
    btnReset.onclick = () => {
      rotation = 0;
      zoom = 1.0;
      panX = 0;
      panY = 0;
      zoomInp.value = "1";
      zoomVal.textContent = "1.0x";
      selAspect.value = "free";
      selMaxSize.value = "600";
      redraw();
    };

    const close = () => {
      modal.classList.remove("active");
      window.removeEventListener("mousemove", window._cropMouseMove);
      window.removeEventListener("mouseup", window._cropMouseUp);
    };
    btnCancel.onclick = close;
    btnCancelX.onclick = close;

    btnApply.onclick = () => {
      try {
        const finalImg = exportCanvasOptimized(canvas);
        close();
        callback(finalImg);
      } catch (e) {
        alert("Erro ao processar imagem final.");
      }
    };

    redraw();
    modal.classList.add("active");
  };

  im.onerror = () => alert("Formato de imagem não suportado.");

  if (typeof source === "string") {
    im.src = source;
  } else if (source instanceof Blob || source instanceof File) {
    const fr = new FileReader();
    fr.onload = () => { im.src = fr.result; };
    fr.readAsDataURL(source);
  }
}

/* Modal Lightbox de Foto Expandida */
function openPhoto(src, onChange, onDelete) {
  const lb = document.getElementById("lb");
  document.getElementById("lbimg").src = src;
  lb.classList.add("active");
  const isAuth = isCurrentRoomUnlocked();
  document.getElementById("lbchg").style.display = (isAuth && typeof onChange === "function") ? "" : "none";
  document.getElementById("lbdel").style.display = (isAuth && typeof onDelete === "function") ? "" : "none";
  document.getElementById("lbchg").onclick = () => {
    lb.classList.remove("active");
    if (typeof onChange === "function") pickImg(onChange);
  };
  document.getElementById("lbdel").onclick = () => {
    lb.classList.remove("active");
    if (typeof onDelete === "function") onDelete();
  };
  document.getElementById("lbclose").onclick = () => lb.classList.remove("active");
}
document.getElementById("lb").onclick = e => { if (e.target.id === "lb") e.currentTarget.classList.remove("active"); };

/* Modal Seletor de Fotos do Acervo */
window.pickImg = function(cb) {
  const B = bank(), box = document.getElementById("bkBox");

  const renderPickerCards = (filter = "") => {
    const q = norm(filter);
    const filtered = B.filter(b => !q || norm(b.name || "").includes(q));
    
    if (!filtered.length) {
      return `<div style="grid-column: 1/-1; text-align: center; padding: 36px 16px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--bd);">
        <div style="font-size: 32px; margin-bottom: 8px;">📷</div>
        <p style="color: var(--text-muted); margin: 0 0 12px; font-size: 13px;">${B.length ? 'Nenhuma foto encontrada com esse nome.' : 'Nenhuma foto no Acervo ainda.'}</p>
        <button class="btn primary sm" id="pkEmptyUp">⬆ Adicionar Nova Foto ao Acervo</button>
      </div>`;
    }

    return filtered.map(b => {
      const idx = B.indexOf(b);
      return `<div class="bk-card" data-i="${idx}" style="cursor: pointer; border: 1px solid var(--bd); transition: all 0.2s;" title="Clique para selecionar esta foto">
        <div style="width:100%; aspect-ratio:1/1; background:#050811; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid var(--bd);">
          <img src="${b.img}" alt="${esc(b.name)}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
        </div>
        <div class="bd" style="padding: 8px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #fff; word-break: break-word;">${esc(b.name || 'FOTO')}</span>
          <button class="btn primary sm" style="width: 100%; margin-top: 6px; padding: 4px; font-size: 11px; pointer-events:none;">✓ Selecionar</button>
        </div>
      </div>`;
    }).join("");
  };

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--bd); padding-bottom:10px;">
      <div>
        <h3 style="margin:0; font-size:16px; display:flex; align-items:center; gap:8px;">
          <span>📷</span> <span>Acervo Central de Fotos Wisła</span>
        </h3>
        <span style="font-size:12px; color:var(--text-muted);">Selecione uma foto existente do acervo ou adicione uma nova foto.</span>
      </div>
      <button class="btn sm" id="pkX" style="border:none; box-shadow:none; font-size:16px;">✕</button>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; align-items:center;">
      <input type="search" id="pkQ" placeholder="Buscar foto no acervo por nome..." style="flex:1; min-width:200px; padding:8px 12px; background:#0d1322; border:1px solid var(--bd); border-radius:8px; color:#fff; font-size:13px;">
      <button class="btn primary" id="pkUp" style="white-space:nowrap;">⬆ Nova Foto do Dispositivo</button>
    </div>

    <div style="overflow-y:auto; max-height:56vh; padding:2px;">
      <div class="bk-grid" id="pkGrid">
        ${renderPickerCards()}
      </div>
    </div>
  `;

  document.getElementById("bkDlg").classList.add("active");
  const close = () => document.getElementById("bkDlg").classList.remove("active");
  document.getElementById("pkX").onclick = close;

  const bindCardClicks = () => {
    box.querySelectorAll(".bk-card").forEach(el => {
      el.onclick = () => {
        const item = B[+el.dataset.i];
        if (!item || !item.img) return;
        close();
        cb(item.img);
        toast(`Foto "${item.name || 'Acervo'}" aplicada com sucesso!`);
      };
    });
    const emptyUp = document.getElementById("pkEmptyUp");
    if (emptyUp) emptyUp.onclick = () => document.getElementById("pkUp").click();
  };

  bindCardClicks();

  document.getElementById("pkQ").oninput = e => {
    document.getElementById("pkGrid").innerHTML = renderPickerCards(e.target.value);
    bindCardClicks();
  };

  document.getElementById("pkUp").onclick = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.onchange = () => {
      if (!i.files[0]) return;
      const file = i.files[0];
      openImageResizer(file, file.name, (finalImg) => {
        const defaultName = file.name.replace(/\.[^.]+$/, "").toUpperCase();
        const photoName = prompt("Nome desta foto para o Acervo:", defaultName) || defaultName;
        const newPhotoObj = {
          id: uid(),
          name: photoName.toUpperCase().trim(),
          img: finalImg,
          date: new Date().toISOString().slice(0, 10)
        };
        bank().push(newPhotoObj);
        save();
        updateCounters();
        close();
        cb(finalImg);
        toast(`Foto "${newPhotoObj.name}" salva no Acervo e aplicada!`);
      });
    };
    i.click();
  };
};
document.getElementById("bkDlg").onclick = e => { if (e.target.id === "bkDlg") document.getElementById("bkDlg").classList.remove("active"); };
