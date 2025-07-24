// lists.js – hanterar inköpslistor och rendering

// === Renderar alla listor ===
window.renderAllLists = function() {
  // Sortera listorna så att mallar hamnar sist
  const sortedLists = [...lists].sort((a, b) => {
    const aIsTemplate = a.name.startsWith("Mall:");
    const bIsTemplate = b.name.startsWith("Mall:");
    if (aIsTemplate && !bIsTemplate) return 1;
    if (!aIsTemplate && bIsTemplate) return -1;
    return a.name.localeCompare(b.name, 'sv');
  });

  const listCards = sortedLists.map((list, i) => {
    const done = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    // Lägg till extra klass om det är en mall-lista
    const extraClass = list.name.startsWith("Mall:") ? "list-card-template" : "";

    // Hitta rätt index (eftersom sortering inte är samma ordning som i lists-arrayen)
    const origIndex = lists.findIndex(l => l.name === list.name);

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
      <button onclick="addItemsWithCategory()" title="Ny vara">➕</button>
    </div>
  `;

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

// === Hjälpfunktion: formatera datum
window.formatDate = function(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = x => String(x).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

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

// --- Funktion för att lägga till varor via kategori-knapp (batch) ---
window.addItemViaCategory = function(listIndex, category) {
  // Hämta alla varunamn i systemet, mallarna och denna kategori
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
        // Undvik att lägga till dubbletter direkt efter varandra
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
  // Standard: lägg till i aktuell lista om vi är i en lista, annars fråga
  let i = listIndex;
  if (i === null) {
    // På startsidan: fråga användaren i vilken lista man vill lägga till
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
        // Undvik att lägga till dubbletter direkt efter varandra
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
if (typeof renderAllLists === "function") {
  renderAllLists();
}

window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};
