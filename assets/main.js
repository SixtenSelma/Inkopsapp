// --- Användarhantering ---
let user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

// --- Ladda listor från localStorage ---
let lists = JSON.parse(localStorage.getItem("lists") || "[]");

const appContainer = document.getElementById("app");

// --- Spara & rendera ---
function saveAndRender() {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderAllLists();
}
function saveAndRenderList(index) {
  localStorage.setItem("lists", JSON.stringify(lists));
  renderListDetail(index);
}

// --- Rendera startsida ---
function renderAllLists() {
  const listHtml = lists.map((list, i) => {
    const doneCount = list.items.filter(item => item.done).length;
    const totalCount = list.items.length;
    const progress = totalCount ? (doneCount / totalCount) * 100 : 0;

    return `
      <li class="list-item" onclick="window.viewList(${i})">
        <div class="list-card">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="icon-button" onclick="event.stopPropagation(); window.renameList(${i})">⚙️</button>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${doneCount} / ${totalCount} klara</div>
        </div>
      </li>`;
  }).join("");

  appContainer.innerHTML = `
    <div class="top-bar">
      <h1>Mina listor</h1>
      <div class="user-badge">
        ${user}
        <button class="icon-button" onclick="window.changeUser()">⚙️</button>
      </div>
    </div>
    <ul class="list-wrapper">${listHtml}</ul>
    <div class="bottom-bar">
      <button onclick="window.showNewListDialog()">➕ Ny lista</button>
    </div>
    <div id="dialog-root"></div>
  `;
}

// --- Rendera en lista ---
function renderListDetail(index) {
  const list = lists[index];
  const unchecked = list.items.filter(item => !item.done);
  const checked = list.items.filter(item => item.done);

  const itemHtml = [...unchecked, ...checked].map((item, i) => `
    <li class="todo-item ${item.done ? 'done' : ''}">
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="window.toggleItem(${index}, ${i})" />
      <span class="item-name">
        ${item.done ? '<s>' + item.name + '</s>' : item.name}
        ${item.done && item.doneBy ? `<small><br><em>${item.doneBy}, ${item.doneAt}</em></small>` : ''}
      </span>
      <button class="delete-btn" onclick="window.deleteItem(${index}, ${i})">🗑️</button>
    </li>`).join("");

  appContainer.innerHTML = `
    <h1>${list.name}</h1>
    <ul>${itemHtml || '<li>Inga varor än.</li>'}</ul>
    <div class="add-new-container">
      <input id="newItemInput" type="text" placeholder="Ny vara..." />
      <button onclick="window.addItem(${index})">Lägg till</button>
    </div>
    <div class="add-new-container">
      <button class="btn-secondary" onclick="window.renderAllLists()">⬅️ Tillbaka</button>
    </div>
  `;
  document.getElementById("newItemInput").focus();
}

function addSwipeListeners(li, listIndex, itemIndex) {
  let startX = 0;
  li.addEventListener('touchstart', e => startX = e.changedTouches[0].clientX);
  li.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].clientX - startX;
    if (deltaX > 80) toggleItem(listIndex, itemIndex);
    if (deltaX < -80) deleteItem(listIndex, itemIndex);
  });
}

// --- Funktioner ---
window.viewList = i => renderListDetail(i);

window.addItem = i => {
  const input = document.getElementById("newItemInput");
  if (!input.value) return;
  lists[i].items.push({ name: input.value, done: false });
  saveAndRenderList(i);
};

window.deleteItem = (listIndex, itemIndex) => {
  lists[listIndex].items.splice(itemIndex, 1);
  saveAndRenderList(listIndex);
};

window.toggleItem = (listIndex, itemIndex) => {
  const item = lists[listIndex].items[itemIndex];
  item.done = !item.done;
  if (item.done) {
    item.doneBy = user;
    item.doneAt = new Date().toLocaleString();
  } else {
    delete item.doneBy;
    delete item.doneAt;
  }
  saveAndRenderList(listIndex);
};

window.addList = name => {
  if (!name.trim()) return;
  lists.push({ name, items: [] });
  saveAndRender();
};

window.renameList = index => {
  const newName = prompt("Nytt namn på listan:", lists[index].name);
  if (newName) {
    lists[index].name = newName;
    saveAndRender();
  }
};

window.changeUser = () => {
  user = prompt("Vad heter du?", user);
  if (user) {
    localStorage.setItem("user", user);
    saveAndRender();
  }
};

window.showNewListDialog = () => {
  const dialog = document.createElement("div");
  dialog.className = "modal";
  dialog.innerHTML = `
    <div class="modal-content">
      <h2>Ny lista</h2>
      <input type="text" id="modalNewListInput" placeholder="Namn på ny lista..." />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.parentElement.parentElement.parentElement)">Avbryt</button>
        <button onclick="window.confirmNewList()">Skapa</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  setTimeout(() => document.getElementById("modalNewListInput").focus(), 50);
};

window.confirmNewList = () => {
  const input = document.getElementById("modalNewListInput");
  if (!input || !input.value.trim()) return;
  window.addList(input.value.trim());
  document.body.removeChild(document.querySelector(".modal"));
};


window.renderListDetail = index => {
  // ... existerande kod ...
  const lis = document.querySelectorAll('.todo-item');
  lis.forEach((li, i) => addSwipeListeners(li, index, i));
};

// Starta appen
window.renderAllLists = renderAllLists;
renderAllLists();
