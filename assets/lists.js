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
            <span class="list-card-title" style="font-size:1.18rem;">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenu(${i}, this)">⋮</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1 style="font-size:2.0rem;">Inköpslista</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">🖊</button>
      </div>
    </div>
    <ul class="list-wrapper">
      ${listCards || '<p class="no-lists">Inga listor än.</p>'}
    </ul>
    <div class="bottom-bar">
      <button onclick="showNewListDialog(confirmNewList)" title="Ny lista">➕</button>
    </div>
  `;

  if (typeof applyFade === "function") applyFade();
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
      <button onclick="showBatchAddDialog(${i}, batchAddDone)" title="Lägg till vara">➕</button>
    </div>
  `;

  if (typeof applyFade === "function") applyFade();
};

// === Skapa ny lista (popup) ===
window.showNewListDialog = function(onConfirm) {
  // Modal från modal.js
  showNewListDialogInner(onConfirm || confirmNewList);
};

window.confirmNewList = function(name) {
  if (!name) {
    const inp = document.getElementById("modalNewListInput");
    if (inp && inp.value.trim()) name = inp.value.trim();
    else return;
  }
  lists.push({ name: name.trim(), items: [] });
  saveLists(lists);
  renderAllLists();
};

// === Batch add (lägga till flera varor) ===
window.showBatchAddDialog = function(i, onDone) {
  showBatchAddDialogInner(i, onDone || batchAddDone);
};

window.batchAddDone = function(added) {
  // Sista visade lista
  const i = typeof window.lastListIndex === "number" ? window.lastListIndex : lists.length - 1;
  if (!Array.isArray(added) || typeof i !== "number" || !lists[i]) return;

  let firstUnknown = null;
  for (const raw of added) {
    const { name, note } = splitItemInput(raw);
    let category = "";
    if (window.categoryMemory) {
      const remembered = window.categoryMemory[name.trim().toLowerCase()];
      if (remembered) category = remembered;
    }
    // Kolla om kategori redan finns, annars låt användaren välja
    if (!category) {
      if (!firstUnknown) firstUnknown = { i, name, note };
      lists[i].items.push({ name, note, done: false, category: "" });
    } else {
      lists[i].items.push({ name, note, done: false, category });
    }
  }
  saveLists(lists);
  renderListDetail(i);

  if (firstUnknown) {
    // Be användaren välja kategori för första okända varan
    showCategoryPicker(firstUnknown.name, cat => {
      // Sätt kategori för *alla* varor med det namnet i denna lista som saknar kategori
      lists[i].items.forEach(item => {
        if (item.name === firstUnknown.name && !item.category) {
          item.category = cat;
          // Spara till categoryMemory också!
          if (window.categoryMemory) {
            window.categoryMemory[item.name.trim().toLowerCase()] = cat;
            saveCategoryMemory(window.categoryMemory);
          }
        }
      });
      saveLists(lists);
      renderListDetail(i);
    });
  }
  window.lastListIndex = i;
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

// === Meny för listor (popup) ===
window.openListMenu = function(i, btn) {
  closeAnyMenu && closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameList(${i})">🖊 Byt namn</button>
    <button onclick="deleteList(${i})">✖ Ta bort lista</button>
  `;
  positionMenu(menu, btn);
};

window.closeAnyMenu = function() {
  const existing = document.querySelector('.item-menu');
  if (existing) existing.remove();
};

window.positionMenu = function(menu, btn) {
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.top = `${rect.bottom + window.scrollY}px`;
  menu.style.left = `${Math.min(window.innerWidth - 180, rect.left + window.scrollX - 100)}px`;
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
};

// === Byt användare ===
window.changeUser = function() {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    setUser(n);
    renderAllLists();
  }
};

// === Visa lista (detaljvy) ===
window.viewList = function(i) {
  window.lastListIndex = i;
  renderListDetail(i);
};

// === Hjälpfunktion för datumformat ===
window.formatDate = function(dateString) {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
};

// === Första renderingen ===
if (typeof renderAllLists === "function") {
  renderAllLists();
}
