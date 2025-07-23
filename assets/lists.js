// lists.js – hanterar inköpslistor och rendering

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// === Renderar alla listor ===
window.renderAllLists = function() {
  closeAnyMenu && closeAnyMenu(); // Ta bort ev popup
  const listCards = lists.map((list, i) => {
    const done = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
      <li class="list-item" onclick="viewList(${i})">
        <div class="list-card">
          <div class="list-card-header">
            <span class="list-card-title" style="font-size:1.25rem">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenu(${i}, this)">⋮</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1 style="font-size: 1.55em;">Inköpslista</h1>
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

// === Renderar en enskild lista ===
window.renderListDetail = function(i) {
  closeAnyMenu && closeAnyMenu();
  const list = lists[i];
  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

  // Gruppindelning på kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const itemsHTML = Object.entries(grouped)
    .filter(([, items]) => items.length)
    .map(([cat, items]) => {
      const itemList = items.map(item => `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx}, lists, user, saveAndRenderList)" />
          <span class="item-name">
            ${item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`}
            ${item.note ? `<small class="item-note">(${item.note})</small>` : ''}
            ${item.done && item.doneBy ? `<small>${item.doneBy} • ${formatDate(item.doneAt)}</small>` : ''}
          </span>
          <button class="menu-btn" onclick="openItemMenu(${i}, ${item.realIdx}, this)">⋮</button>
        </li>
      `).join("");

      return `
        <h3 class="category-heading">${cat}</h3>
        <ul class="todo-list">${itemList}</ul>
      `;
    }).join("");

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
      <button onclick="showBatchAddDialog(${i}, onBatchAddDone)" title="Lägg till vara">➕</button>
    </div>
  `;

  applyFade && applyFade();

  // Batch add-funktion som nu stödjer popup för kategori vid behov
  window.onBatchAddDone = function(added) {
    if (!added || !added.length) return;
    let idx = 0;
    function next() {
      if (idx >= added.length) {
        saveLists(lists);
        renderListDetail(i);
        return;
      }
      const inp = splitItemInput(added[idx]);
      // Kolla om kategoriminnet vet vad det ska vara
      let cat = categoryMemory[inp.name.trim().toLowerCase()] || '';
      if (cat) {
        lists[i].items.push({ name: inp.name, note: inp.note, done: false, category: cat });
        idx++;
        next();
      } else {
        // Saknar kategori – fråga användaren
        showCategoryPicker(inp.name, selectedCat => {
          lists[i].items.push({ name: inp.name, note: inp.note, done: false, category: selectedCat });
          categoryMemory[inp.name.trim().toLowerCase()] = selectedCat;
          saveCategoryMemory(categoryMemory);
          idx++;
          next();
        });
      }
    }
    next();
  };
};

// === Skapa ny lista (popup) ===
window.showNewListDialog = function() {
  showNewListDialog(function(listName) {
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

// Gör så att list-klick funkar
window.viewList = renderListDetail;

// === Initiera första renderingen ===
if (typeof renderAllLists === "function") {
  renderAllLists();
}
