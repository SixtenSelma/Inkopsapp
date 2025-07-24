// modal.js – återanvändbara modaler med bättre mobilhantering

// Flytta modal upp om mobil och tangentbord
window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

// Byt namn-modal (oförändrad)
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

// Ny lista-modal (oförändrad)
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

// === NY: "Lägg till varor" med manuell + sök från listor/mallar ===
//  params: { onDone(array), kategori (eller null), allaVaror[], mallVaror[], kategoriVaror[] }
window.showAddItemsDialog = function ({
  onDone,
  kategori = null,
  allaVaror = [],
  mallVaror = [],
  kategoriVaror = [],
}) {
  const m = document.createElement("div");
  m.className = "modal";
  let added = [];
  let currentList = kategoriVaror.length ? kategoriVaror : allaVaror;

  function updatePreview() {
    const ul = m.querySelector("#multiadd-preview");
    ul.innerHTML = added.map(name => `<li>${name}</li>`).join("");
  }

  function addItem(val) {
    const name = val.trim();
    if (name && !added.includes(name)) {
      added.push(name);
      updatePreview();
    }
  }

  // Sök-knappens popup
  window.openVaruvalDialog = function(list, label) {
    const mm = document.createElement("div");
    mm.className = "modal";
    mm.innerHTML = `
      <div class="modal-content" style="max-width:340px;">
        <h2>${label}</h2>
        <input id="varuval-search" placeholder="Sök…" autocomplete="off" style="width:100%;margin-bottom:7px;">
        <div id="varuval-list" style="max-height:220px;overflow:auto;border-radius:7px;border:1px solid #eee;padding:7px;background:#fafbfc;">
          ${list.length
            ? list.map((v, idx) =>
                `<label style="display:flex;align-items:center;padding:2px 0;cursor:pointer;">
                  <input type="checkbox" data-index="${idx}" style="margin-right:7px;">
                  ${v}
                </label>`
              ).join("")
            : '<div style="color:#aaa;font-style:italic;">Inga varor</div>'}
        </div>
        <div class="modal-actions">
          <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
          <button onclick="confirmVaruval()">Lägg till valda</button>
        </div>
      </div>
    `;
    document.body.appendChild(mm);

    // Sökfilter i popup
    const search = mm.querySelector("#varuval-search");
    const listDiv = mm.querySelector("#varuval-list");
    search.addEventListener("input", function() {
      const q = search.value.trim().toLowerCase();
      [...listDiv.children].forEach(label => {
        if (!label.textContent.toLowerCase().includes(q)) {
          label.style.display = "none";
        } else {
          label.style.display = "";
        }
      });
    });

    // Bekräfta valda
    window.confirmVaruval = function() {
      const checkboxes = mm.querySelectorAll("input[type=checkbox]");
      checkboxes.forEach(box => {
        if (box.checked) {
          const name = list[box.getAttribute("data-index")];
          addItem(name);
        }
      });
      document.body.removeChild(mm);
    };
  };

  // Skapa modalinnehåll
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till varor${kategori ? ` i kategori<br><span style="font-size:1.1em;color:#555;font-weight:400;">${kategori}</span>` : ""}</h2>
      <div style="display:flex;align-items:center;gap:8px;">
        <input id="multiadd-input" placeholder="Skriv vara och tryck Enter…" autocomplete="off" style="flex:1;">
        <button id="search-alla" title="Sök från alla listor" style="font-size:1.25em;line-height:1;background:none;border:none;cursor:pointer;" tabindex="-1">🔍</button>
        <button id="search-mall" title="Sök från mallar" style="font-size:1.25em;line-height:1;background:none;border:none;cursor:pointer;" tabindex="-1">📋</button>
      </div>
      <ul id="multiadd-preview" class="preview-list" style="margin-bottom:10px;"></ul>
      <div class="modal-actions" style="margin-top:7px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button id="multiadd-done">Klar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  // Fokusera input
  const input = m.querySelector("#multiadd-input");
  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();

  // Enter = lägg till i preview
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      addItem(input.value);
      input.value = "";
    }
  });

  // Sökknappar
  m.querySelector("#search-alla").onclick = function() {
    window.openVaruvalDialog(
      kategoriVaror.length ? kategoriVaror : allaVaror,
      kategori ? "Välj varor i denna kategori" : "Välj varor från alla listor"
    );
  };
  m.querySelector("#search-mall").onclick = function() {
    window.openVaruvalDialog(
      mallVaror,
      "Välj varor från mallar"
    );
  };

  // Avsluta (lägg till alla markerade)
  m.querySelector("#multiadd-done").onclick = function() {
    if (input.value.trim()) addItem(input.value);
    if (onDone) onDone(added);
    document.body.removeChild(m);
  };
};

// --- Behåller befintliga modaler nedan (t ex kategori-modal) ---

// Info/modal för kategori (oförändrad)
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
