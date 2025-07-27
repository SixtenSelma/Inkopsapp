// main.js – binder ihop all logik, hanterar navigation & event

// --- Rendera aktuell lista eller alla listor ---
window.viewList = function(i) {
  renderListDetail(i);
};

window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};

window.saveAndRender = function() {
  saveLists(lists);
  renderAllLists();
};

// --- Byt användare ---
window.changeUser = function() {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    setUser(user);
    renderAllLists();
  }
};

// --- Menyer (popup) ---
window.openListMenu = function(i, btn) {
  const list = lists[i];
  const html = `
    <button onclick="renameList(${i})">🖊 Ändra</button>
    <button onclick="deleteList(${i})" style="color:#d44;">✖ Ta bort lista</button>
    ${
      !list.archived
        ? `<button onclick="archiveList(${i})">↘ Arkivera</button>`
        : `<button onclick="unarchiveList(${i})">↺ Återställ</button>`
    }
  `;
  // window.createMenu finns i utils.js
  createMenu(html, btn);
};

// --- Menyer (popup) för enskild vara ---
window.openItemMenu = function(listIndex, itemIndex, btn) {
  // Stoppa bubbla så klicket inte går vidare
  btn.addEventListener('click', e => e.stopPropagation());

  // Ta bort eventuella öppna menyer
  document.querySelectorAll('.item-menu').forEach(el => el.remove());

  // Skapa popup‑behållare
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <ul class="item-menu-list">
      <li>
        <button type="button" class="item-menu-btn edit-btn">Ändra/komplettera</button>
      </li>
      <li>
        <button type="button" class="item-menu-btn delete-btn">Ta bort</button>
      </li>
    </ul>
  `;

  // Placera menyn under ⋮‑knappen
  const rect = btn.getBoundingClientRect();
  document.body.appendChild(menu);
  menu.style.position = 'absolute';
  menu.style.top  = (rect.bottom + window.scrollY + 8) + 'px';
  menu.style.left = (rect.right + window.scrollX - menu.offsetWidth) + 'px';

  // Klick utanför stänger menyn
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);

  // "Ändra/komplettera"
  menu.querySelector('.edit-btn').onclick = () => {
    const item = lists[listIndex].items[itemIndex];
    showEditItemDialog(
      listIndex,
      itemIndex,
      item.name,
      item.note || '',
      item.category || '',
      (newName, newNote, newCat) => {
        item.name     = newName;
        item.note     = newNote;
        item.category = newCat;
        stampListTimestamps(lists[listIndex]);
        saveLists(lists);
        renderListDetail(listIndex);
      }
    );
    menu.remove();
  };

  // "Ta bort"
  menu.querySelector('.delete-btn').onclick = () => {
    lists[listIndex].items.splice(itemIndex, 1);
    stampListTimestamps(lists[listIndex]);
    saveLists(lists);
    renderListDetail(listIndex);
    menu.remove();
  };
};


// --- Initiera första rendering ---
window.renderAllLists();
