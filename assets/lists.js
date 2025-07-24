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
// === Renderar en enskild lista ===
// lists.js – hanterar inköpslistor 
window.renderListDetail = function(i) {
  const list = lists[i];

  // Läs inställning för "dölj klara"
  let hideDone = true;
  try {
    hideDone = localStorage.getItem("hideDone") !== "false";
  } catch {}

  // Förbered items med index
  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

  // Gruppera per kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Bygg HTML per kategori
  const categoriesHTML = Object.entries(grouped).map(([cat, items]) => {
    // Filtrera bort klara om valt
    let filtered = hideDone
      ? items.filter(x => !x.done)
      : items.slice();

    // Sortera: ej klara A–Ö, sedan klara A–Ö
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.name.localeCompare(b.name, 'sv');
    });

    // Om det inte finns några kvar och vi döljer klara → skippa kategorin
    if (filtered.length === 0 && hideDone) return "";

    // Bygg varje rad
    const itemLines = filtered.map(item => {
      const title = item.done
        ? `<s>${item.name}</s>`
        : `<strong>${item.name}</strong>`;

      // Alltid två spans: note och meta
      const noteHTML = `<span class="item-note">${item.note || ""}</span>`;
      const metaText = (item.done && item.doneBy)
        ? `${item.doneBy} ${formatDate(item.doneAt)}`
        : "";
      const metaHTML = `<span class="item-meta">${metaText}</span>`;

      return `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox"
                 ${item.done ? 'checked' : ''}
                 onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
          <div class="item-content">
            <div class="item-line1">${title}</div>
            <div class="item-line2">${noteHTML}${metaHTML}</div>
          </div>
          <button class="menu-btn"
                  onclick="openItemMenu(${i}, ${item.realIdx}, this)">⋮</button>
        </li>`;
    }).join("");

    return `
      <div class="category-block">
        <h3 class="category-heading">${cat}</h3>
        <ul class="todo-list">
          ${itemLines || '<li class="empty-category">Inga varor i denna kategori</li>'}
        </ul>
      </div>`;
  }).join("");

  // Rendera hela vyn
  app.innerHTML = `
    <div class="top-bar">
      <span class="back-arrow"
            onclick="renderAllLists()">&lt;</span>
      <h1 class="back-title">${list.name}</h1>
      <div style="flex:1"></div>
      <label class="hide-done-label">
        <input type="checkbox" id="hideDoneCheckbox" ${hideDone ? 'checked' : ''}/>
        <span class="hide-done-text">Dölj klara</span>
      </label>
    </div>
    <div class="category-list">
      ${categoriesHTML || '<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>`;

  // Lyssna på "dölj klara"-checkbox
  const chk = document.getElementById("hideDoneCheckbox");
  if (chk) {
    chk.onchange = () => {
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
