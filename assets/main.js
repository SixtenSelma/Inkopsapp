// --- Användarhantering ---
let user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

// --- Ladda listor från localStorage ---
let lists = JSON.parse(localStorage.getItem("lists") || "[]");
const app = document.getElementById("app");

// --- Helpers för spara & render ---
function saveAndRender() {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderAllLists();
}
function saveAndRenderList(i) {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderListDetail(i);
}

// --- Rendera startsida ---
function renderAllLists() {
  const listCards = lists.map((list, i) => {
    const done = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
      <li class="list-item">
        <div class="list-card" onclick="handleListClick(event, ${i})">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenu(${i}, this)">✏</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>Inköpslistor</h1>
      <div class="user-badge">${user}<button class="icon-button" onclick="changeUser()">🖊</button></div>
    </div>
    <ul class="list-wrapper">${listCards || '<p class="no-lists">Inga listor än.</p>'}</ul>
    <div class="bottom-bar">
      <button onclick="showNewListDialog()" title="Ny lista">➕</button>
    </div>
  `;

  applyFade();
}

function handleListClick(e, i) {
  if (e.target.closest('.menu-btn')) return;
  viewList(i);
}

// del2
// --- Rendera detaljvy ---
function renderListDetail(i) {
  const list = lists[i];
  const items = [...list.items]
    .map((item, idx) => ({ ...item, realIdx: idx }))
    .sort((a, b) => a.done - b.done)
    .map((item) => `
      <li class="todo-item ${item.done ? 'done' : ''}">
        <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem(${i},${item.realIdx})"/>
        <span class="item-name">
          ${item.done ? `<s>${item.name}</s><small>${item.doneBy}, ${item.doneAt}</small>` : `<strong>${item.name}</strong>`}
        </span>
        <button class="menu-btn" onclick="event.stopPropagation(); openItemMenu(${i}, ${item.realIdx}, this)">✏</button>
      </li>`).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1 onclick="renderAllLists()">&lt; ${list.name}</h1>
      <div class="user-badge">${user}<button class="icon-button" onclick="changeUser()">🖊</button></div>
    </div>
    <ul class="todo-list">${items || '<li>Inga varor än.</li>'}</ul>
    <div class="bottom-bar">
      <button onclick="showBatchAddDialog(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  applyFade();
}

// del3
// --- Menyer ---
function openListMenu(i, btn) {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameList(${i})">✏ Byt namn</button>
    <button onclick="deleteList(${i})">✖ Ta bort lista</button>
  `;
  positionMenu(menu, btn);
}

function openItemMenu(li, ii, btn) {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameItem(${li}, ${ii})">✏ Byt namn</button>
    <button onclick="deleteItem(${li}, ${ii})">✖ Ta bort</button>
  `;
  positionMenu(menu, btn);
}

function positionMenu(menu, btn) {
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.top = `${rect.bottom + window.scrollY}px`;
  menu.style.left = `${Math.min(window.innerWidth - 180, rect.left + window.scrollX - 100)}px`;
  document.body.appendChild(menu);
}

function closeAnyMenu() {
  document.querySelectorAll('.item-menu').forEach(m => m.remove());
}

// --- Funktioner för varor & listor ---
function viewList(i) {
  renderListDetail(i);
}
function addItem(i, name) {
  if (!name.trim()) return;
  lists[i].items.push({ name: name.trim(), done: false });
  saveAndRenderList(i);
}
function deleteItem(li, ii) {
  lists[li].items.splice(ii, 1);
  saveAndRenderList(li);
  closeAnyMenu();
}
function toggleItem(li, ii) {
  const it = lists[li].items[ii];
  it.done = !it.done;
  if (it.done) {
    it.doneBy = user;
    it.doneAt = new Date().toLocaleString();
  } else {
    delete it.doneBy;
    delete it.doneAt;
  }
  saveAndRenderList(li);
}
function renameItem(li, ii) {
  const item = lists[li].items[ii];
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Byt namn på vara</h2>
      <input id="renameInput" value="${item.name}" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal')); closeAnyMenu()">Avbryt</button>
        <button onclick="doRenameItem(${li}, ${ii})">OK</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  const input = document.getElementById("renameInput");
  input.focus();
  input.select();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") doRenameItem(li, ii);
  });
}
function doRenameItem(li, ii) {
  const input = document.getElementById("renameInput");
  if (input && input.value.trim()) {
    lists[li].items[ii].name = input.value.trim();
    saveAndRenderList(li);
    document.body.removeChild(document.querySelector('.modal'));
    closeAnyMenu();
  }
}
function renameList(i) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Byt namn på lista</h2>
      <input id="renameListInput" value="${lists[i].name}" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal')); closeAnyMenu()">Avbryt</button>
        <button onclick="doRenameList(${i})">OK</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  const input = document.getElementById("renameListInput");
  input.focus();
  input.select();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") doRenameList(i);
  });
}
function doRenameList(i) {
  const input = document.getElementById("renameListInput");
  if (input && input.value.trim()) {
    lists[i].name = input.value.trim();
    saveAndRender();
    document.body.removeChild(document.querySelector('.modal'));
    closeAnyMenu();
  }
}
function deleteList(i) {
  lists.splice(i, 1);
  saveAndRender();
  closeAnyMenu();
}
function changeUser() {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    localStorage.setItem("user", user);
    saveAndRender();
  }
}

// --- Dialoger ---
function showNewListDialog() {
  closeAnyMenu();
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
    </div>`;
  document.body.appendChild(m);
  const input = document.getElementById("modalNewListInput");
  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNewList();
  });
}
function confirmNewList() {
  const inp = document.getElementById("modalNewListInput");
  if (inp && inp.value.trim()) {
    addList(inp.value.trim());
    document.body.removeChild(document.querySelector('.modal'));
  }
}
function addList(name) {
  if (!name.trim()) return;
  lists.push({ name, items: [] });
  saveAndRender();
}
function showBatchAddDialog(i) {
  closeAnyMenu();
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Ny vara</h2>
      <input id="modalNewItemInput" placeholder="Vad vill du lägga till?" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewItem(${i})">OK</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  const input = document.getElementById("modalNewItemInput");
  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNewItem(i);
  });
}
function confirmNewItem(i) {
  const inp = document.getElementById("modalNewItemInput");
  if (inp && inp.value.trim()) {
    addItem(i, inp.value.trim());
    document.body.removeChild(document.querySelector('.modal'));
  }
}

// --- Animation ---
function applyFade() {
  app.classList.add('fade-enter');
  requestAnimationFrame(() => {
    app.classList.add('fade-enter-active');
    app.addEventListener('transitionend', () => {
      app.classList.remove('fade-enter', 'fade-enter-active');
    }, { once: true });
  });
}

window.renderAllLists = renderAllLists;
renderAllLists();
