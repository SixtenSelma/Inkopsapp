// modal.js – återanvändbara modaler med bättre mobilhantering

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

// Batch add-modal (flera varor samtidigt, manuellt)
window.showBatchAddDialog = function (listIndex, onDone) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      <input id="batchItemInput" placeholder="Skriv vara och tryck Enter…" autocomplete="off" />
      <ul id="batchPreview" class="preview-list"></ul>
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmBatchAdd()">Klar</button>
        <button id="searchAllBtn" title="Sök i alla listor" style="margin-left:auto;font-size:1.3em;">🔍</button>
        <button id="searchTemplateBtn" title="Sök i mallar" style="font-size:1.3em;">🔎</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("batchItemInput");
  const preview = document.getElementById("batchPreview");
  let added = [];

  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const name = input.value.trim();
      added.push(name);
      const li = document.createElement("li");
      li.textContent = name;
      preview.appendChild(li);
      input.value = "";
    }
  });

  window.confirmBatchAdd = () => {
    if (input && input.value.trim()) {
      added.push(input.value.trim());
    }
    if (onDone) onDone(added);
    document.body.removeChild(m);
  };

  // SÖK-knapp 1 – Sök i ALLA listor
  document.getElementById("searchAllBtn").onclick = function () {
    if (!window.lists) return;
    // Hämta alla unika varor från alla listor (ej mallar)
    const all = [];
    window.lists.forEach(list => {
      if (list.name && !list.name.startsWith("Mall:")) {
        list.items.forEach(item => {
          if (!all.find(x => x.name === item.name)) {
            all.push({ name: item.name, note: item.note || "" });
          }
        });
      }
    });
    window.showSearchListDialog("Välj från alla listor", all, (picked) => {
      picked.forEach(name => {
        if (!added.includes(name)) {
          added.push(name);
          const li = document.createElement("li");
          li.textContent = name;
          preview.appendChild(li);
        }
      });
    });
  };

  // SÖK-knapp 2 – Sök i alla MALL-listor
  document.getElementById("searchTemplateBtn").onclick = function () {
    if (!window.lists) return;
    // Hämta alla unika varor från Mall-listor
    const all = [];
    window.lists.forEach(list => {
      if (list.name && list.name.startsWith("Mall:")) {
        list.items.forEach(item => {
          if (!all.find(x => x.name === item.name)) {
            all.push({ name: item.name, note: item.note || "" });
          }
        });
      }
    });
    window.showSearchListDialog("Välj från mallar", all, (picked) => {
      picked.forEach(name => {
        if (!added.includes(name)) {
          added.push(name);
          const li = document.createElement("li");
          li.textContent = name;
          preview.appendChild(li);
        }
      });
    });
  };
};

// Sök-dialog som visar varor (med checkbox) och returnerar de som användaren markerar
window.showSearchListDialog = function (title, items, onPickMany) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <div class="batch-search-row">
        <input id="searchInput" type="search" placeholder="Sök vara…" autocomplete="off" />
      </div>
      <ul id="searchResultList" class="add-batch-search-list"></ul>
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Stäng</button>
        <button id="pickManyOK">Lägg till</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const searchInput = document.getElementById("searchInput");
  const resultList = document.getElementById("searchResultList");
  let selected = new Set();

  // Rendera listan direkt (alla varor vid öppning, oavsett sök)
  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = !query ? items : items.filter(it => it.name.toLowerCase().includes(query));
    resultList.innerHTML = filtered.map(it => `
      <li class="batch-list-row">
        <label class="batch-checkbox-label">
          <input type="checkbox" class="batch-checkbox" data-name="${it.name.replace(/"/g, '&quot;')}">
          <span class="batch-checkbox-title">${it.name}</span>
          ${it.note ? `<span class="batch-checkbox-desc">${it.note}</span>` : ""}
        </label>
      </li>
    `).join("");
    // Återställ redan valda checkboxar
    filtered.forEach(it => {
      if (selected.has(it.name)) {
        resultList.querySelector(`input[data-name="${it.name.replace(/"/g, '&quot;')}"]`).checked = true;
      }
    });
    // Eventlyssnare för checkboxes
    resultList.querySelectorAll("input.batch-checkbox").forEach(cb => {
      cb.addEventListener("change", function () {
        const name = this.getAttribute("data-name");
        if (this.checked) selected.add(name);
        else selected.delete(name);
      });
    });
  }

  searchInput.addEventListener("input", renderList);
  renderList(); // Visa direkt alla varor vid öppning

  document.getElementById("pickManyOK").onclick = () => {
    onPickMany(Array.from(selected));
    document.body.removeChild(m);
  };
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

/*
Så här använder du batch-dialogen för ny vara (exempel):
window.showBatchAddDialog(index, function(addedNames){
  // Lägg till alla "addedNames" i din lista!
});

Och så här använder du sök-dialogen:
window.showSearchListDialog("Välj från alla listor", itemsArray, function(valdaNamnArr){
  // Gör vad du vill med de valda namnen
});
*/

// --- SLUT PÅ FIL ---
