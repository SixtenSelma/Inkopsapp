let user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

let lists = JSON.parse(localStorage.getItem("lists") || "[]");
const app = document.getElementById("app");

function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
}

function saveAndRender() {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderAllLists();
}

function saveAndRenderList(i) {
  localStorage.setItem("lists", JSON.stringify(lists));
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
        <button class="icon-button" onclick="changeUser()" title="Byt namn">🖉</button>
      </div>
    </div>
    <ul class="list-wrapper">
      ${listCards || '<p class="no-lists">Inga listor än.</p>'}
    </ul>
    <div class="bottom-bar">
      <button onclick="showBatchAddDialog()" title="Snabbinmatning">➕</button>
    </div>
  `;

  applyFade();
}

function renderListDetail(i) {
  const list = lists[i];
  const fullList = lists[i].items.map((item, realIdx) => ({ ...item, realIdx }));
  const sortedItems = [
    ...fullList.filter(item => !item.done),
    ...fullList.filter(item => item.done)
  ];

  const items = sortedItems.map(item => `
    <li class="todo-item ${item.done ? 'done' : ''}">
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx})"/>
      <span class="item-name">
        ${item.done ? `<s>${item.name}</s>` : `<strong>${item.name}</strong>`}
        ${item.done && item.doneBy ? `<small>${item.doneBy} • ${formatDate(item.doneAt)}</small>` : ''}
      </span>
      <button class="menu-btn" onclick="openItemMenu(${i}, ${item.realIdx}, this)">⋮</button>
    </li>
  `).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1 class="back-title" onclick="renderAllLists()">&lt; ${list.name}</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">✏</button>
      </div>
    </div>
    <ul class="todo-list">
      ${items || '<li>Inga varor än.</li>'}
    </ul>
    <div class="bottom-bar">
      <button onclick="showBatchAddDialog(${i})" title="Snabbinmatning">➕</button>
    </div>
  `;

  applyFade();
}

// ======= Dialoger =======

window.showNewListDialog = () => {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Skapa ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewList()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const input = document.getElementById("modalNewListInput");
  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNewList();
  });
};

window.confirmNewList = () => {
  const inp = document.getElementById("modalNewListInput");
  if (inp && inp.value.trim()) {
    lists.push({ name: inp.value.trim(), items: [] });
    saveAndRender();
    document.body.removeChild(document.querySelector('.modal'));
  }
};

// ======= Batch Add =======

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
  const added = [];

  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      const name = input.value.trim();
      added.push(name);
      const li = document.createElement("li");
      li.textContent = name;
      preview.appendChild(li);
      input.value = "";
    }
  });

  window.confirmBatchAdd = (index) => {
    added.forEach(name => lists[index].items.push({ name, done: false }));
    saveAndRenderList(index);
    document.body.removeChild(document.querySelector('.modal'));
  };
};

// ======= Menyer =======

window.renameItem = (li, ii) => {
  const item = lists[li].items[ii];
  const newName = prompt("Nytt namn på vara:", item.name);
  if (newName && newName.trim()) {
    item.name = newName.trim();
    saveAndRenderList(li);
  }
};

window.renameList = i => {
  const n = prompt("Nytt namn på lista:", lists[i].name);
  if (n) {
    lists[i].name = n.trim();
    saveAndRender();
  }
};

window.deleteItem = (li, ii) => {
  lists[li].items.splice(ii, 1);
  saveAndRenderList(li);
};

window.deleteList = i => {
  if (confirm("Vill du ta bort listan permanent?")) {
    lists.splice(i, 1);
    saveAndRender();
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
    <button onclick="renameItem(${li}, ${ii})">✏ Byt namn</button>
    <button onclick="deleteItem(${li}, ${ii})">✖ Ta bort</button>
  `;
  positionMenu(menu, btn);
};

window.openListMenu = (i, btn) => {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameList(${i})">✏ Byt namn</button>
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

// ======= Init =======

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
