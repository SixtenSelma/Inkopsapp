// lists.js – hanterar inköpslistor och rendering

/**
 * Sätter createdAt/createdBy (vid nytt list‑objekt) och alltid updatedAt/updatedBy.
 * @param {Object} list – det list‑objekt som ska stämplas.
 * @param {boolean} [isNew=false] – true om det är en ny lista.
 */
function stampListTimestamps(list, isNew = false) {
  const now = new Date().toISOString();
  if (isNew) {
    list.createdAt = now;
    list.createdBy = window.user;
  }
  list.updatedAt = now;
  list.updatedBy = window.user;
}

// ===== Initiera data =====
window.lists = loadLists();  // Från storage.js
window.categoryMemory = (() => {
  try { return JSON.parse(localStorage.getItem('categoryMemory')) || {}; }
  catch { return {}; }
})();
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// ===== Hjälpfunktioner =====

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
  return Array.from(names).sort();
};

// Hämta unika varunamn i mall-listor
window.getTemplateItemNames = function(lists) {
  const names = new Set();
  lists.forEach(l => {
    if (!l.name.startsWith('Mall:')) return;
    l.items.forEach(i => i.name && names.add(i.name.trim()));
  });
  return Array.from(names).sort();
};

// Hämta unika varunamn i en kategori för given lista
window.getCategoryItemNames = function(list, category) {
  const names = new Set();
  list.items.forEach(item => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (cat === category && item.name) names.add(item.name.trim());
  });
  return Array.from(names).sort();
};

// Välja kategori via modal med <select>
function chooseCategory(itemName) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.style.backdropFilter = 'blur(3px)';

    const box = document.createElement('div');
    box.className = 'modal-content';
    box.innerHTML = `<h2>Ange kategori för<br><em>${itemName}</em></h2>`;

    const sel = document.createElement('select');
    standardKategorier.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    box.appendChild(sel);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Avbryt';
    btnCancel.className = 'btn-secondary';
    btnCancel.onclick = () => { cleanup(); resolve(null); };

    const btnOk = document.createElement('button');
    btnOk.textContent = 'OK';
    btnOk.onclick = () => { cleanup(); resolve(sel.value); };

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup(){ document.body.removeChild(overlay); }
  });
}

// ===== Dialog: Lägg till varor med unik autocomplete =====
window.showAddItemsDialog = function({ allaVaror, mallVaror, kategoriVaror, onDone, onlyCategory = false }) {
  // 1) Bestäm källan för förslag
  const source = onlyCategory
    ? kategoriVaror
    : [...(allaVaror || []), ...(mallVaror || []), ...(kategoriVaror || [])];

  // 2) Ta bort dubbletter och sortera
  const suggestionSet = new Set(source.filter(Boolean));
  const suggestions   = Array.from(suggestionSet).sort();

  // --- Bygg dialogen ---
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.backdropFilter = 'blur(4px)';

  const box = document.createElement('div');
  box.className = 'modal-content';
  overlay.appendChild(box);

  const title = document.createElement('h2');
  title.textContent = 'Lägg till varor';
  box.appendChild(title);

  // Datalist för autocomplete
  const dl = document.createElement('datalist');
  dl.id = 'add-items-suggestions';
  suggestions.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    dl.appendChild(opt);
  });
  box.appendChild(dl);

  // Input kopplad till datalist
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Varunamn, [komplement]';
  input.setAttribute('list', dl.id);
  box.appendChild(input);

  // Preview‑lista för valda varor
  const preview = document.createElement('ul');
  preview.className = 'add-batch-preview-list';
  box.appendChild(preview);

  let selected = [];
  function renderChips() {
    preview.innerHTML = '';
    selected.forEach((name, idx) => {
      const li = document.createElement('li');
      li.textContent = name;
      const btn = document.createElement('button');
      btn.className = 'remove-btn';
      btn.onclick = () => {
        selected.splice(idx, 1);
        renderChips();
      };
      li.appendChild(btn);
      preview.appendChild(li);
    });
  }

  function addCurrentInput() {
    const raw = input.value.trim();
    if (!raw) return;
    if (!selected.includes(raw)) {
      selected.push(raw);
      renderChips();
    }
    input.value = '';
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCurrentInput();
    }
  });

  // Knappar
  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Avbryt';
  btnCancel.className = 'btn-secondary';
  btnCancel.onclick = cleanup;
  actions.appendChild(btnCancel);

  const btnDone = document.createElement('button');
  btnDone.textContent = 'Klar';
  btnDone.onclick = () => {
    addCurrentInput();   // ta med vad som finns i input
    cleanup();
    onDone(selected);
  };
  actions.appendChild(btnDone);

  box.appendChild(actions);
  document.body.appendChild(overlay);
  input.focus();

  function cleanup() {
    document.body.removeChild(overlay);
  }
};

