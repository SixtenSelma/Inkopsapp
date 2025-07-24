// lists.js – hanterar inköpslistor och rendering

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
// lists.js – hanterar inköpslistor och rendering

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
      // Rad 1: Namn, ev. genomstruket om done
      let row1 = item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`;

      // Rad 2: komplettering vänster + signatur + datum höger
      let compText = item.note ? `<em>${item.note}</em>` : "";
      let signDate = (item.done && item.doneBy) ? `<span class="item-sign-date">${item.doneBy} ${formatDate(item.doneAt)}</span>` : "";

      return `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
          <span class="item-name">
            <span>${row1}</span>
            <span class="item-note-sign-wrapper">
              ${compText}
              ${signDate}
            </span>
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
// --- Funktion för att lägga till vara via kategori-knapp ---
window.addItemViaCategory = function(listIndex, category) {
  const allNames = getAllUniqueItemNames(lists);

  function addNewItemWithCheck(itemName) {
    const key = itemName.trim().toLowerCase();
    const prevCat = categoryMemory[key];

    function doAdd(catToUse) {
      lists[listIndex].items.push({ name: itemName, note: "", done: false, category: catToUse });
      categoryMemory[key] = catToUse;
      saveCategoryMemory && saveCategoryMemory(categoryMemory);
      saveLists(lists);
      renderListDetail(listIndex);
    }

    if (prevCat && prevCat !== category) {
      if (confirm(`Varan "${itemName}" är redan kopplad till kategori "${prevCat}". Vill du byta till "${category}"?`)) {
        doAdd(category);
      } else {
        doAdd(prevCat);
      }
    } else {
      doAdd(category);
    }
  }

  showRenameDialog(
    `Lägg till vara i kategori "${category}"`,
    "",
    function(newItemName) {
      if (!newItemName) return;
      addNewItemWithCheck(newItemName);
    },
    allNames
  );
};

// --- Lägg till varor med kategori (batch) ---
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

// === Initiera första renderingen ===
if (typeof renderAllLists === "function") {
  renderAllLists();
}

window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};
