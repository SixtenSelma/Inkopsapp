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

// ===== Lägg till varor via botten‑➕ =====
window.addItemsWithCategory = function(listIndex = null) {
  let i = listIndex;
  if (i === null) {
    if (!lists.length) return;
    const promptTxt = "Vilken lista vill du lägga till i?\n" +
      lists.map((l, idx) => `${idx+1}: ${l.name}`).join("\n");
    const val = prompt(promptTxt);
    if (!val) return;
    i = parseInt(val, 10) - 1;
    if (isNaN(i) || i < 0 || i >= lists.length) return;
  }

  const list = lists[i];
  const allNames = getAllUniqueItemNames(lists);

  // Visa enkel modal för manuell inmatning (utan kategori-val i förväg)
  showAddItemsDialog({
    kategori: null,
    allaVaror: allNames,
    onDone: async added => {
      if (!added.length) return;

      for (const raw of added) {
        const [namePart, ...noteParts] = raw.split(',');
        const name = namePart.trim();
        const note = noteParts.join(',').trim();

        // Hoppa över dubbletter
        if (lists[i].items.some(it =>
          it.name.trim().toLowerCase() === name.toLowerCase() &&
          (it.note||'').trim().toLowerCase() === note.toLowerCase()
        )) continue;

        // För listor med kategorier: försök återanvända sparad kategori,
        // annars fråga användaren efter kategori
        let category;
        if (!list.hideCategories) {
          if (window.categoryMemory[name]) {
            category = window.categoryMemory[name];
          } else {
            category = await chooseCategory(name) || "Övrigt";
            // spara för nästa gång
            window.categoryMemory[name] = category;
            try { localStorage.setItem("categoryMemory", JSON.stringify(window.categoryMemory)); }
            catch {}
          }
        }

        // Lägg till varan
        lists[i].items.push({
          name,
          note,
          done: false,
          ...(list.hideCategories ? {} : { category })
        });
      }

      // Spara och rendera om
      stampListTimestamps(lists[i]);
      saveLists(lists);
      renderListDetail(i);
    }
  });
};


// ===== Lägg till via kategori‑knapp – använder alla listors historik för autocomplete =====
window.addItemViaCategory = function(listIndex, category) {
  const list = lists[listIndex];
  const allNames = getAllUniqueItemNames(lists);
  const categoryNames = getCategoryItemNames(list, category);

  showAddItemsDialog({
    kategori: category,
    allaVaror: allNames,
    onlyCategory: true,
    kategoriVaror: categoryNames,
    onDone: added => {
      if (!added.length) return;
      added.forEach(raw => {
        const [namePart, ...noteParts] = raw.split(',');
        const name = namePart.trim();
        const note = noteParts.join(',').trim();
        // undvik dubbletter
        if (lists[listIndex].items.some(it =>
          it.name.trim().toLowerCase() === name.toLowerCase() &&
          (it.note||'').trim().toLowerCase() === note.toLowerCase()
        )) return;
        lists[listIndex].items.push({ name, note, done: false, category });
      });
      stampListTimestamps(lists[listIndex]);
      saveLists(lists);
      renderListDetail(listIndex);
    }
  });
};


// modal.js – enkel “Lägg till vara”‑modal
window.showAddItemsDialog = function({
  kategori = null,
  allaVaror = [],
  onlyCategory = false,
  kategoriVaror = [],
  onDone
}) {
  const source = onlyCategory ? kategoriVaror : allaVaror;

  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      ${kategori ? `<p class="additem-subtitle">Kategori: <strong>${kategori}</strong></p>` : ""}
      <input id="addItemInput" placeholder="Skriv varunamn…" list="add-items-dl" autocomplete="off"/>
      <datalist id="add-items-dl">
        ${[...new Set(source)].sort().map(s => `<option value="${s}">`).join("")}
      </datalist>
      <ul id="addItemPreview" class="preview-list"></ul>
      <div class="modal-actions">
        <button id="addItemCancel" class="btn-secondary">Avbryt</button>
        <button id="addItemConfirm" disabled>Klar</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  const input   = m.querySelector("#addItemInput");
  const preview = m.querySelector("#addItemPreview");
  const btnOk   = m.querySelector("#addItemConfirm");
  const btnCancel = m.querySelector("#addItemCancel");
  let items = [];

  function renderPreview() {
    preview.innerHTML = items.map((name,i) =>
      `<li>${name} <button class="btn-remove" data-idx="${i}" title="Ta bort">×</button></li>`
    ).join("");
    btnOk.disabled = items.length === 0;
    preview.querySelectorAll(".btn-remove").forEach(btn =>
      btn.onclick = () => {
        items.splice(+btn.dataset.idx,1);
        renderPreview();
      }
    );
  }

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
