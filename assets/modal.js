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


// ===== in modal.js =====
// Redigera vara-modal: låt användaren ändra namn och komplement
window.showEditItemDialog = function(listIndex, itemIndex, currentName, currentNote, onConfirm) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `
    <div class="modal-content">
      <h2>Ändra vara</h2>
      <label>Produkt:
        <input id="editItemName" value="${currentName.replace(/"/g, '&quot;')}" autocomplete="off" />
      </label>
      <label style="margin-top:12px;">Komplement:
        <input id="editItemNote" value="${currentNote.replace(/"/g, '&quot;')}" />
      </label>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmEditItem()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const inpName = m.querySelector('#editItemName');
  const inpNote = m.querySelector('#editItemNote');
  setTimeout(() => { inpName.focus(); inpName.select(); }, 100);

  window.confirmEditItem = () => {
    const newName = inpName.value.trim();
    const newNote = inpNote.value.trim();
    if (!newName) { inpName.focus(); return; }
    onConfirm(newName, newNote);
    document.body.removeChild(m);
    delete window.confirmEditItem;
  };
};

// Flytta modal upp om mobil och tangentbord
window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

window.showAddItemsDialog = function({
  kategori = null,
  allaVaror = [],
  onlyCategory = false,
  onDone
}) {
  // Välj källa för autocomplete
  const source = onlyCategory
    ? allaVaror.filter(v => kategori == null || v.category === kategori)
    : allaVaror;

  // Bygg modal
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      ${kategori ? `<p class="additem-subtitle">Kategori: <strong>${kategori}</strong></p>` : ""}
      <input id="addItemInput" placeholder="Skriv varunamn…" list="add-items-suggestions" autocomplete="off"/>
      <datalist id="add-items-suggestions">
        ${[...new Set(source)].sort().map(s => `<option value="${s}">`).join("")}
      </datalist>
      <ul class="preview-list" id="addItemPreview"></ul>
      <div class="modal-actions">
        <button id="addItemCancel" class="btn-secondary">Avbryt</button>
        <button id="addItemConfirm" disabled>Klar</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  // Scrolla upp
  window.scrollModalToTop();

  const input   = m.querySelector("#addItemInput");
  const preview = m.querySelector("#addItemPreview");
  const btnOk   = m.querySelector("#addItemConfirm");
  const btnCancel = m.querySelector("#addItemCancel");
  let items = [];

  function renderPreview() {
    preview.innerHTML = items.map((name,i) =>
      `<li>${name}
         <button class="btn-remove" data-idx="${i}" title="Ta bort">×</button>
       </li>`
    ).join("");
    btnOk.disabled = items.length === 0;
    preview.querySelectorAll(".btn-remove").forEach(btn =>
      btn.onclick = () => {
        items.splice(+btn.dataset.idx,1);
        renderPreview();
      }
    );
  }

  // Enter lägger till
  input.onkeydown = e => {
    if (e.key === "Enter" && input.value.trim()) {
      const val = input.value.trim();
      if (!items.includes(val)) {
        items.push(val);
        renderPreview();
      }
      input.value = "";
      e.preventDefault();
    }
  };

  btnCancel.onclick = () => m.remove();
  btnOk.onclick     = () => {
    onDone(items);
    m.remove();
  };

  // Fokus på input
  setTimeout(() => input.focus(), 50);
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
