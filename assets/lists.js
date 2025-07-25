// lists.js – hanterar inköpslistor och rendering

// Initiera data
window.lists = loadLists();                  // Från storage.js
window.categoryMemory = loadCategoryMemory(); // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// Hjälpfunktion: Formatera ISO-datum till dd/MM hh:mm
window.formatDate = function(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = x => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Hjälpfunktion: Hämta unika varunamn i alla listor
window.getAllUniqueItemNames = function(lists) {
  const names = new Set();
  lists.forEach(l => l.items.forEach(i => i.name && names.add(i.name.trim())));
  return Array.from(names).sort();
};

// Hjälpfunktion: Hämta unika varunamn i mall-listor
window.getTemplateItemNames = function(lists) {
  const names = new Set();
  lists.forEach(l => {
    if (!l.name.startsWith('Mall:')) return;
    l.items.forEach(i => i.name && names.add(i.name.trim()));
  });
  return Array.from(names).sort();
};

// Hjälpfunktion: Hämta unika varunamn i en kategori för given lista
window.getCategoryItemNames = function(list, category) {
  const names = new Set();
  list.items.forEach(item => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (cat === category && item.name) names.add(item.name.trim());
  });
  return Array.from(names).sort();
};

// === Rendera översikt av alla listor ===
window.renderAllLists = function() {
  // Dela i aktiva och arkiverade
  const activeLists = lists.filter(l => !l.archived);
  const archivedLists = lists.filter(l => l.archived);

  // Sortera aktiva: mallar sist
  const sortedActive = [...activeLists].sort((a, b) => {
    const tA = a.name.startsWith('Mall:'), tB = b.name.startsWith('Mall:');
    if (tA !== tB) return tA ? 1 : -1;
    return a.name.localeCompare(b.name, 'sv');
  });

  // Sortera arkiverade: senaste först
  const sortedArchived = [...archivedLists].sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));

  // Bygg HTML för aktiva kort
  const activeHTML = sortedActive.map(list => {
    const done = list.items.filter(i => i.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const extraClass = list.name.startsWith('Mall:') ? 'list-card-template' : '';
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
  }).join('') || '<p class="no-lists">Inga listor än.</p>';

  // Bygg HTML för arkiverade kort
  let archivedSection = '';
  if (sortedArchived.length) {
    const archivedHTML = sortedArchived.map(list => {
      const dateTxt = list.archivedAt ? formatDate(list.archivedAt) : '';
      return `
        <li class="list-item archived" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
          <div class="list-card archived-list-card">
            <div class="list-card-header">
              <span class="list-card-title">${list.name}</span>
              <button class="menu-btn" onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">⋮</button>
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

  // Sätt hela översikten
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

  // Toggle arkiverade
  window.toggleArchivedSection = function(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const ul = btn.nextElementSibling;
    if (ul.style.display === 'none') {
      ul.style.display = 'block'; btn.querySelector('#archived-arrow').textContent = '▲';
    } else {
      ul.style.display = 'none';  btn.querySelector('#archived-arrow').textContent = '▼';
    }
  };

  // Animation
  applyFade && applyFade();
};

// Visa lista med namn
window.viewListByName = function(name) {
  const idx = lists.findIndex(l => l.name === name);
  if (idx >= 0) renderListDetail(idx);
};

// Öppna meny med namn
window.openListMenuByName = function(name, btn) {
  const idx = lists.findIndex(l => l.name === name);
  if (idx >= 0) openListMenu(idx, btn);
};

// === Rendera enskild lista ===
window.renderListDetail = function(i) {
  const list = lists[i];
  let hideDone = true;
  try { hideDone = localStorage.getItem('hideDone') !== 'false'; } catch {}

  const allItems = list.items.map((item, idx) => ({ ...item, idx }));

  // Gruppindelning
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Fyllda vs tomma
  const filled = [], empty = [];
  Object.entries(grouped).forEach(([cat, items]) => {
    const vis = hideDone ? items.filter(x => !x.done) : items;
    (vis.length ? filled : empty).push({ cat, items: vis });
  });
  const finalCats = hideDone ? filled : [...filled, ...empty];
  finalCats.sort((a, b) => standardKategorier.indexOf(a.cat) - standardKategorier.indexOf(b.cat));

  // Generera kategori‑HTML
  const categoriesHTML = finalCats.map(({ cat, items }) => {
    const sorted = [
      ...items.filter(x => !x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv')),
      ...items.filter(x => x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv'))
    ];
    const rows = sorted.length ? sorted.map(item => {
      const text = item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`;
      const note = item.note ? `<span class="left">${item.note}</span>` : `<span class="left"></span>`;
      const sig  = (item.done && item.doneBy) ? `<span class="right">${item.doneBy} ${formatDate(item.doneAt)}</span>` : `<span class="right"></span>`;
      return `
        <li class="todo-item ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.idx}, lists, user, saveAndRenderList)" />
          <span class="item-name">
            ${text}
            <div class="item-row2">${note}${sig}</div>
          </span>
          <button class="menu-btn" onclick="openItemMenu(${i}, ${item.idx}, this)">⋮</button>
        </li>`;
    }).join('') : '<p class="empty-category">Inga varor i denna kategori</p>';
    return `
      <div class="category-block">
        <h3 class="category-heading">
          ${cat}
          <button class="category-add-btn" title="Lägg till vara i ${cat}" onclick="addItemViaCategory(${i}, '${cat}')">+</button>
        </h3>
        <ul class="todo-list">${rows}</ul>
      </div>`;
  }).join('') || '<p>Inga varor än.</p>';

  // Sätt vy
  app.innerHTML = `
    <div class="top-bar">
      <span class="back-arrow" onclick="renderAllLists()" style="margin-right:10px; cursor:pointer; display:flex; align-items:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#232323" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </span>
      <h1 class="back-title" style="font-size:1.45em; font-weight:700; margin:0;">${list.name}</h1>
      <div style="flex:1"></div>
      <label class="hide-done-label" style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox" id="hideDoneCheckbox" ${hideDone ? 'checked' : ''} style="margin-right:7px;" />
        <span class="hide-done-text">Dölj klara</span>
      </label>
    </div>
    <div class="category-list">
      ${categoriesHTML}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  // Koppla checkbox
  const chk = document.getElementById('hideDoneCheckbox');
  if (chk) chk.onchange = () => { localStorage.setItem('hideDone', chk.checked ? 'true' : 'false'); renderListDetail(i); };

  // Fade
  applyFade && applyFade();
};

// === Batch-lägg till via kategori ===
window.addItemViaCategory = function(listIndex, category) {
  const allaVaror = getAllUniqueItemNames(lists);
  const mallVaror = getTemplateItemNames(lists);
  const kategoriVaror = getCategoryItemNames(lists[listIndex], category);
  showAddItemsDialog({ kategori: category, allaVaror, mallVaror, kategoriVaror, onDone: added => {
    if (!added || !added.length) return;
    added.forEach(name => {
      if (!lists[listIndex].items.some(i=>i.name.trim().toLowerCase()===name.trim().toLowerCase() && (i.category||'🏠 Övrigt (Hem, Teknik, Kläder, Säsong)')===category)) {
        lists[listIndex].items.push({ name, note: '', done: false, category });
      }
    });
    saveLists(lists);
    renderListDetail(listIndex);
  }});
};

// === Batch-lägg till via plusknapp ===
/**
 * Visar en enkel modal med en <select> av standardKategorier,
 * låter användaren välja och returnerar ett Promise som löser till valt värde.
 */
function chooseCategory(itemName) {
  return new Promise(resolve => {
    // Skapa bakgrund
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.style.backdropFilter = 'blur(3px)';
    // Skapa innehåll
    const box = document.createElement('div');
    box.className = 'modal-content';
    box.innerHTML = `<h2>Ange kategori för<br><em>${itemName}</em></h2>`;
    // Skapa select
    const sel = document.createElement('select');
    standardKategorier.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    // OK‑knapp
    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.onclick = () => {
      cleanup();
      resolve(sel.value);
    };
    // Avbryt‑knapp
    const cancel = document.createElement('button');
    cancel.textContent = 'Avbryt';
    cancel.className = 'btn-secondary';
    cancel.onclick = () => {
      cleanup();
      resolve(null);
    };
    // Lägg in i box
    box.appendChild(sel);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup() {
      document.body.removeChild(overlay);
    }
  });
}

// === Uppdaterad addItemsWithCategory ===
// === Lägg till varor via plusknapp nere till höger (batch) ===
window.addItemsWithCategory = function(listIndex = null) {
  let i = listIndex;
  if (i === null) {
    if (!lists.length) return;
    let val = prompt(
      "Vilken lista vill du lägga till i?\n" +
      lists.map((l, idx) => (idx + 1) + ": " + l.name).join("\n")
    );
    if (!val) return;
    i = parseInt(val, 10) - 1;
    if (isNaN(i) || i < 0 || i >= lists.length) return;
  }

  const allaVaror = getAllUniqueItemNames(lists);
  const mallVaror = getTemplateItemNames(lists);

  showAddItemsDialog({
    allaVaror,
    mallVaror,
    kategoriVaror: [],
    onDone: async function(added) {
      if (!added || !added.length) return;
      window.categoryMemory = window.categoryMemory || {};

      for (const raw of added) {
        // Dela på kommatecken: före = namn, efter = komplementtext
        const parts = raw.split(',');
        const name = parts.shift().trim();
        const note = parts.join(',').trim();

        // Hoppa om redan finns i listan
        if (lists[i].items.some(item => item.name.trim().toLowerCase() === name.toLowerCase())) {
          continue;
        }

        // Kategori från memory eller fråga via combobox
        let cat = window.categoryMemory[name];
        if (!cat) {
          cat = await chooseCategory(name) || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
          window.categoryMemory[name] = cat;
          try {
            localStorage.setItem("categoryMemory", JSON.stringify(window.categoryMemory));
          } catch {}
        }

        // Lägg till med både name, note och category
        lists[i].items.push({
          name,
          note,    // komplementtext
          done: false,
          category: cat
        });
      }

      saveLists(lists);
      renderListDetail(i);
    }
  });
};



// === Ny lista ===
window.showNewListDialog = function() {
  showNewListModal(listName => {
    lists.push({ name: listName, items: [] });
    saveLists(lists);
    renderAllLists();
  });
};

// === Byt namn på lista ===
window.renameList = function(i) {
  showRenameDialog('Byt namn på lista', lists[i].name, newName => {
    lists[i].name = newName;
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  });
};

// === Ta bort lista ===
window.deleteList = function(i) {
  if (confirm('Vill du ta bort listan permanent?')) {
    lists.splice(i, 1);
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  }
};

// === Arkivera / Återställ lista ===
window.archiveList = function(i) {
  lists[i].archived = true;
  lists[i].archivedAt = new Date().toISOString();
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};
window.unarchiveList = function(i) {
  delete lists[i].archived;
  delete lists[i].archivedAt;
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};

// === Spara och rendera en lista ===
window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};

// Init
if (typeof renderAllLists === 'function') renderAllLists();
