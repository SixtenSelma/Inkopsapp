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

// === Renderar en enskild lista ===
window.renderListDetail = function(i) {
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
      <button onclick="showBatchAddDialog(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  applyFade && applyFade();
};

// === Skapa ny lista (popup) ===
window.showNewListDialog = function() {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Skapa ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="window._confirmNewList()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const input = document.getElementById("modalNewListInput");
  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") window._confirmNewList();
  });
};

window._confirmNewList = function() {
  const inp = document.getElementById("modalNewListInput");
  if (inp && inp.value.trim()) {
    lists.push({ name: inp.value.trim(), items: [] });
    saveLists(lists);
    renderAllLists();
    document.body.removeChild(document.querySelector('.modal'));
  }
};

// === Lägg till vara/varor (batch), hantera minne av kategori ===
window.showBatchAddDialog = function(listIndex) {
  showBatchAddDialog(listIndex, function(added) {
    let changed = false;
    let toPrompt = [];
    added.forEach(rawText => {
      const { name, note } = splitItemInput(rawText);
      if (!name) return;
      const key = name.trim().toLowerCase();
      let category = categoryMemory[key] || "";
      if (!category) {
        // Vi saknar kategori, fråga användaren och pausa tills de väljer
        toPrompt.push({ name, note, key });
      } else {
        // Vi har minne, lägg till direkt
        lists[listIndex].items.push({ name, note, category });
        changed = true;
      }
    });

    // Om någon ska promptas, fråga en i taget i följd
    function promptNext() {
      if (!toPrompt.length) {
        if (changed) {
          saveLists(lists);
          renderListDetail(listIndex);
        }
        return;
      }
      const { name, note, key } = toPrompt.shift();
      showCategoryPicker(name, (cat) => {
        categoryMemory[key] = cat;
        saveCategoryMemory(categoryMemory);
        lists[listIndex].items.push({ name, note, category: cat });
        saveLists(lists);
        renderListDetail(listIndex);
        promptNext(); // Nästa (om fler saknar kategori)
      });
    }
    promptNext();

    // Om vi lagt till någon direkt (med kategori i minne), rendera (senaste ändringar syns direkt)
    if (changed && !toPrompt.length) {
      saveLists(lists);
      renderListDetail(listIndex);
    }
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
