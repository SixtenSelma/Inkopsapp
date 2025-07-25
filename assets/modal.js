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

  function render() {
    // Bygg modal-innehållet
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

    // Sökresultat-lista (tom till en början)
    let resultList = "";

    // Om vi är i historik/mall/kategori-läge – visa valbara varor
    let resultSource = [];
    if (currentMode === "historik") resultSource = allaVaror;
    if (currentMode === "mallar") resultSource = mallVaror;
    if (currentMode === "kategori") resultSource = kategoriVaror;

    // Filtret om man har skrivit något
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
    // Sätt event listeners igen efter render
    setupListeners();
    if (currentMode === "manual") {
      setTimeout(() => {
        const input = m.querySelector("#addItemInput");
        if (input) {
          input.focus();
          input.select();
        }
      }, 0);
    }
  }

  function setupListeners() {
    // Inputfältet för manuell inmatning
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

    // Checkboxes i listan
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

    // Ta bort från preview-listan
    const dels = m.querySelectorAll(".btn-remove-batch-item");
    dels.forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-idx");
        batchItems.splice(idx, 1);
        rerenderAndFocusInput();
      };
    });

    // Klar-knapp
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
  // Sätt fokus direkt när modalen visas
  setTimeout(() => {
    const input = m.querySelector("#addItemInput");
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);

  window.scrollModalToTop && window.scrollModalToTop();
};
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
