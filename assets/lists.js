// lists.js – hanterar inköpslistor och rendering

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// === Renderar alla listor ===
window.renderAllLists = function() {
  const listCards = lists.map((list, i) => {
    const done = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    return `
      <li class="list-item" onclick="viewList(${i})">
        <div class="list-card">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenu(${i}, this)">⋮</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>Inköpslista</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">🖊</button>
      </div>
    </div>
    <ul class="list-wrapper">
      ${listCards || '<p class="no-lists">Inga listor än.</p>'}
    </ul>
    <div class="bottom-bar">
      <button onclick="showNewListDialog()" title="Ny lista">➕</button>
    </div>
  `;

  applyFade && applyFade();
};
window.renderListDetail = function(i) {
  // 1. Felsäker kontroll på index och lista
  if (!lists || !Array.isArray(lists) || !lists[i]) {
    alert("Kunde inte hitta listan – fel index?");
    return;
  }
  const list = lists[i];

  // 2. Mappa ut items med realIdx (säkerställ att alla är objekt)
  const allItems = Array.isArray(list.items)
    ? list.items.map((item, realIdx) => ({ ...item, realIdx }))
    : [];

  // 3. Gruppindelning på kategori – förbered alla kategorier
  const grouped = {};
  (window.standardKategorier || []).forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    // Kontrollera att item är ett objekt och har name
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim()) return;
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // 4. Rendera varje kategori för sig
  const itemsHTML = Object.entries(grouped)
    .filter(([, items]) => items.length)
    .map(([cat, items]) => {
      // Felsäker sortering: Ej klara först, sedan klara, inom varje namnordning (case-insensitive)
      const sorted = [
        ...items.filter(x => !Boolean(x.done)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sv', { sensitivity: 'base' })),
        ...items.filter(x => Boolean(x.done)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sv', { sensitivity: 'base' }))
      ];
      // Säkert bygge av HTML för varje item
      const itemList = sorted.map(item => {
        if (!item || typeof item.name !== "string" || !item.name.trim()) return "";
        return `
          <li class="todo-item ${item.done ? 'done' : ''}">
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
            <span class="item-name">
              ${item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`}
              ${item.note ? `<small class="item-note">(${item.note})</small>` : ''}
              ${item.done && item.doneBy ? `<small>${item.doneBy} • ${formatDate(item.doneAt)}</small>` : ''}
            </span>
            <button class="menu-btn" onclick="openItemMenu(${i}, ${item.realIdx}, this)">⋮</button>
          </li>
        `;
      }).join("");

      return `
        <h3 class="category-heading">${cat}</h3>
        <ul class="todo-list">${itemList}</ul>
      `;
    }).join("");

  // 5. Rendera sidan
  app.innerHTML = `
    <div class="top-bar">
      <span class="back-arrow" onclick="renderAllLists()" style="margin-right:10px; cursor:pointer; display:flex; align-items:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#232323" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </span>
      <h1 class="back-title" style="font-size:1.45em; font-weight:700; margin:0;">${list.name}</h1>
      <div style="width: 56px"></div>
    </div>
    <div class="category-list">
      ${itemsHTML || '<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  applyFade && applyFade();
};
window.addItemsWithCategory = function(listIndex) {
  showBatchAddDialog(listIndex, function(added) {
    if (!added || !added.length) return;
    let toAdd = [...added];
    function handleNext() {
      if (!toAdd.length) {
        saveLists(lists);
        renderListDetail(listIndex);
        return;
      }
      const raw = toAdd.shift();
      const { name: itemName, note } = splitItemInput(raw);
      const itemNameKey = itemName.trim().toLowerCase();
      const suggestedCategory = categoryMemory[itemNameKey];
      // Om kategori redan finns i minnet, använd den direkt
      if (suggestedCategory) {
        lists[listIndex].items.push({ name: itemName, note: note, done: false, category: suggestedCategory });
        handleNext();
      } else {
        // Visa kategori-popup
        showCategoryPicker(itemName, (chosenCat) => {
          lists[listIndex].items.push({ name: itemName, note: note, done: false, category: chosenCat });
          categoryMemory[itemNameKey] = chosenCat;
          saveCategoryMemory && saveCategoryMemory(categoryMemory);
          handleNext();
        });
      }
    }
    handleNext();
  });
};

// === Skapa ny lista (popup) ===
window.showNewListDialog = function() {
  showNewListModal(function(listName) {
    lists.push({ name: listName, items: [] });
    saveLists(lists);
    renderAllLists();
  });
};

// === Byt namn på lista (använder modal.js) ===
window.renameList = function(i) {
  const currentName = lists[i].name;
  showRenameDialog("Byt namn på lista", currentName, (newName) => {
    lists[i].name = newName;
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  });
};

// === Ta bort lista ===
window.deleteList = function(i) {
  if (confirm("Vill du ta bort listan permanent?")) {
    lists.splice(i, 1);
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  }
};

// === Initiera första renderingen ===
if (typeof renderAllLists === "function") {
  renderAllLists();
}
