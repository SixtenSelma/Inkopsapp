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

// NY: Batch add med stöd för historik/mallar/kategori och rätt autofokus på iOS
window.showAddItemsDialog = function ({
  kategori = null,
  allaVaror = [],
  mallVaror = [],
  kategoriVaror = [],
  onDone
}) {
  const m = document.createElement("div");
  m.className = "modal";

  let currentMode = "manual"; // "manual" | "historik" | "mallar" | "kategori"
  let batchItems = [];
  let searchText = "";

  function render() {
    let infoText = kategori
      ? `Lägg till varor i kategori <b>${kategori}</b>`
      : `Lägg till varor`;
    let previewHTML = batchItems.length
      ? `<ul class="preview-list">${batchItems
          .map((item, i) => `<li>
            ${item} <button class="btn-remove-batch-item" data-idx="${i}" title="Ta bort">🗑</button>
          </li>`)
          .join("")}</ul>`
      : "";

    let resultList = "";
    let resultSource = [];
    if (currentMode === "historik") resultSource = allaVaror;
    if (currentMode === "mallar") resultSource = mallVaror;
    if (currentMode === "kategori") resultSource = kategoriVaror;
    if (searchText && resultSource.length) {
      resultSource = resultSource.filter((n) =>
        n.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (["historik", "mallar", "kategori"].includes(currentMode)) {
      resultList = `
        <div class="additem-search-results">
          ${resultSource.length
            ? resultSource
                .map(
                  (name, idx) => `
                  <div class="search-item-row">
                    <input type="checkbox" id="additem_chk${idx}" data-name="${name.replace(
                    /"/g,
                    "&quot;"
                  )}" ${batchItems.includes(name) ? "checked" : ""}>
                    <label for="additem_chk${idx}">${name}</label>
                  </div>
                `
                )
                .join("")
            : `<div class="empty-list-text">Inga matchande varor</div>`}
        </div>
      `;
    }

    m.innerHTML = `
      <div class="modal-content additem-modal">
        <h2>${infoText}</h2>
        <input id="addItemInput" placeholder="Skriv en vara och tryck Enter…" autocomplete="off" value="">
        <div class="additem-button-row">
          <button class="additem-mode-btn" id="additem-historik-btn" type="button">${
            kategori ? "Välj från denna kategori" : "Välj från historik"
          }</button>
          <button class="additem-mode-btn" id="additem-mallar-btn" type="button">Välj från mallar</button>
        </div>
        ${resultList}
        ${previewHTML}
        <div class="modal-actions" style="margin-top:14px;">
          <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
          <button id="confirmAddItemsBtn" ${batchItems.length ? "" : "disabled"}>Klar</button>
        </div>
      </div>
    `;
  }

  function rerenderAndFocusInput() {
    render();
    setupListeners();
    const input = m.querySelector("#addItemInput");
    // Bara ge focus om vi är i manuellt läge!
    if (input && currentMode === "manual") {
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        window.scrollModalToTop && window.scrollModalToTop();
      }, 100);
    }
  }

  function setupListeners() {
    const input = m.querySelector("#addItemInput");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
          const name = input.value.trim();
          if (
            name &&
            !batchItems.some(
              (existing) =>
                existing.trim().toLowerCase() === name.trim().toLowerCase()
            )
          ) {
            batchItems.push(name.trim());
            input.value = "";
            rerenderAndFocusInput();
          }
          e.preventDefault();
        }
      });
      input.addEventListener("input", (e) => {
        searchText = input.value;
        if (["historik", "mallar", "kategori"].includes(currentMode)) {
          rerenderAndFocusInput();
        }
      });
    }

    const historikBtn = m.querySelector("#additem-historik-btn");
    if (historikBtn) {
      historikBtn.onclick = () => {
        currentMode = kategori ? "kategori" : "historik";
        searchText = "";
        rerenderAndFocusInput();
      };
    }
    const mallarBtn = m.querySelector("#additem-mallar-btn");
    if (mallarBtn) {
      mallarBtn.onclick = () => {
        currentMode = "mallar";
        searchText = "";
        rerenderAndFocusInput();
      };
    }
    const checks = m.querySelectorAll(
      ".additem-search-results input[type=checkbox]"
    );
    checks.forEach((chk) => {
      chk.onchange = () => {
        const name = chk.getAttribute("data-name");
        if (chk.checked) {
          if (
            !batchItems.some(
              (existing) =>
                existing.trim().toLowerCase() === name.trim().toLowerCase()
            )
          ) {
            batchItems.push(name);
          }
        } else {
          batchItems = batchItems.filter(
            (existing) =>
              existing.trim().toLowerCase() !== name.trim().toLowerCase()
          );
        }
        rerenderAndFocusInput();
      };
    });

    const dels = m.querySelectorAll(".btn-remove-batch-item");
    dels.forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-idx");
        batchItems.splice(idx, 1);
        rerenderAndFocusInput();
      };
    });

    const confirmBtn = m.querySelector("#confirmAddItemsBtn");
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (onDone) onDone(batchItems);
        document.body.removeChild(m);
      };
    }
  }

  rerenderAndFocusInput();
  document.body.appendChild(m);

  window.scrollModalToTop && window.scrollModalToTop();
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
