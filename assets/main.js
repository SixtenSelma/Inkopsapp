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
  // Stoppa bubbla så vi inte triggar grid‑click o.s.v.
  event.stopPropagation();

  // Ta bort ev. öppna menyer
  document.querySelectorAll('.item-menu').forEach(el => el.remove());

  // Hämta själva HTML‑knappen vi klickade på
  const container = btn.parentElement;

  // Skapa meny‑elementet
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="(function(){
      // Ändra → öppna kombinerad namn/komplement‑modal
      showEditItemDialog(
        ${listIndex},
        ${itemIndex},
        \`${lists[listIndex].items[itemIndex].name.replace(/`/g,'\\`')}\`,
        \`${(lists[listIndex].items[itemIndex].note||'').replace(/`/g,'\\`')}\`,
        (newName, newNote) => {
          const item = lists[${listIndex}].items[${itemIndex}];
          item.name = newName;
          item.note = newNote;
          stampListTimestamps(lists[${listIndex}]);
          saveLists(lists);
          renderListDetail(${listIndex});
        }
      );
    })()">Ändra</button>
    <button onclick="(function(){
      if (confirm('Ta bort varan permanent?')) {
        lists[${listIndex}].items.splice(${itemIndex}, 1);
        stampListTimestamps(lists[${listIndex}]);
        saveLists(lists);
        renderListDetail(${listIndex});
      }
    })()" style="color:#d44;">Ta bort</button>
  `;

  // Placera ut menyn precis under ⋮-knappen
  container.appendChild(menu);
  const rect = btn.getBoundingClientRect();
  menu.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  menu.style.left = (rect.right + window.scrollX - menu.offsetWidth) + 'px';

  // Klick utanför stänger menyn
  document.addEventListener('click', function handler(e) {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.remove();
      document.removeEventListener('click', handler);
    }
  });
};

// --- Initiera första rendering ---
window.renderAllLists();
