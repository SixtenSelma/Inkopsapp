// modal.js – återanvändbara modaler med mobilfokus och batch add

// Flytta modal upp om mobil och tangentbord
window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

window.showListSettingsDialog = function(title, currentName, currentHideCats, onConfirm, suggestions = []) {
  delete window.confirmListSettings;
  const m = document.createElement('div');
  m.className = 'modal';
  // Autocomplete‐datalist
  const dataListId = 'modalListSettingsData';
  let dl = '';
  if (suggestions.length) {
    dl = `<datalist id="${dataListId}">${suggestions
      .map(s => `<option value="${s}">`).join('')}</datalist>`;
  }
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <input id="modalListName" value="${currentName||''}" list="${dataListId}" autocomplete="off" />
      ${dl}
      <label style="display:flex;align-items:center;margin-top:12px;">
        <input type="checkbox" id="modalHideCats" ${currentHideCats?'checked':''}/>
        <span style="margin-left:8px;">Dölj kategorier i detaljvy</span>
      </label>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmListSettings()">OK</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  const inp = m.querySelector('#modalListName');
  setTimeout(() => { inp.focus(); inp.select(); }, 100);
  inp.addEventListener('keydown', e => e.key==='Enter' && window.confirmListSettings());

  window.confirmListSettings = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    const hideCats = m.querySelector('#modalHideCats').checked;
    onConfirm(name, hideCats);
    document.body.removeChild(m);
    delete window.confirmListSettings;
  };
};


/**
 * Visar dialog för att lägga till varor, med stöd för manuellt, historik, mallar eller kategori‑läge.
 *
 * @param {Object} options
 * @param {string|null} options.kategori – Namnet på aktuell kategori (om anyCategory = true)
 * @param {string[]} options.allaVaror – Lista på alla varor för historikläge
 * @param {string[]} options.mallVaror – Lista på mall‑varor
 * @param {string[]} options.kategoriVaror – Lista på varor i aktuell kategori
 * @param {function(string[])} options.onDone – Callback med den slutliga arrayen av valda varor
 * @param {boolean} [options.onlyCategory=false] – Om true: börja alltid i kategori‑läge
 */
window.showAddItemsDialog = function({
  kategori = null,
  allaVaror = [],
  mallVaror = [],
  kategoriVaror = [],
  onDone,
  onlyCategory = false
}) {
  const m = document.createElement("div");
  m.className = "modal";

  // Vilka lägen finns: manual, historik, mallar, kategori
  let currentMode = onlyCategory && kategori ? "kategori" : "manual";
  let batchItems   = [];
  let searchText   = "";

  function render() {
    // Dynamisk titel
    const titleText = currentMode === "kategori" && kategori
      ? `Lägg till varor i kategori "${kategori}"`
      : "Lägg till varor";

    // Preview‐lista (chips)
    const previewHTML = batchItems.length
      ? `<ul class="preview-list">${batchItems.map((item,i) =>
           `<li>${item}<button class="btn-remove-batch-item" data-idx="${i}" title="Ta bort">×</button></li>`
         ).join("")}</ul>`
      : "";

    // Välj källa för autocomplete
    let source = [];
    if (currentMode === "historik") source = allaVaror;
    if (currentMode === "mallar")    source = mallVaror;
    if (currentMode === "kategori")  source = kategoriVaror;
    // Filtrera om söktext
    if (searchText && source.length) {
      source = source.filter(n => n.toLowerCase().includes(searchText.toLowerCase()));
    }

    const resultList = (["historik","mallar","kategori"].includes(currentMode))
      ? `<div class="additem-search-results">
           ${source.length
             ? source.map((name,idx) => `
                 <div class="search-item-row">
                   <input type="checkbox" id="chk${idx}" data-name="${name}" ${batchItems.includes(name)?"checked":""}/>
                   <label for="chk${idx}">${name}</label>
                 </div>`).join("")
             : `<div class="empty-list-text">Inga matchande varor</div>`
           }
         </div>`
      : "";

    m.innerHTML = `
      <div class="modal-content additem-modal">
        <h2>${titleText}</h2>
        <input id="addItemInput" placeholder="Skriv en vara och tryck Enter…" autocomplete="off" value="${searchText}"/>
        <div class="additem-button-row">
          <button type="button" id="btnManual" class="additem-mode-btn">Manuellt</button>
          <button type="button" id="btnHistory" class="additem-mode-btn">Historik</button>
          <button type="button" id="btnTemplates" class="additem-mode-btn">Mallar</button>
          ${kategori ? `<button type="button" id="btnCategory" class="additem-mode-btn">Kategori</button>` : ""}
        </div>
        ${resultList}
        ${previewHTML}
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="btnCancel">Avbryt</button>
          <button type="button" id="btnConfirm" ${batchItems.length?"":"disabled"}>Klar</button>
        </div>
      </div>
    `;

    setupListeners();
  }

  function setupListeners() {
    // Input
    const input = m.querySelector("#addItemInput");
    input.focus();
    input.oninput = () => {
      searchText = input.value;
      if (currentMode !== "manual") render();
    };
    input.onkeydown = e => {
      if (e.key === "Enter" && input.value.trim()) {
        const val = input.value.trim();
        if (!batchItems.includes(val)) batchItems.push(val);
        input.value = "";
        render();
      }
    };

    // Mode‑knappar
    m.querySelector("#btnManual").onclick  = () => { currentMode = "manual"; render(); };
    m.querySelector("#btnHistory").onclick = () => { currentMode = "historik"; render(); };
    m.querySelector("#btnTemplates").onclick = () => { currentMode = "mallar"; render(); };
    if (kategori) {
      m.querySelector("#btnCategory").onclick = () => { currentMode = "kategori"; render(); };
    }

    // Resultat‑checkboxar
    m.querySelectorAll(".additem-search-results input[type=checkbox]").forEach(chk => {
      chk.onchange = () => {
        const name = chk.dataset.name;
        if (chk.checked) {
          if (!batchItems.includes(name)) batchItems.push(name);
        } else {
          batchItems = batchItems.filter(x => x !== name);
        }
        render();
      };
    });

    // Ta bort chip
    m.querySelectorAll(".btn-remove-batch-item").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        batchItems.splice(idx,1);
        render();
      };
    });

    // Avbryt
    m.querySelector("#btnCancel").onclick = () => m.remove();

    // Klar
    m.querySelector("#btnConfirm").onclick = () => {
      onDone(batchItems);
      m.remove();
    };
  }

  document.body.appendChild(m);
  render();
};


// Info/modal för kategori (exempel)
window.showCategoryPicker = function (name, onSave) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Kategori för "${name}"</h2>
      <select id="categorySelectPopup" style="width:100%;margin-top:14px;font-size:1.1rem;padding:10px;border-radius:8px;border:2px solid #2863c7;">
        <option value="">Välj kategori…</option>
        ${standardKategorier
          .map((cat) => `<option value="${cat}">${cat}</option>`)
          .join("")}
      </select>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="pickCategoryOK()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const select = document.getElementById("categorySelectPopup");
  setTimeout(() => {
    select.focus();
    window.scrollModalToTop && window.scrollModalToTop();
  }, 100);
  window.pickCategoryOK = () => {
    const value = select.value;
    if (!value) {
      select.style.border = "2px solid red";
      select.focus();
      return;
    }
    onSave(value);
    document.body.removeChild(m);
  };
};
