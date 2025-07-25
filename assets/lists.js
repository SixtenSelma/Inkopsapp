// lists.js – hanterar inköpslistor och rendering

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// Hjälpfunktion: formatera datum
window.formatDate = function(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = x => String(x).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};

// Hjälpfunktion: Hämta unika varunamn i alla listor
window.getAllUniqueItemNames = function(lists) {
  const namesSet = new Set();
  lists.forEach(list => {
    list.items.forEach(item => {
      if (item.name) namesSet.add(item.name.trim());
    });
  });
  return Array.from(namesSet).sort();
};
// Hjälpfunktion: Hämta unika varunamn i mall-listor
window.getTemplateItemNames = function(lists) {
  const namesSet = new Set();
  lists.forEach(list => {
    if (!list.name.startsWith("Mall:")) return;
    list.items.forEach(item => {
      if (item.name) namesSet.add(item.name.trim());
    });
  });
  return Array.from(namesSet).sort();
};
// Hjälpfunktion: Hämta unika varunamn i en kategori i denna lista
window.getCategoryItemNames = function(list, kategori) {
  const namesSet = new Set();
  list.items.forEach(item => {
    if ((item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)") === kategori && item.name) {
      namesSet.add(item.name.trim());
    }
  });
  return Array.from(namesSet).sort();
};

