// lists.js – hanterar inköpslistor och rendering

window.lists = loadLists(); // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// ============================ Hjälpfunktioner ============================

// Formatera ISO-datum till dd/MM hh:mm
window.formatDate = function(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = x => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Hämta unika varunamn i alla listor
window.getAllUniqueItemNames = function(lists) {
  const names = new Set();
  lists.forEach(l => l.items.forEach(i => i.name && names.add(i.name.trim())));
  return [...names].sort();
};

// Hämta mall-varor
window.getTemplateItemNames = function(lists) {
  const names = new Set();
  lists.forEach(l => {
    if (!l.name.startsWith('Mall:')) return;
    l.items.forEach(i => i.name && names.add(i.name.trim()));
  });
  return [...names].sort();
};

// Hämta kategori-specifika varor
window.getCategoryItemNames = function(list, category) {
  const names = new Set();
  list.items.forEach(item => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (cat === category && item.name) names.add(item.name.trim());
  });
  return [...names].sort();
};

// ============================ Rendera alla listor ============================

window.renderAllLists = function() {
  const active = lists.filter(l => !l.archived);
  const archived = lists.filter(l => l.archived);

  // Sortera aktiva (mallar sist)
  const sortedActive = [...active].sort((a,b) => {
    const aT = a.name.startsWith('Mall:'), bT = b.name.startsWith('Mall:');
    if (aT !== bT) return aT ? 1 : -1;
    return a.name.localeCompare(b.name, 'sv');
  });

  // Sortera arkiverade (sist in först)
  const sortedArchived = [...archived].sort((a,b) => (b.archivedAt||0)-(a.archivedAt||0));

  // Bygg aktiva kort
  const activeHTML = sortedActive.map(list => {
    const done = list.items.filter(i=>i.done).length;
    const total = list.items.length;
    const pct = total ? Math.round(done/total*100) : 0;
    const extra = list.name.startsWith('Mall:') ? 'list-card-template' : '';
    return `
      <li class="list-item" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
        <div class="list-card ${extra}">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">⋮</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join('') || '<p class="no-lists">Inga listor än.</p>';

  // Bygg arkiverade kort (samma struktur som aktiva, med "Arkiverad")
  let archivedSection = '';
  if (sortedArchived.length) {
    const archivedHTML = sortedArchived.map(list => {
      // Se till att dateTxt alltid finns
      const dateTxt = list.archivedAt ? formatDate(list.archivedAt) : '';
      return `
        <li class="list-item archived" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
          <div class="list-card archived-list-card">
            <div class="list-card-header">
              <span class="list-card-title">${list.name}</span>
              <button class="menu-btn"
                      onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">
                ⋮
              </button>
            </div>
            <div class="progress-text">Arkiverad: ${dateTxt}</div>
          </div>
        </li>`;
    }).join('');

    archivedSection = `
      <div class="archived-section">
        <button class="archived-toggle" onclick="toggleArchivedSection(event)">
          <span id="archived-arrow">▼</span> Arkiverade listor (${sortedArchived.length})
        </button>
        <ul class="list-wrapper archived-lists" style="display:none;">
          ${archivedHTML}
        </ul>
      </div>`;
  }

  // Sätt HTML
  app.innerHTML = `
    <div class="top-bar">
      <h1>Inköpslista</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">🖊</button>
      </div>
    </div>
    <ul class="list-wrapper">
      ${activeHTML}
    </ul>
    ${archivedSection}
    <div class="bottom-bar">
      <button onclick="showNewListDialog()" title="Ny lista">➕</button>
    </div>
  `;

  // Arkiverade toggle
  window.toggleArchivedSection = function(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const ul = btn.nextElementSibling;
    if (ul.style.display==='none') { ul.style.display='block'; btn.querySelector('#archived-arrow').textContent='▲'; }
    else { ul.style.display='none'; btn.querySelector('#archived-arrow').textContent='▼'; }
  };

  applyFade && applyFade();
};

// Visa en lista baserat på namn
window.viewListByName = function(name) {
  const idx = lists.findIndex(l=>l.name===name);
  if (idx>=0) renderListDetail(idx);
};

// Öppna meny för lista baserat på namn
window.openListMenuByName = function(name, btn) {
  const idx = lists.findIndex(l=>l.name===name);
  if (idx>=0) openListMenu(idx, btn);
};

// ============================ Rendera en lista ============================
window.renderListDetail = function(i) {
  const list = lists[i];
  // Vilka varor ska visas?
  let hideDone = localStorage.getItem('hideDone') !== 'false';

  // Bygg upp items med index
  const allItems = list.items.map((item, idx) => ({ ...item, idx }));

  // Gruppindelning på kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Dela i fyllda/tomma kategorier
  const filled = [], empty = [];
  Object.entries(grouped).forEach(([cat, items]) => {
    const visItems = hideDone ? items.filter(x => !x.done) : items;
    if (visItems.length) filled.push({ cat, items: visItems });
    else empty.push({ cat, items: [] });
  });
  const finalCats = hideDone ? filled : [...filled, ...empty];
  finalCats.sort((a, b) => standardKategorier.indexOf(a.cat) - standardKategorier.indexOf(b.cat));

  // Generera HTML för varje kategori
  const categoriesHTML = finalCats.map(({ cat, items }) => {
    const sortedItems = [
      ...items.filter(x => !x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv')),
      ...items.filter(x => x.done).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    ];
    const rows = sortedItems.length
      ? sortedItems.map(item => {
          const label = item.done
            ? `<s>${item.name}</s>`
            : `<strong>${item.name}</strong>`;
          const note  = item.note
            ? `<span class="left">${item.note}</span>`
            : `<span class="left"></span>`;
          const sig   = (item.done && item.doneBy)
            ? `<span class="right">${item.doneBy} ${formatDate(item.doneAt)}</span>`
            : `<span class="right"></span>`;
          return `
            <li class="todo-item ${item.done ? 'done' : ''}">
              <input type="checkbox"
                     ${item.done ? 'checked' : ''}
                     onchange="toggleItem(${i},${item.idx},lists,user,saveAndRenderList)" />
              <span class="item-name">
                ${label}
                <div class="item-row2">${note}${sig}</div>
              </span>
              <button class="menu-btn" onclick="openItemMenu(${i}, ${item.idx}, this)">⋮</button>
            </li>`;
        }).join('')
      : `<p class="empty-category">Inga varor i denna kategori</p>`;

    return `
      <div class="category-block">
        <h3 class="category-heading">
          ${cat}
          <button class="category-add-btn"
                  title="Lägg till vara i ${cat}"
                  onclick="addItemViaCategory(${i}, '${cat}')">+</button>
        </h3>
        <ul class="todo-list">${rows}</ul>
      </div>`;
  }).join('');

  // Sätt all HTML
  app.innerHTML = `
    <div class="top-bar">
      <h1 class="back-title" onclick="renderAllLists()" style="cursor:pointer; margin:0;">
        &lt; ${list.name}
      </h1>
      <div style="flex:1"></div>
      <label class="hide-done-label" style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox"
               id="hideDoneCheckbox"
               ${hideDone ? 'checked' : ''} />
        <span class="hide-done-text">Dölj klara</span>
      </label>
    </div>
    <div class="category-list">
      ${categoriesHTML || '<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  // Koppla checkbox­händelse
  const chk = document.getElementById('hideDoneCheckbox');
  if (chk) {
    chk.onchange = () => {
      localStorage.setItem('hideDone', chk.checked ? 'true' : 'false');
      renderListDetail(i);
    };
  }

  // Fade‑in‑animation
  applyFade && applyFade();
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

// === Initiera första renderingen ===
if (typeof renderAllLists === "function") {
  renderAllLists();
}

// Spara och rendera en lista (används t.ex. när man bockar för något)
window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};
