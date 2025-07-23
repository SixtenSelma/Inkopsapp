const standardKategorier = [
  "🥦 Frukt & Grönt",
  "🍞 Bröd & Bageri",
  "🧀 Mejeri",
  "🍗 Kött, Fisk, Fågel & Chark",
  "❄️ Frysvaror",
  "🍝 Skafferi / Torrvaror",
  "🥤 Dryck",
  "🍫 Godis, Snacks & Nötter",
  "🧴 Hygien & Apotek",
  "🧽 Städ & Tvätt",
  "👶 Barn & Baby",
  "🐾 Djur",
  "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)"
];

let user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

let lists = JSON.parse(localStorage.getItem("lists") || "[]");
const app = document.getElementById("app");

// NYTT: kategori-minne per vara
let categoryMemory = JSON.parse(localStorage.getItem("categoryMemory") || "{}");

function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

function saveAndRender() {
  localStorage.setItem("lists", JSON.stringify(lists));
  localStorage.setItem("categoryMemory", JSON.stringify(categoryMemory));
  renderAllLists();
}

function saveAndRenderList(i) {
  localStorage.setItem("lists", JSON.stringify(lists));
  localStorage.setItem("categoryMemory", JSON.stringify(categoryMemory));
  renderListDetail(i);
}

function renderAllLists() {
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

  applyFade();
}

function renderListDetail(i) {
  const list = lists[i];
  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

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
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx})"/>
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
      <h1 class="back-title" onclick="renderAllLists()">&lt; ${list.name}</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">🖊</button>
      </div>
    </div>
    <div class="category-list">
      ${itemsHTML || '<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="showBatchAddDialog(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  applyFade();
}

window.showNewListDialog = () => {
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

window._confirmNewList = () => {
  const inp = document.getElementById("modalNewListInput");
  if (inp && inp.value.trim()) {
    lists.push({ name: inp.value.trim(), items: [] });
    saveAndRender();
    document.body.removeChild(document.querySelector('.modal'));
  }
};

function showRenameDialog(title, currentName, onConfirm) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <input id="renameInput" value="${currentName}" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmRename()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("renameInput");
  input.focus();
  input.select();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmRename();
  });

  window.confirmRename = () => {
    const newName = input.value.trim();
    if (newName) {
      onConfirm(newName);
      document.body.removeChild(m);
    }
  };
}

window.showBatchAddDialog = (i) => {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      <input id="batchItemInput" placeholder="Skriv vara och tryck Enter…" />
      <ul id="batchPreview" class="preview-list"></ul>
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmBatchAdd(${i})">Klar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("batchItemInput");
  const preview = document.getElementById("batchPreview");

  window._batchAddItems = [];

  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      const name = input.value.trim();
      window._batchAddItems.push(name);
      const li = document.createElement("li");
      li.textContent = name;
      preview.appendChild(li);
      input.value = "";
    }
  });
};

window.confirmBatchAdd = (index) => {
  const added = window._batchAddItems || [];
  const input = document.getElementById("batchItemInput");

  if (input && input.value.trim()) {
    added.push(input.value.trim());
  }

  // Här sker kategori-minne!
  added.forEach(name => {
    const key = name.trim().toLowerCase();
    const category = categoryMemory[key] || '';
    lists[index].items.push({ name, done: false, category });
  });

  saveAndRenderList(index);
  document.body.removeChild(document.querySelector('.modal'));
  window._batchAddItems = [];
};

window.renameItem = (li, ii) => {
  const currentName = lists[li].items[ii].name;
  showRenameDialog("Byt namn på vara", currentName, (newName) => {
    lists[li].items[ii].name = newName;
    saveAndRenderList(li);
    closeAnyMenu();
  });
};

window.complementItem = (li, ii) => {
  const itemName = lists[li].items[ii].name.trim().toLowerCase();
  const currentNote = lists[li].items[ii].note || '';
  const rememberedCat = categoryMemory[itemName] || '';
  const currentCat = lists[li].items[ii].category || rememberedCat || '';
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Komplettering</h2>
      <label>Beskrivning:</label>
      <input id="noteInput" placeholder="T.ex. 1 liter…" value="${currentNote}" />
      <label style="margin-top:12px;">Kategori:</label>
      <select id="categorySelect">
        <option value="">Välj kategori…</option>
        ${standardKategorier.map(cat => `
          <option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>
        `).join('')}
      </select>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNote()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("noteInput");
  const select = document.getElementById("categorySelect");
  input.focus();
  input.select();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNote();
  });

  window.confirmNote = () => {
    lists[li].items[ii].note = input.value.trim();
    lists[li].items[ii].category = select.value;

    // Uppdatera minnet om kategori per vara!
    const itemNameKey = lists[li].items[ii].name.trim().toLowerCase();
    if (select.value) {
      categoryMemory[itemNameKey] = select.value;
      localStorage.setItem("categoryMemory", JSON.stringify(categoryMemory));
    }

    saveAndRenderList(li);
    document.body.removeChild(m);
    closeAnyMenu();
  };
};

window.renameList = i => {
  const currentName = lists[i].name;
  showRenameDialog("Byt namn på lista", currentName, (newName) => {
    lists[i].name = newName;
    saveAndRender();
    closeAnyMenu();
  });
};

window.deleteItem = (li, ii) => {
  lists[li].items.splice(ii, 1);
  saveAndRenderList(li);
  closeAnyMenu();
};

window.deleteList = i => {
  if (confirm("Vill du ta bort listan permanent?")) {
    lists.splice(i, 1);
    saveAndRender();
    closeAnyMenu();
  }
};

window.changeUser = () => {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    localStorage.setItem("user", user);
    saveAndRender();
  }
};

window.openItemMenu = (li, ii, btn) => {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameItem(${li}, ${ii})">🖊 Byt namn</button>
    <button onclick="complementItem(${li}, ${ii})">ⓘ Komplettera</button>
    <button onclick="deleteItem(${li}, ${ii})">✖ Ta bort</button>
  `;
  positionMenu(menu, btn);
};

window.openListMenu = (i, btn) => {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameList(${i})">🖊 Byt namn</button>
    <button onclick="deleteList(${i})">✖ Ta bort lista</button>
  `;
  positionMenu(menu, btn);
};

function closeAnyMenu() {
  const existing = document.querySelector('.item-menu');
  if (existing) existing.remove();
}

function positionMenu(menu, btn) {
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
}

function applyFade() {
  app.classList.add('fade-enter');
  requestAnimationFrame(() => {
    app.classList.add('fade-enter-active');
    app.addEventListener('transitionend', () => {
      app.classList.remove('fade-enter', 'fade-enter-active');
    }, { once: true });
  });
}

window.viewList = i => renderListDetail(i);

window.toggleItem = (li, ii) => {
  const it = lists[li].items[ii];
  it.done = !it.done;
  if (it.done) {
    it.doneBy = user;
    it.doneAt = new Date().toISOString();
  } else {
    delete it.doneBy;
    delete it.doneAt;
  }
  saveAndRenderList(li);
};

window.renderAllLists = renderAllLists;
renderAllLists();
