// modal.js – återanvändbara modaler med mobilfokus och batch add

// Flytta modal upp om mobil och tangentbord
window.scrollModalToTop = function () {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

// ===== Lägg till varor-dialog med namn + komplement (note) efter komma =====
window.showAddItemsDialog = function({
  kategori = null,
  allaVaror = [],     // array av strängar eller objekt {name,category}
  onlyCategory = false,
  onDone
}) {
  // 1) Filtrera på kategori om det är objekt och onlyCategory
  let source = allaVaror;
  if (onlyCategory && kategori !== null && source.length && typeof source[0] === "object") {
    source = source.filter(v => v.category === kategori);
  }

  // 2) Extrahera alltid ut bara namn (strängar)
  const names = source.map(v => typeof v === "string" ? v : v.name);

  // 3) Bygg modal‑DOM
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      ${kategori ? `<p class="additem-subtitle">Kategori: <strong>${kategori}</strong></p>` : ""}
      <input id="addItemInput"
             placeholder="varan, komplement"
             list="add-items-suggestions"
             autocomplete="off" />
      <datalist id="add-items-suggestions">
        ${[...new Set(names)].sort()
            .map(n => `<option value="${n}">`).join("")}
      </datalist>
      <ul class="preview-list" id="addItemPreview"></ul>
      <div class="modal-actions">
        <button id="addItemCancel" class="btn-secondary">Avbryt</button>
        <button id="addItemConfirm" disabled>Klar</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  // 4) Hämta element och initiera state
  const input     = m.querySelector("#addItemInput");
  const preview   = m.querySelector("#addItemPreview");
  const btnOk     = m.querySelector("#addItemConfirm");
  const btnCancel = m.querySelector("#addItemCancel");
  let items = []; // kommer innehålla { name, note }

  // 5) Funktion för att visa preview-listan
  function renderPreview() {
    preview.innerHTML = items.map(({name,note}, idx) =>
      `<li>
         <strong>${name}</strong>${note?` – <em>${note}</em>`:""}
         <button class="btn-remove" data-idx="${idx}" title="Ta bort">×</button>
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

  // 6) Hantera Enter: dela på första kommatecknet
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      const [namePart, ...rest] = input.value.trim().split(",");
      const name = namePart.trim();
      const note = rest.join(",").trim();
      if (name && !items.some(it => it.name===name && it.note===note)) {
        items.push({ name, note });
        renderPreview();
      }
      input.value = "";
      e.preventDefault();
    }
  });

  // 7) Knapphantering
  btnCancel.onclick = () => m.remove();
  btnOk.onclick     = () => { onDone(items); m.remove(); };

  // 8) Mobil-scroll + fokus
  window.scrollModalToTop();
  setTimeout(() => input.focus(), 50);
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


// Redigera vara-modal: låt användaren ändra namn, komplement och kategori
window.showEditItemDialog = function(listIndex, itemIndex, currentName, currentNote, currentCategory, onConfirm) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `
    <div class="modal-content">
      <h2>Ändra/komplettera</h2>
      <label>Beskrivning:
        <input id="editItemName" value="${currentName.replace(/"/g, '&quot;')}" autocomplete="off" />
      </label>
      <label style="margin-top:12px;">Extra:
        <input id="editItemNote" value="${currentNote.replace(/"/g, '&quot;')}" />
      </label>
      <label style="margin-top:12px;">Kategori:
        <select id="editItemCategory">
          ${standardKategorier.map(cat =>
            `<option value="${cat}"${cat===currentCategory?' selected':''}>${cat}</option>`
          ).join('')}
        </select>
      </label>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button id="editItemConfirmBtn">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const inpName = m.querySelector('#editItemName');
  const inpNote = m.querySelector('#editItemNote');
  const selCat  = m.querySelector('#editItemCategory');
  const btnOk   = m.querySelector('#editItemConfirmBtn');

  // Fokusera på första fältet
  setTimeout(() => { inpName.focus(); inpName.select(); }, 100);

  btnOk.onclick = () => {
    const newName = inpName.value.trim();
    const newNote = inpNote.value.trim();
    const newCat  = selCat.value;
    if (!newName) {
      inpName.focus();
      return;
    }
    onConfirm(newName, newNote, newCat);
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
  setTimeout(() => {
    select.focus();
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
