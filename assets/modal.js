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

        let category;
        if (!list.hideCategories) {
          // 1) Kolla categoryMemory
          if (window.categoryMemory[name]) {
            category = window.categoryMemory[name];
          } else {
            // 2) Sök i andra listor efter tidigare inslagen kategori
            let foundCat;
            for (const other of lists) {
              if (other === list) continue;
              const it = other.items.find(x => x.name.trim().toLowerCase() === name.toLowerCase() && x.category);
              if (it) { foundCat = it.category; break; }
            }
            if (foundCat) {
              category = foundCat;
            } else {
              // 3) Fråga användaren
              category = await chooseCategory(name) || "Övrigt";
            }
            // Spara för framtida autofyll
            window.categoryMemory[name] = category;
            try { localStorage.setItem("categoryMemory", JSON.stringify(window.categoryMemory)); }
            catch {}
          }
        }

        // Lägg till posten
        lists[i].items.push({
          name,
          note,
          done: false,
          ...(list.hideCategories ? {} : { category })
        });
      }

      // Spara & rendera om
      stampListTimestamps(lists[i]);
      saveLists(lists);
      renderListDetail(i);
    }
  });
};



// ===== Lägg till via kategori‑knapp – autocomplete från andra listor i samma kategori =====
window.addItemViaCategory = function(listIndex, category) {
  const list = lists[listIndex];

  // Hämta alla varunamn i samma kategori, men från ANDRA listor
  const suggestionSet = new Set();
  lists.forEach((otherList, idx) => {
    if (idx === listIndex) return;
    otherList.items.forEach(item => {
      if (item.category === category && item.name) {
        suggestionSet.add(item.name.trim());
      }
    });
  });
  const kategoriVaror = Array.from(suggestionSet).sort();

  showAddItemsDialog({
    kategori: category,      // visar ”Kategori: <namn>” i dialogen
    allaVaror: [],           // tom lista när onlyCategory = true
    kategoriVaror,           // här ligger våra förslag
    onlyCategory: true,
    onDone: async added => {
      if (!added || !added.length) return;

      for (const raw of added) {
        const [namePart, ...noteParts] = raw.split(',');
        const name = namePart.trim();
        const note = noteParts.join(',').trim();

        // Hoppa dubbletter
        if (list.items.some(it =>
          it.name.trim().toLowerCase() === name.toLowerCase() &&
          (it.note||'').trim().toLowerCase() === note.toLowerCase()
        )) continue;

        list.items.push({ name, note, done: false, category });
      }

      stampListTimestamps(list);
      saveLists(lists);
      renderListDetail(listIndex);
    }
  });
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

// ===== in lists.js =====
// Uppdaterad openItemMenu så det bara finns "Ändra" och "Ta bort"
function openItemMenu(listIndex, itemIndex, btn) {
  event.stopPropagation();
  document.querySelectorAll('.item-menu').forEach(el => el.remove());

  const item = lists[listIndex].items[itemIndex];
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="(function(){
      showEditItemDialog(${listIndex}, ${itemIndex},
        \`${item.name.replace(/`/g, '\\`')}\`,
        \`${(item.note||'').replace(/`/g, '\\`')}\`,
        (newName, newNote) => {
          item.name = newName;
          item.note = newNote;
          stampListTimestamps(lists[${listIndex}]);
          saveLists(lists);
          renderListDetail(${listIndex});
        }
      );
    })()">Ändra</button>
    <button onclick="(function(){
      if (confirm('Ta bort varan permanent?')) {
        lists[${listIndex}].items.splice(${itemIndex},1);
        stampListTimestamps(lists[${listIndex}]);
        saveLists(lists);
        renderListDetail(${listIndex});
      }
    })()">Ta bort</button>
  `;

  btn.parentElement.appendChild(menu);
  const rect = btn.getBoundingClientRect();
  menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  menu.style.left = (rect.right + window.scrollX - menu.offsetWidth) + 'px';

  document.addEventListener('click', function onDocClick(e) {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.remove();
      document.removeEventListener('click', onDocClick);
    }
  });
}


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
