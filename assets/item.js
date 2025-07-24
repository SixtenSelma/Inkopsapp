// item.js – hantera varor (items) i listan

// Hjälpfunktion: Dela upp input till namn/note (t.ex. "Mjölk, 2 liter" eller "Bröd (glutenfri)")
window.splitItemInput = function(text) {
  text = text.trim();
  let name = text, note = "";
  // parentes
  const paren = text.match(/^(.+?)\s*\((.+)\)$/);
  if (paren) {
    name = paren[1].trim();
    note = paren[2].trim();
  } else if (text.includes(",")) {
    // kommatecken
    const idx = text.indexOf(",");
    name = text.slice(0, idx).trim();
    note = text.slice(idx + 1).trim();
  }
  return { name, note };
};

// Hämta alla unika varunamn (utan note)
window.getAllUniqueItemNames = function(lists) {
  const names = {};
  lists.forEach(list => {
    list.items.forEach(item => {
      const key = item.name.trim().toLowerCase();
      if (!names[key]) names[key] = item.name;
    });
  });
  return Object.values(names);
};

// Toggle “klar” för en vara – med signatur och datum!
window.toggleItem = function(li, ii, lists, user, saveAndRenderList) {
  const it = lists[li].items[ii];
  it.done = !it.done;
  if (it.done) {
    it.doneBy = user;
    it.doneAt = new Date().toISOString();
  } else {
    delete it.doneBy;
    delete it.doneAt;
  }
  saveAndRenderList(li);
};

// Byt namn på vara
window.renameItem = function(li, ii, lists, saveAndRenderList, closeAnyMenu) {
  const currentName = lists[li].items[ii].name;
  showRenameDialog("Byt namn på vara", currentName, (newName) => {
    lists[li].items[ii].name = newName;
    saveAndRenderList(li);
    if (closeAnyMenu) closeAnyMenu();
  });
};

// Komplettera vara (lägg till note/kategori)
window.complementItem = function(li, ii, lists, categoryMemory, saveAndRenderList, closeAnyMenu) {
  const itemName = lists[li].items[ii].name.trim().toLowerCase();
  const currentNote = lists[li].items[ii].note || '';
  const rememberedCat = categoryMemory[itemName] || '';
  const currentCat = lists[li].items[ii].category || rememberedCat || '';
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Komplettering</h2>
      <label>Beskrivning:</label>
      <input id="noteInput" placeholder="T.ex. 1 liter…" value="${currentNote}" />
      <label style="margin-top:12px;">Kategori:</label>
      <select id="categorySelect">
        <option value="">Välj kategori…</option>
        ${standardKategorier.map(cat => `
          <option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>
        `).join('')}
      </select>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNote()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("noteInput");
  const select = document.getElementById("categorySelect");
  input.focus();
  input.select();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNote();
  });

  window.confirmNote = () => {
    lists[li].items[ii].note = input.value.trim();
    lists[li].items[ii].category = select.value;

    // Uppdatera minnet om kategori per vara!
    const itemNameKey = lists[li].items[ii].name.trim().toLowerCase();
    if (select.value) {
      categoryMemory[itemNameKey] = select.value;
      saveCategoryMemory && saveCategoryMemory(categoryMemory);
    }

    saveAndRenderList(li);
    document.body.removeChild(m);
    if (closeAnyMenu) closeAnyMenu();
  };
};

// Ta bort vara
window.deleteItem = function(li, ii, lists, saveAndRenderList, closeAnyMenu) {
  lists[li].items.splice(ii, 1);
  saveAndRenderList(li);
  if (closeAnyMenu) closeAnyMenu();
};
