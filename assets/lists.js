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


// ===== Toggle‐funktion för checkboxar på varuposter =====
function toggleItem(listIndex, itemIndex, lists, user, callback) {
  const list = lists[listIndex];
  const item = list.items[itemIndex];
  // växla done‐status
  item.done = !item.done;
  item.doneBy = user;
  item.doneAt = new Date().toISOString();

  // stämpla om listan
  stampListTimestamps(list);
  saveLists(lists);

  // rendera om
  callback(listIndex);
}

// ===== Initiera data =====
window.lists = loadLists();                   // Läs in alla listor
window.categoryMemory = loadCategoryMemory();  // Läs in befintligt kategori‑minne

// Hjälp‑funktion för att få helt konsekventa keys
function normalizeKey(str) {
  return str.trim()
            .toLowerCase()
            .normalize();      // NFC‑normalisering för åäö m.m.
}

// Seeda minnet med alla redan sparade kategorier
window.lists.forEach(list => {
  list.items.forEach(item => {
    if (item.category) {
      const k = normalizeKey(item.name);
      if (!window.categoryMemory[k]) {
        window.categoryMemory[k] = item.category;
      }
    }
  });
});
// Spara det seedade minnet
window.saveCategoryMemory(window.categoryMemory);

// Sätt användare
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
    const cat = item.category || '🏠 Övrigt';
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


