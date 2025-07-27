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
    <button onclick="renameList(${i})">🖊 Byt namn</button>
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
  // Stoppa bubbla så vi inte triggar annat (hämta event-objekt rätt)
  btn.addEventListener('click', e => e.stopPropagation());
  
  // Ta bort ev. öppna menyer
  document.querySelectorAll('.item-menu').forEach(el => el.remove());

  // Skapa meny-element
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button type="button" class="item-menu-btn edit-btn">Ändra</button>
    <button type="button" class="item-menu-btn delete-btn" style="color:#d44;">Ta bort</button>
  `;

  // Placera ut menyn precis under ⋮-knappen
  const rect = btn.getBoundingClientRect();
  document.body.appendChild(menu);
  menu.style.position = 'absolute';
  menu.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
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

  // Handler för "Ändra"
  menu.querySelector('.edit-btn').onclick = () => {
    const item = lists[listIndex].items[itemIndex];
    showEditItemDialog(
      listIndex,
      itemIndex,
      item.name,
      item.note || '',
      item.category || '',
      (newName, newNote, newCat) => {
        // Uppdatera objektet
        item.name     = newName;
        item.note     = newNote;
        item.category = newCat;
        // Stämpla, spara och rendera om
        stampListTimestamps(lists[listIndex]);
        saveLists(lists);
        renderListDetail(listIndex);
      }
    );
    menu.remove();
  };

  // Handler för "Ta bort"
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
