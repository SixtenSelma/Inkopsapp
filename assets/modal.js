// modal.js – återanvändbara modaler, inkl. batch-add med historik och mallar

// Flytta modal upp om mobil och tangentbord
window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

// Byt namn-modal
window.showRenameDialog = function (title, currentName, onConfirm, suggestions = []) {
  const m = document.createElement("div");
  m.className = "modal";
  // Skapa datalist options för autocomplete om finns
  const dataListId = "itemNamesListModal";
  let dataListHTML = "";
  if (suggestions.length) {
    dataListHTML = `<datalist id="${dataListId}">${suggestions
      .map((s) => `<option value="${s}">`)
      .join("")}</datalist>`;
  }
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <input id="renameInput" value="${currentName || ""}" autocomplete="off" list="${dataListId}" />
      ${dataListHTML}
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmRename()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("renameInput");
  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();
  input.select();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmRename();
  });

  window.confirmRename = () => {
    const newName = input.value.trim();
    if (newName) {
      onConfirm(newName);
      document.body.removeChild(m);
    }
  };
};

// Ny lista-modal
window.showNewListModal = function (onConfirm) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Skapa ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" autocomplete="off" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewList()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("modalNewListInput");
  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmNewList();
  });

  window.confirmNewList = () => {
    const val = input.value.trim();
    if (val) {
      if (onConfirm) onConfirm(val);
      document.body.removeChild(m);
    }
  };
};

// Batch add-modal med historik/mallar och kategori (skrollbar per kategori)
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

  function groupVarorPerKategori(varuArray) {
    // [ { name, category }, ... ]
    const map = {};
    varuArray.forEach(item => {
      const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
      if (!map[cat]) map[cat] = [];
      if (!map[cat].includes(item.name)) map[cat].push(item.name);
    });
    return map;
  }

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

    let modeSwitchRow = `
      <div class="additem-button-row">
        <button class="additem-mode-btn" id="additem-historik-btn" type="button">${kategori ? "Välj från denna kategori" : "Välj från historik"}</button>
        <button class="additem-mode-btn" id="additem-mallar-btn" type="button">Välj från mallar</button>
      </div>
    `;

    // Gruppad lista för historik/mallar/kategori
    let groupMap = {};
    if (currentMode === "historik") groupMap = groupVarorPerKategori(allaVaror);
    if (currentMode === "mallar") groupMap = groupVarorPerKategori(mallVaror);
    if (currentMode === "kategori") groupMap = groupVarorPerKategori(kategoriVaror);

    let resultList = "";
    if (["historik", "mallar", "kategori"].includes(currentMode)) {
      // Filtrera om det är något inskrivet
      let groupMapFiltered = {};
      Object.keys(groupMap).forEach(cat => {
        const names = groupMap[cat].filter(name => !searchText || name.toLowerCase().includes(searchText.toLowerCase()));
        if (names.length) groupMapFiltered[cat] = names;
      });
      let cats = Object.keys(groupMapFiltered);
      if (cats.length) {
        resultList = `<div class="additem-search-results-scroll">` +
          cats.map(cat =>
            `<div class="additem-category-group">
              <div class="additem-category-title">${cat}</div>
              <ul class="additem-itemlist">
                ${groupMapFiltered[cat].map(name => `
                  <li>
                    <button class="additem-add-btn" data-name="${name.replace(/"/g, "&quot;")}" title="Lägg till">+</button>
                    <span>${name}</span>
                  </li>
                `).join("")}
              </ul>
            </div>`
          ).join("") +
          `</div>`;
      } else {
        resultList = `<div class="empty-list-text">Inga matchande varor</div>`;
      }
    }

    m.innerHTML = `
      <div class="modal-content additem-modal">
        <h2>${infoText}</h2>
        <input id="addItemInput" placeholder="Skriv en vara och tryck Enter…" autocomplete="off" value="">
        ${modeSwitchRow}
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
    if (input && currentMode === "manual") input.focus();
  }

  function setupListeners() {
    // Manuell input
    const input = m.querySelector("#addItemInput");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
          const name = input.value.trim();
          if (!batchItems.some(existing => existing.trim().toLowerCase() === name.trim().toLowerCase())) {
            batchItems.push(name.trim());
            input.value = "";
            rerenderAndFocusInput();
          }
          e.preventDefault();
        }
      });
      input.addEventListener("input", (e) => {
        searchText = input.value;
        if (["historik", "mallar", "kategori"].includes(currentMode)) rerenderAndFocusInput();
      });
    }

    // Byt till historik/kategori
    const historikBtn = m.querySelector("#additem-historik-btn");
    if (historikBtn) {
      historikBtn.onclick = () => {
        currentMode = kategori ? "kategori" : "historik";
        searchText = "";
        rerenderAndFocusInput();
      };
    }

    // Byt till mallar
    const mallarBtn = m.querySelector("#additem-mallar-btn");
    if (mallarBtn) {
      mallarBtn.onclick = () => {
        currentMode = "mallar";
        searchText = "";
        rerenderAndFocusInput();
      };
    }

    // Lägg till-knappar (+) i listan
    const plusBtns = m.querySelectorAll(".additem-add-btn");
    plusBtns.forEach(btn => {
      btn.onclick = () => {
        const name = btn.getAttribute("data-name");
        if (!batchItems.includes(name)) {
          batchItems.push(name);
          rerenderAndFocusInput();
        }
      };
    });

    // Ta bort från preview
    const dels = m.querySelectorAll(".btn-remove-batch-item");
    dels.forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-idx");
        batchItems.splice(idx, 1);
        rerenderAndFocusInput();
      };
    });

    // Klar
    const confirmBtn = m.querySelector("#confirmAddItemsBtn");
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (onDone) onDone(batchItems);
        document.body.removeChild(m);
      };
    }
  }

  render();
  document.body.appendChild(m);
  setupListeners();
  window.scrollModalToTop && window.scrollModalToTop();
};

// Info/modal för kategori (popup, återanvändbar)
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
  select.focus();
  window.scrollModalToTop && window.scrollModalToTop();
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
