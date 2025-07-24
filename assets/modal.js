// modal.js – återanvändbara modaler med bättre mobilhantering

window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

// Byt namn-modal (oförändrad)
window.showRenameDialog = function (title, currentName, onConfirm, suggestions = []) {
  const m = document.createElement("div");
  m.className = "modal";
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

// === NY DESIGN: Lägg till varor med två stora knappar under sökfältet ===
window.showAddItemsDialog = function({ kategori = null, allaVaror = [], mallVaror = [], kategoriVaror = [], onDone }) {
  const m = document.createElement("div");
  m.className = "modal";

  let tempList = [];
  let currentSource = null; // "alla" eller "mall"
  let lastFilter = "";

  function getSourceArr() {
    if (currentSource === "mall") return mallVaror;
    if (currentSource === "alla") return kategori ? kategoriVaror : allaVaror;
    return [];
  }

  function renderOptions(q = "") {
    const arr = getSourceArr();
    let filtered = arr;
    if (q && arr.length) {
      const lower = q.toLowerCase();
      filtered = arr.filter(v => v.toLowerCase().includes(lower));
    }
    optionsDiv.innerHTML = filtered.length
      ? filtered.map(name => `
        <label class="search-item-row" style="display:flex;align-items:center;gap:10px;padding:4px 0;">
          <input type="checkbox" data-searchname="${name.replace(/"/g,"&quot;")}" ${tempList.includes(name) ? "checked" : ""}>
          <span>${name}</span>
        </label>
      `).join("")
      : (currentSource
          ? "<div style='color:#aaa;margin:12px 0;'>Inga träffar…</div>"
          : "");
    Array.from(optionsDiv.querySelectorAll('input[type="checkbox"]')).forEach(chk => {
      chk.addEventListener("change", function() {
        const name = this.getAttribute("data-searchname");
        if (this.checked) {
          if (!tempList.includes(name)) tempList.push(name);
        } else {
          tempList = tempList.filter(n => n !== name);
        }
        renderPreviewList();
      });
    });
  }

  function renderPreviewList() {
    previewList.innerHTML = tempList.map((name, idx) =>
      `<li>
        ${name}
        <button type="button" style="margin-left:8px;" onclick="(function(){
          window._removeTempListItem_${idx} && window._removeTempListItem_${idx}();
        })()">❌</button>
      </li>`
    ).join("");
    tempList.forEach((n, idx) => {
      window["_removeTempListItem_" + idx] = function() {
        tempList = tempList.filter((v, i) => i !== idx);
        renderPreviewList();
        renderOptions(lastFilter);
      };
    });
  }

  m.innerHTML = `
    <div class="modal-content" style="min-width:290px;">
      <h2>${kategori ? `Lägg till vara i kategori "${kategori}"` : "Lägg till varor"}</h2>
      <input id="batchItemInput" autocomplete="off" placeholder="Skriv vara och tryck Enter…" style="width:100%;margin-bottom:10px;" />
      <div style="display:flex;gap:10px;justify-content:space-between;margin-bottom:12px;">
        <button id="searchAllBtn" class="bigsearch" style="flex:1;">Välj från historik</button>
        <button id="searchMallBtn" class="bigsearch" style="flex:1;">Välj från mallar</button>
      </div>
      <div id="searchResult" style="max-height:180px;overflow:auto;margin-bottom:10px;"></div>
      <ul id="batchPreview" class="preview-list"></ul>
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button id="doneBtn">Klar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const searchInput = m.querySelector("#batchItemInput");
  const optionsDiv = m.querySelector("#searchResult");
  const previewList = m.querySelector("#batchPreview");
  const doneBtn = m.querySelector("#doneBtn");
  const searchAllBtn = m.querySelector("#searchAllBtn");
  const searchMallBtn = m.querySelector("#searchMallBtn");

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      const name = searchInput.value.trim();
      if (!tempList.includes(name)) tempList.push(name);
      searchInput.value = "";
      renderPreviewList();
      if (currentSource) renderOptions(lastFilter);
    }
  });

  searchInput.addEventListener("input", function() {
    lastFilter = searchInput.value.trim();
    if (currentSource) renderOptions(lastFilter);
  });

  doneBtn.onclick = function() {
    if (searchInput.value.trim()) {
      const name = searchInput.value.trim();
      if (!tempList.includes(name)) tempList.push(name);
    }
    if (onDone) onDone([...tempList]);
    document.body.removeChild(m);
  };

  searchAllBtn.onclick = function() {
    currentSource = "alla";
    renderOptions(searchInput.value.trim());
    searchAllBtn.classList.add("active");
    searchMallBtn.classList.remove("active");
  };

  searchMallBtn.onclick = function() {
    currentSource = "mall";
    renderOptions(searchInput.value.trim());
    searchMallBtn.classList.add("active");
    searchAllBtn.classList.remove("active");
  };

  // INGEN lista visas förrän någon trycker på en knapp
  optionsDiv.innerHTML = "";
  renderPreviewList();

  searchInput.focus();
  window.scrollModalToTop && window.scrollModalToTop();
};

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