// ===== Rendera översikt av alla listor =====
window.renderAllLists = function() {
 
  const activeLists   = lists.filter(l => !l.archived);
  const archivedLists = lists.filter(l => l.archived);

  const sortedActive = [...activeLists].sort((a, b) => {
    const aIsTemplate = a.name.startsWith('Mall:');
    const bIsTemplate = b.name.startsWith('Mall:');
    if (aIsTemplate !== bIsTemplate) return aIsTemplate ? 1 : -1;
    return a.name.localeCompare(b.name, 'sv');
  });

  const sortedArchived = [...archivedLists].sort((a, b) =>
    (b.archivedAt || 0) - (a.archivedAt || 0)
  );

  const activeHTML = sortedActive.map(list => {
    const done  = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    const uAt   = list.updatedAt  || list.archivedAt || list.createdAt || null;
    const by     = (list.updatedBy || list.createdBy) || '';
    const tsText = uAt ? formatDate(uAt) : '';

    return `
      <li class="list-item" onclick="viewListByName('${list.name.replace(/'/g, "\\'")}')">
        <div class="list-card ${list.name.startsWith('Mall:') ? 'list-card-template' : ''}">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn"
              onclick="event.stopPropagation(); openListMenuByName('${list.name.replace(/'/g, "\\'")}', this)">
              ⋮
            </button>
          </div>
          <div class="list-card-footer">
            <div class="progress-text">${done} / ${total} klara</div>
            <div class="progress-timestamp">${by} ${tsText}</div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </li>`;
  }).join('') || '<p class="no-lists">Inga listor än.</p>';

  let archivedSection = '';
  if (sortedArchived.length) {
    const archivedHTML = sortedArchived.map(list => {
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

  app.innerHTML = `
    <div class="top-bar">
      <h1 class="back-title" onclick="renderAllLists()">Inköpslistor</h1>
      <button class="icon-button" onclick="changeUser()" title="Byt namn">
        ${user} 🖊
      </button>
    </div>
    <ul class="list-wrapper">
      ${activeHTML}
    </ul>
    ${archivedSection}
    <div class="bottom-bar">
      <button onclick="showNewListDialog()" title="Ny lista">➕</button>
    </div>`;

  window.toggleArchivedSection = function(e) {
    e.stopPropagation();
    const ul = e.currentTarget.nextElementSibling;
    if (ul.style.display === 'none') {
      ul.style.display = 'block';
      e.currentTarget.querySelector('#archived-arrow').textContent = '▲';
    } else {
      ul.style.display = 'none';
      e.currentTarget.querySelector('#archived-arrow').textContent = '▼';
    }
  };

  applyFade && applyFade();
};




// ===== Visa lista via namn =====
window.viewListByName = function(name) {
  const idx = lists.findIndex(l => l.name === name);
  if (idx >= 0) {
    // uppdatera hash så vi kan refresha
    window.location.hash = encodeURIComponent(name);
    renderListDetail(idx);
  }
};


// ===== Öppna meny via namn =====
window.openListMenuByName = function(name, btn) {
  const idx = lists.findIndex(l=>l.name===name);
  if (idx>=0) openListMenu(idx, btn);
};

// ===== Rendera enskild lista (detaljvy) =====
window.renderListDetail = function(i) {
  const list = lists[i];
  let hideDone = localStorage.getItem("hideDone") === "true";
  window.location.hash = encodeURIComponent(list.name);

  // 1) Förbered items med index
  const allItems = list.items.map((it, idx) => ({ ...it, idx }));

  // 2) Gruppera per kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat] = []);
  allItems.forEach(item => {
    const category = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    grouped[category].push(item);
  });

  // 3) Identifiera kategorier med och utan varor
  const catsWithItems = [];
  const catsWithout  = [];
  standardKategorier.forEach(cat => {
    const items = grouped[cat];
    // Visa endast icke-avklarade om hideDone är på
    const visible = hideDone ? items.filter(x => !x.done) : items;
    if (visible.length) catsWithItems.push({ cat, items: visible });
    else catsWithout.push({ cat, items: [] });
  });

  // 4) Sätt finalCats: först kategorier med varor, sedan tomma
  const finalCats = catsWithItems.concat(catsWithout);

  // 5) Bygg HTML för varje kategori + varor
  const categoriesHTML = finalCats.map(({ cat, items }) => {
    // Sortera kvarvarande items: först ej klara, sedan klara, båda alfabetiskt
    const sorted = [
      ...items.filter(x => !x.done).sort((a,b) => a.name.localeCompare(b.name,'sv')),
      ...items.filter(x => x.done).sort((a,b) => a.name.localeCompare(b.name,'sv'))
    ];

    // Skapa list-rader; tom kategori ger bara ett tomt <ul>
    const rows = sorted.map(item => {
      const nameHTML = item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`;
      const noteHTML = item.note ? `<span class="item-note">${item.note}</span>` : "";
      const sigHTML = item.done && item.doneBy
        ? `<span class="item-sign-date">${item.doneBy} ${formatDate(item.doneAt)}</span>`
        : "";
      return `
        <li class="todo-item ${item.done?'done':''}">
          <input
            type="checkbox"
            ${item.done?'checked':''}
            onchange="toggleItem(${i}, ${item.idx}, lists, user, saveAndRenderList)"
          />
          <div class="item-name">
            <div class="item-line1">${nameHTML}</div>
            <div class="item-note-sign-wrapper">
              ${noteHTML}
              ${sigHTML}
            </div>
          </div>
          <button
            class="menu-btn"
            onclick="openItemMenu(${i}, ${item.idx}, this)"
          >⋮</button>
        </li>`;
    }).join('');

    return `
      <div class="category-block">
        <h3 class="category-heading">
          ${cat}
          <button
            class="category-add-btn"
            onclick="addItemViaCategory(${i}, '${cat}')">+</button>
        </h3>
        <ul class="todo-list">${rows}</ul>
      </div>`;
  }).join('');

  // 6) Rendera detaljvyn
  app.innerHTML = `
    <div class="top-bar">
      <span class="back-arrow"
            onclick="window.location.hash=''; renderAllLists()"
            title="Tillbaka">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
             viewBox="0 0 24 24" fill="none" stroke="#232323" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </span>
      <h1 class="back-title">${list.name}</h1>
      <div class="detail-buttons">
        <button id="btnHideDone" class="icon-button" title="Visa/Göm klara">
          ${hideDone ? '☑' : '☐'}
        </button>
        <button id="btnToggleCats" class="icon-button" title="Visa/Göm kategorivy">≡</button>
        <button id="btnRefresh" class="icon-button" title="Uppdatera vy">↻</button>
      </div>
    </div>
    <div class="category-list">
      ${categoriesHTML}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till">➕</button>
      <button onclick="importItemsFromList(${i})" title="Importera">📥</button>
    </div>`;

  // 7) Koppla knapphändelser
  document.getElementById("btnHideDone").onclick = () => {
    hideDone = !hideDone;
    localStorage.setItem("hideDone", hideDone);
    renderListDetail(i);
  };
  let catsHidden = false;
  document.getElementById("btnToggleCats").onclick = () => {
    catsHidden = !catsHidden;
    document.querySelectorAll(".category-heading")
      .forEach(h => h.style.display = catsHidden ? "none" : "");
  };
  document.getElementById("btnRefresh").onclick = () => saveAndRenderList(i);

  applyFade && applyFade();
};


// ===== Lägg till varor via plusknapp =====
// ===== Lägg till via flytande plus-knapp =====
window.addItemsWithCategory = function(listIndex = null) {
  let i = listIndex;
  if (i === null) {
    if (!lists.length) return;
    const promptTxt = "Vilken lista vill du lägga till i?\n" +
      lists.map((l, idx) => (idx+1) + ": " + l.name).join("\n");
    const val = prompt(promptTxt);
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
    onDone: async added => {
      if (!added || !added.length) return;

      for (const raw of added) {
        const [namePart, ...noteParts] = raw.split(',');
        const name = namePart.trim();
        const note = noteParts.join(',').trim();

        // Kolla om samma namn+note redan finns
        const exists = lists[i].items.some(item =>
          item.name.trim().toLowerCase() === name.toLowerCase() &&
          (item.note||'').trim().toLowerCase() === note.toLowerCase()
        );
        if (exists) continue;

        // Hämta eller fråga kategori
        let cat = window.categoryMemory[name];
        if (!cat) {
          cat = await chooseCategory(name)
                 || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
          window.categoryMemory[name] = cat;
          try {
            localStorage.setItem(
              "categoryMemory",
              JSON.stringify(window.categoryMemory)
            );
          } catch {}
        }

        // Lägg till med namn, note och category
        lists[i].items.push({
          name,
          note,
          done: false,
          category: cat
        });
      }

      saveLists(lists);
      renderListDetail(i);
    }
  });
};


// ===== CRUD =====

// Ny lista
// ----- Byt namn på lista -----
window.renameList = function(i) {
  showRenameDialog('Byt namn på lista', lists[i].name, newName => {
    lists[i].name = newName.trim();
    // NYTT: stämpla som uppdaterad
    stampListTimestamps(lists[i]);
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  });
};

// ----- Arkivera lista -----
window.archiveList = function(i) {
  lists[i].archived    = true;
  lists[i].archivedAt  = new Date().toISOString();
  // NYTT: stämpla som uppdaterad
  stampListTimestamps(lists[i]);
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};

// ----- Återställ lista -----
window.unarchiveList = function(i) {
  delete lists[i].archived;
  delete lists[i].archivedAt;
  // NYTT: stämpla som uppdaterad
  stampListTimestamps(lists[i]);
  saveLists(lists);
  renderAllLists();
  closeAnyMenu && closeAnyMenu();
};

// ----- Spara & rendera en lista (t.ex. vid bockning) -----
window.saveAndRenderList = function(i) {
  // NYTT: stämpla varje gång vi sparar
  stampListTimestamps(lists[i]);
  saveLists(lists);
  renderListDetail(i);
};

// Ta bort lista
window.deleteList = function(i) {
  if (confirm('Vill du ta bort listan permanent?')) {
    lists.splice(i,1);
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  }
};

// Init: visa antingen detaljvy eller översikt beroende på URL-hash
window.addEventListener('load', () => {
  const name = decodeURIComponent(window.location.hash.slice(1));
  const idx  = lists.findIndex(l => l.name === name);
  if (idx >= 0) {
    renderListDetail(idx);
  } else {
    renderAllLists();
  }
});

/**
 * Importerar valda varor från en annan lista.
 * Visar kategorier i samma ordning som i detaljvyn:
 * först de i standardKategorier, sedan resten alfabetiskt.
 *
 * @param {number} targetIndex – index på den lista vi är i
 */
window.importItemsFromList = async function(targetIndex) {
  // 1) Välj källa-lista
  const srcIdx = await chooseSourceList(targetIndex);
  if (srcIdx == null) return;
  const srcList = lists[srcIdx];

  // 2) Gruppera per kategori, spara globalt index
  const grouped = {};
  srcList.items.forEach((item, globalIdx) => {
    const cat = item.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ item, globalIdx });
  });

  // 3) Skapa en array med alla kategorinamn, sorterade
  const allCats = Object.keys(grouped);
  allCats.sort((a, b) => {
    const aIdx = standardKategorier.indexOf(a);
    const bIdx = standardKategorier.indexOf(b);
    const aIsStd = aIdx !== -1;
    const bIsStd = bIdx !== -1;

    // Om båda är standard, jämför deras index
    if (aIsStd && bIsStd) return aIdx - bIdx;
    // Om bara a är standard → a först
    if (aIsStd) return -1;
    // Om bara b är standard → b först
    if (bIsStd) return 1;
    // Annars, båda icke-standard → svensk alfabetisk
    return a.localeCompare(b, 'sv');
  });

  // 4) Bygg modal-overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal import-modal';
  overlay.style.backdropFilter = 'blur(4px)';
  document.body.appendChild(overlay);

  const box = document.createElement('div');
  box.className = 'modal-content';
  box.innerHTML = `<h2>Importera varor från <em>${srcList.name}</em></h2>`;
  overlay.appendChild(box);

  // 5) Container för listan
  const listContainer = document.createElement('div');
  listContainer.className = 'import-list';
  box.appendChild(listContainer);

  // 6) Rendera varje kategori i rätt ordning
  allCats.forEach(cat => {
    const entries = grouped[cat];
    if (!entries || entries.length === 0) return;

    // Rubrik
    const catHead = document.createElement('div');
    catHead.className = 'import-category';
    catHead.textContent = cat;
    listContainer.appendChild(catHead);

    // Rader
    entries.forEach(({ item, globalIdx }) => {
      const row = document.createElement('label');
      row.className = 'import-row';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.dataset.globalIdx = globalIdx;
      row.appendChild(chk);

      const txt = document.createElement('span');
      txt.textContent = item.note
        ? `${item.name} (${item.note})`
        : item.name;
      row.appendChild(txt);

      listContainer.appendChild(row);
    });
  });

  // 7) Knappar
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  box.appendChild(actions);

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Avbryt';
  btnCancel.className = 'btn-secondary';
  btnCancel.onclick = () => overlay.remove();
  actions.appendChild(btnCancel);

  const btnImport = document.createElement('button');
  btnImport.textContent = 'Importera';
  btnImport.onclick = () => {
    listContainer
      .querySelectorAll('input[type=checkbox]:checked')
      .forEach(chk => {
        const gIdx = parseInt(chk.dataset.globalIdx, 10);
        const srcItem = srcList.items[gIdx];
        const exists = lists[targetIndex].items.some(it =>
          it.name === srcItem.name &&
          (it.note||'') === (srcItem.note||'')
        );
        if (!exists) {
          lists[targetIndex].items.push({
            name:     srcItem.name,
            note:     srcItem.note || '',
            done:     false,
            category: srcItem.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)'
          });
        }
      });
    saveLists(lists);
    renderListDetail(targetIndex);
    overlay.remove();
  };
  actions.appendChild(btnImport);
};


/**
 * Öppnar en modal där du väljer källa‑lista att importera från.
 * Du kan inte välja den lista du redan står i (targetIndex).
 * Visar Mall:-listor först, sedan övriga sorterade med senast ändrat överst
 * (arkiverade med archivedAt, aktiva behandlas som just nu).
 *
 * @param {number} targetIndex – index på den lista vi är i
 * @returns {Promise<number|null>} – valt list‑index eller null
 */
function chooseSourceList(targetIndex) {
  return new Promise(resolve => {
    const cutoff = Date.now() - 30*24*60*60*1000;

    // Samla kandidater och filtrera bort mål-listan + för gamla arkiverade
    const candidates = lists
      .map((l, idx) => ({ idx, name: l.name, archivedAt: l.archivedAt }))
      .filter(c =>
        c.idx !== targetIndex &&
        (!c.archivedAt || new Date(c.archivedAt).getTime() >= cutoff)
      )
      .sort((a, b) => {
        // 1) Mall:-listor först
        const aMall = a.name.startsWith("Mall:");
        const bMall = b.name.startsWith("Mall:");
        if (aMall !== bMall) return aMall ? -1 : 1;
        // 2) Senast ändrat överst: aktiva = Date.now(), arkiverade = archivedAt
        const aTime = a.archivedAt
          ? new Date(a.archivedAt).getTime()
          : Date.now();
        const bTime = b.archivedAt
          ? new Date(b.archivedAt).getTime()
          : Date.now();
        return bTime - aTime;
      });

    if (candidates.length === 0) {
      alert("Inga listor tillgängliga att importera från.");
      return resolve(null);
    }

    // Bygg modal
    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.style.backdropFilter = "blur(4px)";

    const box = document.createElement("div");
    box.className = "modal-content";
    box.innerHTML = `<h2>Välj lista att importera från</h2>`;
    overlay.appendChild(box);

    const sel = document.createElement("select");
    sel.style.width = "100%";
    sel.style.margin = "12px 0";
    candidates.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.idx;
      const label = c.archivedAt
        ? `${c.name} (arkiverad ${formatDate(c.archivedAt)})`
        : c.name;
      opt.textContent = label;
      sel.appendChild(opt);
    });
    box.appendChild(sel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const btnCancel = document.createElement("button");
    btnCancel.textContent = "Avbryt";
    btnCancel.className = "btn-secondary";
    btnCancel.onclick = () => cleanup(null);
    actions.appendChild(btnCancel);

    const btnOk = document.createElement("button");
    btnOk.textContent = "OK";
    btnOk.onclick = () => cleanup(parseInt(sel.value, 10));
    actions.appendChild(btnOk);

    box.appendChild(actions);
    document.body.appendChild(overlay);

    function cleanup(result) {
      document.body.removeChild(overlay);
      resolve(result);
    }
  });
}