// === Renderar alla listor ===
window.renderAllLists = function() {
  // Dela listor i aktiva och arkiverade
  const activeLists = lists.filter(l => !l.archived);
  const archivedLists = lists.filter(l => l.archived);

  // Sortera som tidigare, mallar sist
  const sortedActive = [...activeLists].sort((a, b) => {
    const aIsTemplate = a.name.startsWith("Mall:");
    const bIsTemplate = b.name.startsWith("Mall:");
    if (aIsTemplate && !bIsTemplate) return 1;
    if (!aIsTemplate && bIsTemplate) return -1;
    return a.name.localeCompare(b.name, 'sv');
  });
  const sortedArchived = [...archivedLists].sort((a, b) => {
    return (b.archivedAt || 0) - (a.archivedAt || 0);
  });

  // Aktiva listor
  const listCards = sortedActive.map((list) => {
    const done = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const extraClass = list.name.startsWith("Mall:") ? "list-card-template" : "";
    return `
      <li class="list-item" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
        <div class="list-card ${extraClass}">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">⋮</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  // Arkiverade listor – collapsible
  let archivedSection = "";
  if (sortedArchived.length) {
    const archivedListCards = sortedArchived.map((list) => {
      const done = list.items.filter(x => x.done).length;
      const total = list.items.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const extraClass = "archived-list-card";
      const dateTxt = list.archivedAt ? `Arkiverad: ${window.formatDate(list.archivedAt)}` : "";
      return `
        <li class="list-item archived" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
          <div class="list-card ${extraClass}">
            <div class="list-card-header">
              <span class="list-card-title">${list.name}</span>
              <button class="menu-btn" onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">⋮</button>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="progress-text">${done} / ${total} klara</div>
            <div class="archived-at">${dateTxt}</div>
          </div>
        </li>`;
    }).join("");

    archivedSection = `
      <div class="archived-section">
        <button class="archived-toggle" onclick="toggleArchivedSection(event)">
          <span id="archived-arrow">▼</span> Arkiverade listor (${sortedArchived.length})
        </button>
        <ul class="list-wrapper archived-lists" style="display:none;">
          ${archivedListCards}
        </ul>
      </div>
    `;
  }

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
    ${archivedSection}
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory()" title="Ny vara">➕</button>
    </div>
  `;

  // Collapsing toggle
  window.toggleArchivedSection = function(e){
    e.stopPropagation();
    const btn = e.currentTarget;
    const ul = btn.nextElementSibling;
    if(ul.style.display === "none"){ ul.style.display="block"; btn.querySelector("#archived-arrow").textContent = "▲"; }
    else { ul.style.display="none"; btn.querySelector("#archived-arrow").textContent = "▼"; }
  };

  applyFade && applyFade();
};

// Hjälpfunktion: visa lista baserat på namn (eftersom vi sorterar)
window.viewListByName = function(name) {
  const index = lists.findIndex(l => l.name === name);
  if (index >= 0) {
    renderListDetail(index);
  }
};

// Hjälpfunktion: öppna meny baserat på namn
window.openListMenuByName = function(name, buttonElem) {
  const index = lists.findIndex(l => l.name === name);
  if (index >= 0) {
    openListMenu(index, buttonElem);
  }
};

// === Renderar en enskild lista ===
window.renderListDetail = function(i) {
  const list = lists[i];
  let hideDone = true;
  try {
    hideDone = localStorage.getItem("hideDone") !== "false";
  } catch {}

  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

  // Gruppindelning på kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const categoriesWithItems = [];
  const emptyCategories = [];

  Object.entries(grouped).forEach(([cat, items]) => {
    let filteredItems = items;
    if (hideDone) {
      filteredItems = items.filter(x => !x.done);
    }
    if (filteredItems.length > 0) {
      categoriesWithItems.push({ cat, items: filteredItems });
    } else {
      emptyCategories.push({ cat, items: [] });
    }
  });

  // Sortera kategorier enligt standardKategorier-ordning
  categoriesWithItems.sort((a, b) => standardKategorier.indexOf(a.cat) - standardKategorier.indexOf(b.cat));
  emptyCategories.sort((a, b) => standardKategorier.indexOf(a.cat) - standardKategorier.indexOf(b.cat));

  // Slå ihop kategorier: med varor + tomma om hideDone är false
  const finalCategories = hideDone ? categoriesWithItems : [...categoriesWithItems, ...emptyCategories];

  const itemsHTML = finalCategories.map(({ cat, items }) => {
    const sorted = [
      ...items.filter(x => !x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv')),
      ...items.filter(x => x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    ];

    const itemList = sorted.length > 0 ? sorted.map(item => {
      let row1 = item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`;
      let compText = item.note ? `<span class="left">${item.note}</span>` : `<span class="left"></span>`;
      let signDate = (item.done && item.doneBy) ? 
        `<span class="right">${item.doneBy} ${formatDate(item.doneAt)}</span>` : `<span class="right"></span>`;

      return `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
          <span class="item-name">
            <span>${row1}</span>
            <div class="item-row2">
              ${compText}
              ${signDate}
            </div>
          </span>
          <button class="menu-btn" onclick="openItemMenu(${i}, ${item.realIdx}, this)">⋮</button>
        </li>
      `;
    }).join("") : '<p class="empty-category">Inga varor i denna kategori</p>';

    return `
      <div class="category-block">
        <h3 class="category-heading">
          ${cat}
          <button class="category-add-btn" title="Lägg till vara i ${cat}" onclick="addItemViaCategory(${i}, '${cat}')">+</button>
        </h3>
        <ul class="todo-list">${itemList}</ul>
      </div>
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
      <div style="flex:1"></div>
      <label class="hide-done-label" style="margin-left:auto; display:flex; align-items:center;">
        <input type="checkbox" id="hideDoneCheckbox" ${hideDone ? "checked" : ""} style="margin-right:7px;" />
        <span class="hide-done-text">Dölj klara</span>
      </label>
    </div>
    <div class="category-list">
      ${itemsHTML || '<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  const chk = document.getElementById("hideDoneCheckbox");
  if (chk) {
    chk.onchange = function() {
      localStorage.setItem("hideDone", chk.checked ? "true" : "false");
      renderListDetail(i);
    };
  }

  applyFade && applyFade();
};

// Meny för varje lista (inkl. Arkivera/Återställ)
window.openListMenu = function(i, btn) {
  alert('Öppnar meny för lista #' + i);
  closeAnyMenu && closeAnyMenu();
  const menu = document.createElement("div");
  menu.className = "item-menu";
  const list = lists[i];

  menu.innerHTML = `
    <button onclick="renameList(${i})">
      <span style="margin-right:7px;">🖊</span> Byt namn
    </button>
    <button onclick="deleteList(${i})" style="color:#d44;">
      <span style="margin-right:7px;">✖️</span> Ta bort lista
    </button>
    ${
      !list.archived
        ? `<button onclick="archiveList(${i})"><span style="margin-right:7px;">📥</span> Arkivera</button>`
        : `<button onclick="unarchiveList(${i})"><span style="margin-right:7px;">🔄</span> Återställ</button>`
    }
  `;

  document.body.appendChild(menu);
  const rect = btn.getBoundingClientRect();
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 3}px`;
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 170)}px`;

  window.closeAnyMenu = () => {
    if (menu.parentNode) menu.parentNode.removeChild(menu);
    window.closeAnyMenu = null;
  };
  setTimeout(() => {
    document.addEventListener("mousedown", window.closeAnyMenu, { once: true });
  }, 20);
};
// Arkivera lista
window.archiveList = function(i) {
  lists[i].archived = true;
  lists[i].archivedAt = new Date().toISOString();
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};
// Återställ lista
window.unarchiveList = function(i) {
  delete lists[i].archived;
  delete lists[i].archivedAt;
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};

// === Lägg till varor via kategori-knapp (batch) ===
window.addItemViaCategory = function(listIndex, category) {
  const allaVaror = getAllUniqueItemNames(lists);
  const mallVaror = getTemplateItemNames(lists);
  const kategoriVaror = getCategoryItemNames(lists[listIndex], category);

  showAddItemsDialog({
    kategori: category,
    allaVaror,
    mallVaror,
    kategoriVaror,
    onDone: function(added) {
      if (!added || !added.length) return;
      added.forEach(name => {
        if (!lists[listIndex].items.some(item => item.name.trim().toLowerCase() === name.trim().toLowerCase() && (item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)") === category)) {
          lists[listIndex].items.push({ name, note: "", done: false, category });
        }
      });
      saveLists(lists);
      renderListDetail(listIndex);
    }
  });
};

// --- Lägg till varor via plusknapp nere till höger (batch) ---
window.addItemsWithCategory = function(listIndex = null) {
  let i = listIndex;
  if (i === null) {
    if (!lists.length) return;
    let val = prompt("Vilken lista vill du lägga till i?\n" + lists.map((l, idx) => (idx + 1) + ": " + l.name).join("\n"));
    if (!val) return;
    val = parseInt(val, 10) - 1;
    if (isNaN(val) || val < 0 || val >= lists.length) return;
    i = val;
  }
  const allaVaror = getAllUniqueItemNames(lists);
  const mallVaror = getTemplateItemNames(lists);

  showAddItemsDialog({
    allaVaror,
    mallVaror,
    kategoriVaror: [],
    onDone: function(added) {
      if (!added || !added.length) return;
      added.forEach(name => {
        if (!lists[i].items.some(item => item.name.trim().toLowerCase() === name.trim().toLowerCase())) {
          lists[i].items.push({ name, note: "", done: false });
        }
      });
      saveLists(lists);
      renderListDetail(i);
    }
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
