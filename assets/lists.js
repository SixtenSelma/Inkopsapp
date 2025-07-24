// lists.js – hanterar inköpslistor och rendering

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");
// lists.js – hanterar inköpslistor och rendering

window.formatDate = function(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

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
  const list = lists[i];
  // Hämtar/behåller state för dölja klara
  if (window._hideDone === undefined) window._hideDone = true;

  // Dela upp items, lägg till realIdx
  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

  // Gruppindelning på kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Skapa HTML för varje kategori
  const itemsHTML = Object.entries(grouped)
    .map(([cat, items]) => {
      // Filtrera bort klara om rutan är i-bockad
      const filtered = window._hideDone
        ? items.filter(x => !x.done)
        : items;
      if (!filtered.length) return ''; // Visa aldrig tom kategori

      // Sortering: Ej klara först (A-Ö), sedan klara (A-Ö)
      const sorted = [
        ...filtered.filter(x => !x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv')),
        ...filtered.filter(x => x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
      ];

      const itemList = sorted.map(item => `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
          <span class="item-name">
            ${item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`}
            ${(() => {
              // Rad 2: note och/eller signatur+datum
              const hasNote = item.note && item.note.trim().length;
              const hasStamp = item.done && item.doneBy;
              if (!hasNote && !hasStamp) return "";
              let row2 = "";
              if (hasNote && hasStamp) {
                row2 = `<small class="item-note">${item.note} &nbsp;–&nbsp; ${item.doneBy} ${formatDate(item.doneAt)}</small>`;
              } else if (hasNote) {
                row2 = `<small class="item-note">${item.note}</small>`;
              } else if (hasStamp) {
                row2 = `<small class="item-note">${item.doneBy} ${formatDate(item.doneAt)}</small>`;
              }
              return row2;
            })()}
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
      <h1 class="back-title" style="font-size:1.45em; font-weight:700; margin:0;flex:1;">${list.name}</h1>
      <label class="hide-done-label" style="margin-left:auto; display:flex; align-items:center; gap:6px;">
        <input type="checkbox" id="hideDone" ${window._hideDone ? "checked" : ""} onchange="toggleHideDone(${i})">
        <span class="hide-done-text">Dölj klara</span>
      </label>
      <div style="width: 10px"></div>
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




// 11!!

};// --- Lägg till denna funktion i lists.js! ---
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
      if (suggestedCategory) {
        lists[listIndex].items.push({ name: itemName, note: note, done: false, category: suggestedCategory });
        handleNext();
      } else {
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

if (typeof renderAllLists === "function") {
  renderAllLists();
}

window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};
