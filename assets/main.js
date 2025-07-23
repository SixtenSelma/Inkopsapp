// === Användarhantering ===
let user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

// === Data ===
let lists = JSON.parse(localStorage.getItem("lists") || "[]");
const app = document.getElementById("app");

// === Format-tid till 23/7 13.34 ===
function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// === Helpers ===
function saveAndRender() {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderAllLists();
}

function saveAndRenderList(i) {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderListDetail(i);
}

// === Startsida ===
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
            <button class="icon-button" onclick="event.stopPropagation(); renameList(${i})" title="Byt namn">✎</button>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>Inköpslista</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">✎</button>
      </div>
    </div>
    <ul class="list-wrapper">
      ${listCards || '<p class="no-lists">Inga listor än.</p>'}
    </ul>
    <div class="new-list-button-wrapper">
      <button class="new-list-button" onclick="showNewListDialog()">➕ Ny lista</button>
    </div>
  `;

  applyFade();
}



// === Detaljvy ===
function renderListDetail(i) {
  const list = lists[i];
  const unchecked = list.items.filter(x => !x.done);
  const checked = list.items.filter(x => x.done);
  const items = [...unchecked, ...checked].map((item, idx) => `
    <li class="todo-item ${item.done ? 'done' : ''}">
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${idx})"/>
      <span class="item-name">
        ${item.done ? `<s>${item.name}</s>` : item.name}
        ${item.done && item.doneBy ? `<small>${item.doneBy} • ${formatDate(item.doneAt)}</small>` : ''}
      </span>
      <button class="menu-btn" onclick="openItemMenu(${i},${idx}, this)">⋮</button>
    </li>
  `).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>${list.name}</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="changeUser()" title="Byt namn">✎</button>
      </div>
    </div>
    <ul class="todo-list">
      ${items || '<li>Inga varor än.</li>'}
    </ul>
    <div class="add-new-container">
      <input id="newItemInput" placeholder="Ny vara…" />
      <button onclick="addItem(${i})">Lägg till</button>
      <button class="btn-secondary" onclick="renderAllLists()">⬅️ Tillbaka</button>
    </div>
  `;

  document.getElementById("newItemInput").focus();
  applyFade();
}

// === Användare & inställningar ===
window.changeUser = () => {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    localStorage.setItem("user", user);
    saveAndRender();
  }
};

window.renameList = i => {
  const n = prompt("Nytt namn:", lists[i].name);
  if (n) {
    lists[i].name = n;
    saveAndRender();
  }
};

// === Lista-hantering ===
window.viewList = i => renderListDetail(i);
window.addList = name => {
  if (!name.trim()) return;
  lists.push({ name, items: [] });
  saveAndRender();
};

// === Vara-hantering ===
window.addItem = i => {
  const v = document.getElementById("newItemInput").value.trim();
  if (!v) return;
  lists[i].items.push({ name: v, done: false });
  saveAndRenderList(i);
};

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

window.deleteItem = (li, ii) => {
  lists[li].items.splice(ii, 1);
  saveAndRenderList(li);
};

window.renameItem = (li, ii) => {
  const item = lists[li].items[ii];
  const newName = prompt("Nytt namn på vara:", item.name);
  if (newName && newName.trim()) {
    item.name = newName.trim();
    saveAndRenderList(li);
  }
};

// === Visa meny för vara ===
window.openItemMenu = (li, ii, btn) => {
  const existing = document.querySelector('.item-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameItem(${li}, ${ii})">✏️ Byt namn</button>
    <button onclick="deleteItem(${li}, ${ii})">🗑️ Ta bort</button>
  `;

  const rect = btn.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.top = `${rect.bottom + window.scrollY}px`;
  menu.style.left = `${rect.left + window.scrollX - 100}px`;

  document.body.appendChild(menu);

  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
};

// === Modal ny lista ===
window.showNewListDialog = () => {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewList()">Skapa</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  setTimeout(() => document.getElementById("modalNewListInput").focus(), 50);
};

window.confirmNewList = () => {
  const inp = document.getElementById("modalNewListInput");
  if (inp && inp.value.trim()) {
    addList(inp.value.trim());
    document.body.removeChild(document.querySelector('.modal'));
  }
};

// === Fade-animation ===
function applyFade() {
  app.classList.add('fade-enter');
  requestAnimationFrame(() => {
    app.classList.add('fade-enter-active');
    app.addEventListener('transitionend', () => {
      app.classList.remove('fade-enter', 'fade-enter-active');
    }, { once: true });
  });
}

// === Init ===
window.renderAllLists = renderAllLists;
renderAllLists();