// ===== Rendera översikt av alla listor =====
window.renderAllLists = function() {
  const activeLists   = lists.filter(l => !l.archived);
  const archivedLists = lists.filter(l => l.archived);

  // Sortera aktiva listor: templates sist, därefter efter senaste uppdatering (nyast först)
  const sortedActive = [...activeLists].sort((a, b) => {
    const aIsTemplate = a.name.startsWith('Mall:');
    const bIsTemplate = b.name.startsWith('Mall:');
    if (aIsTemplate !== bIsTemplate) {
      return aIsTemplate ? 1 : -1;
    }
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });

  // Sortera arkiverade listor: senast arkiverade först
  const sortedArchived = [...archivedLists].sort((a, b) =>
    (b.archivedAt || 0) - (a.archivedAt || 0)
  );

  // Bygg HTML för aktiva listor
  const activeHTML = sortedActive.map(list => {
    const done  = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    const uAt   = list.updatedAt || list.createdAt || list.archivedAt || null;
    const by    = list.updatedBy || list.createdBy || '';
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

  // Bygg HTML för arkiverade listor
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
            <div class="progress-text">Arkiverad:${dateTxt}</div>
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

  // Rendera hela vyn
  app.innerHTML = `
    <div class="top-bar">
      <h1 class="back-title" onclick="renderAllLists()">Inköpslistor</h1>
      <button class="icon-button" onclick="changeUser()" title="Byt namn">
        ${window.user} 🖊
      </button>
    </div>
    <ul class="list-wrapper">
      ${activeHTML}
    </ul>
    ${archivedSection}
    <div class="bottom-bar">
      <button onclick="newList()" title="Ny lista">➕</button>
    </div>`;

  // Gör arkivsektionen kollapsbar
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
  let hideDone      = localStorage.getItem("hideDone") === "true";
  // Om list.hideCategories är satt → tvinga komprimerat läge
  let compressedMode = list.hideCategories || localStorage.getItem("compressedMode") === "true";
  window.location.hash = encodeURIComponent(list.name);

  
// ===== Top‑bar HTML =====
function topBarHtml() {
  return `
    <div class="top-bar">
      <span class="back-arrow"
            onclick="window.location.hash=''; renderAllLists()"
            title="Tillbaka">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
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
        ${!list.hideCategories 
          ? `<button id="btnToggleCats" class="icon-button" title="Komprimerat läge">≡</button>`
          : ''
        }
       <!-- Import‑knapp med SVG -->
        <button class="icon-button import-button" title="Importera från lista"
                onclick="importItemsFromList(${i})">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
               viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    </div>`;
}


  // ===== Innehåll för komprimerat läge =====
  function compressedHtml() {
    let incomplete = list.items.filter(item => !item.done);
    let complete   = list.items.filter(item => item.done);
    if (hideDone) complete = [];
    const cmp = (a, b) => a.name.localeCompare(b.name, 'sv');
    incomplete.sort(cmp);
    complete.sort(cmp);
    const items = [...incomplete, ...complete];

    const rows = items.map(item => {
      const idx = list.items.indexOf(item);
      const nameHTML = item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`;
      const noteHTML = item.note ? `<span class="item-note">${item.note}</span>` : "";
      const sigHTML  = item.done && item.doneBy
        ? `<span class="item-sign-date">${item.doneBy} ${formatDate(item.doneAt)}</span>`
        : "";
      return `
        <li class="todo-item ${item.done?'done':''}">
          <input type="checkbox" ${item.done?'checked':''}
                 onchange="toggleItem(${i}, ${idx}, lists, user, saveAndRenderList)" />
          <div class="item-name">
            <div class="item-line1">${nameHTML}</div>
            <div class="item-note-sign-wrapper">${noteHTML}${sigHTML}</div>
          </div>
          <button class="menu-btn" onclick="openItemMenu(${i}, ${idx}, this)">⋮</button>
        </li>`;
    }).join('');

    return `
      ${topBarHtml()}
      <ul class="todo-list">${rows}</ul>
      <div class="bottom-bar">
        <button onclick="addItemsWithCategory(${i})" title="Lägg till">➕</button>
      </div>`;
  }

  // ===== Innehåll för kategoriview =====
  function categoryHtml() {
    const allItems = list.items.map((it, idx) => ({ ...it, idx }));
    const grouped  = {};
    standardKategorier.forEach(cat => grouped[cat] = []);
    allItems.forEach(item => {
      const cat = item.category || "🏠 Övrigt";
      grouped[cat].push(item);
    });

    const catsWithItems = [], catsWithout = [];
    standardKategorier.forEach(cat => {
      const src = grouped[cat];
      const vis = hideDone ? src.filter(x => !x.done) : src;
      if (vis.length) catsWithItems.push({ cat, items: vis });
      else catsWithout.push({ cat, items: [] });
    });
    const finalCats = catsWithItems.concat(catsWithout);

    const categoriesHTML = finalCats.map(({ cat, items }) => {
      const sorted = [
        ...items.filter(x => !x.done).sort((a,b) => a.name.localeCompare(b.name,'sv')),
        ...items.filter(x => x.done).sort((a,b) => a.name.localeCompare(b.name,'sv'))
      ];
      const rows = sorted.map(item => {
        return `
          <li class="todo-item ${item.done?'done':''}">
            <input type="checkbox" ${item.done?'checked':''}
                   onchange="toggleItem(${i}, ${item.idx}, lists, user, saveAndRenderList)" />
            <div class="item-name">
              <div class="item-line1">
                ${item.done?`<s>${item.name}</s>`:`<strong>${item.name}</strong>`}
              </div>
              <div class="item-note-sign-wrapper">
                ${item.note?`<span class="item-note">${item.note}</span>`:""}
                ${item.done && item.doneBy
                  ? `<span class="item-sign-date">${item.doneBy} ${formatDate(item.doneAt)}</span>`
                  : ""}
              </div>
            </div>
            <button class="menu-btn" onclick="openItemMenu(${i}, ${item.idx}, this)">⋮</button>
          </li>`;
      }).join('');
      return `
        <div class="category-block">
          <h3 class="category-heading">
            ${cat}
            <button class="category-add-btn" onclick="addItemViaCategory(${i}, '${cat}')">+</button>
          </h3>
          <ul class="todo-list">${rows}</ul>
        </div>`;
    }).join('');

    return `
      ${topBarHtml()}
      <div class="category-list">${categoriesHTML}</div>
      <div class="bottom-bar">
        <button onclick="addItemsWithCategory(${i})" title="Lägg till">➕</button>
      </div>`;
  }

  // ===== Rendera rätt vy =====
  app.innerHTML = compressedMode ? compressedHtml() : categoryHtml();

  // ===== Knapplogik =====
  document.getElementById("btnHideDone").onclick = () => {
    hideDone = !hideDone;
    localStorage.setItem("hideDone", hideDone);
    renderListDetail(i);
  };
  if (!list.hideCategories) {
    document.getElementById("btnToggleCats").onclick = () => {
      let mode = localStorage.getItem("compressedMode") === "true";
      compressedMode = !mode;
      localStorage.setItem("compressedMode", compressedMode);
      renderListDetail(i);
    };
  }

  applyFade && applyFade();
};



// ===== Ny inköpslista via modal‑dialog =====
window.newList = function() {
  window.showListSettingsDialog(
    'Skapa ny inköpslista',
    '',
    false,
    (name, hideCats) => {
      const newList = {
        name: name.trim(),
        items: [],
        hideCategories: hideCats
      };
      stampListTimestamps(newList, true);
      lists.push(newList);
      saveLists(lists);
      renderAllLists();
    }
  );
};

window.renameList = function(i) {
  const list = lists[i];
  window.showListSettingsDialog(
    'Byt namn på lista',
    list.name,
    list.hideCategories||false,
    (newName, hideCats) => {
      list.name = newName.trim();
      list.hideCategories = hideCats;
      stampListTimestamps(list);
      saveLists(lists);
      renderAllLists();
      closeAnyMenu && closeAnyMenu();
    }
  );
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

window.importItemsFromList = async function(targetIndex) {
  // 1) Välj källa‑lista
  const srcIdx = await chooseSourceList(targetIndex);
  if (srcIdx == null) return;
  const srcList = lists[srcIdx];

  // 2) Grupp & sortera per kategori
  const grouped = srcList.items.reduce((acc, item, idx) => {
    const cat = item.category || 'Övrigt';
    (acc[cat] = acc[cat] || []).push({ item, idx });
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, 'sv')
  );

  // 3) Skapa overlay och modal‑wrapper
  const overlay = document.createElement('div');
  overlay.className = 'modal import-modal';
  document.body.appendChild(overlay);

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  overlay.appendChild(modal);

  // 4) Header utan stäng‑knapp
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h2>Importera varor från <em>${srcList.name}</em></h2>
  `;
  modal.appendChild(header);

  // 5) Body (filter + lista)
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.innerHTML = `
    <div class="controls">
      <button type="button" class="btn-select-all">Markera alla</button>
      <input type="text" class="filter-input" placeholder="Filtrera…">
    </div>
    <div class="items-container"></div>
  `;
  modal.appendChild(body);

  const container = body.querySelector('.items-container');
  categories.forEach(cat => {
    const groupWrap = document.createElement('div');
    groupWrap.className = 'category-group';
    groupWrap.innerHTML = `<h3>${cat}</h3><ul></ul>`;
    const ul = groupWrap.querySelector('ul');
    grouped[cat].forEach(({ item, idx }) => {
      const li = document.createElement('li');
      li.className = 'import-row';
      li.innerHTML = `
        <input type="checkbox" data-idx="${idx}">
        <span class="item-label">${item.name}${item.note ? ' – '+item.note : ''}</span>
      `;
      ul.appendChild(li);
    });
    container.appendChild(groupWrap);
  });

  // 6) Footer med Avbryt + Importera
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button type="button" class="btn-cancel">Avbryt</button>
    <button type="button" class="btn-import">Importera</button>
  `;
  modal.appendChild(footer);

  // 7) Event‑listeners
  const btnCancel   = footer.querySelector('.btn-cancel');
  const btnImport   = footer.querySelector('.btn-import');
  const btnSelectAll= body.querySelector('.btn-select-all');
  const filterInput = body.querySelector('.filter-input');
  const checkboxes  = container.querySelectorAll('input[type="checkbox"]');

  // Avbryt
  btnCancel.onclick = () => overlay.remove();

  // Markera alla
  btnSelectAll.onclick = () => checkboxes.forEach(cb => cb.checked = true);

  // Filtrering
  filterInput.addEventListener('input', () => {
    const term = filterInput.value.toLowerCase();
    container.querySelectorAll('li.import-row').forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  // Importera
  btnImport.onclick = () => {
    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const idx = +cb.dataset.idx;
      const src = srcList.items[idx];
      const exists = lists[targetIndex].items.some(i =>
        i.name === src.name && (i.note||'') === (src.note||'')
      );
      if (!exists) {
        lists[targetIndex].items.push({
          name:     src.name,
          note:     src.note || '',
          done:     false,
          category: srcList.hideCategories
                     ? undefined
                     : (src.category || 'Övrigt')
        });
      }
    });
    stampListTimestamps(lists[targetIndex]);
    saveLists(lists);
    renderListDetail(targetIndex);
    overlay.remove();
  };
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

function normalizeKey(str) {
  return str
    .trim()           // ta bort extra mellanslag
    .toLowerCase()    // gemener
    .normalize();     // Unicode‑normalisering (åäö etc)
}

// ===== Lägg till varor med kategori-minne =====
window.addItemsWithCategory = function(listIndex) {
  const list = lists[listIndex];
  const skipCategory = list.hideCategories === true;

  showAddItemsDialog({
    kategori: null,
    allaVaror: getAllUniqueItemNames(lists),
    onlyCategory: false,
    onDone: items => {
      (async () => {
        for (const { name, note } of items) {
          const newItem = { name, note, done: false };

          if (!skipCategory) {
            // 1) Skapa lookup‑key
            const key = normalizeKey(name);

            // 2) Slå upp sparad kategori
            const savedCat = window.categoryMemory[key];
            if (savedCat) {
              // Använd från minnet
              newItem.category = savedCat;

            } else {
              // Be användaren välja och spara direkt
              const chosenCat = await new Promise(r => showCategoryPicker(name, r));
              if (chosenCat) {
                newItem.category = chosenCat;
                // Spara i både minne och localStorage
                window.categoryMemory[key] = chosenCat;
                window.saveCategoryMemory(window.categoryMemory);
              }
            }
          }

          list.items.push(newItem);
        }

        // Stämpla, spara och rendera om
        stampListTimestamps(list);
        saveLists(lists);
        renderListDetail(listIndex);
      })();
    }
  });
};


// ===== Lägg till varor inom en viss kategori (med auto‑complete från alla listor) =====
window.addItemViaCategory = function(listIndex, kategori) {
  const list = lists[listIndex];

  // Bygg en uppsättning av alla varunamn i just den här kategorin från alla listor
  const globalNames = new Set();
  lists.forEach(l => {
    l.items.forEach(item => {
      if (item.category === kategori && item.name) {
        globalNames.add(item.name.trim());
      }
    });
  });
  // Gör om till sorterad array av objekt { name, category }
  const allaVaror = Array.from(globalNames)
    .sort((a, b) => a.localeCompare(b, 'sv'))
    .map(name => ({ name, category: kategori }));

  showAddItemsDialog({
    kategori,
    allaVaror,       // förslag från alla listor
    onlyCategory: true,
    onDone: items => {
      items.forEach(({ name, note }) => {
        // Skapa objektet
        const newItem = { name, note, done: false, category: kategori };
        list.items.push(newItem);

        // Spara globalt minne också
        const key = name.trim().toLowerCase().normalize();
        window.categoryMemory[key] = kategori;
      });

      // Persist till localStorage
      try {
        saveCategoryMemory(window.categoryMemory);
      } catch (e) {
        console.warn("Kunde inte spara categoryMemory:", e);
      }

      // Spara & rendera om
      stampListTimestamps(list);
      saveLists(lists);
      renderListDetail(listIndex);
    }
  });
};



