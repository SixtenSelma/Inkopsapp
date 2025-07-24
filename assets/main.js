// main.js – binder ihop all logik, hanterar navigation & event

// --- Globala (från de andra filerna):
// window.lists, window.standardKategorier, window.categoryMemory
// window.renderAllLists, window.renderListDetail
// window.toggleItem, window.renameItem, window.complementItem, window.deleteItem
// window.showRenameDialog, window.showCategoryPicker
// window.saveLists, window.saveCategoryMemory, window.getUser, window.setUser

// --- Hjälpfunktion: Rendera aktuell sida (anropas på sidbyte)
window.viewList = function(i) {
  alert("Jag klickade på listan!");
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

// --- Event för att byta användare
window.changeUser = function() {
  const n = prompt("Vad heter du?", user);
  if (n) {
    user = n;
    setUser(user);
    renderAllLists();
  }
};

// --- Menyer (popup)
window.openListMenu = function(i, btn) {
  closeAnyMenu && closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameList(${i})">🖊 Byt namn</button>
    <button onclick="deleteList(${i})">✖ Ta bort lista</button>
  `;
  positionMenu(menu, btn);
};

window.openItemMenu = function(li, ii, btn) {
  closeAnyMenu && closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = `
    <button onclick="renameItem(${li}, ${ii}, lists, saveAndRenderList, closeAnyMenu)">🖊 Byt namn</button>
    <button onclick="complementItem(${li}, ${ii}, lists, categoryMemory, saveAndRenderList, closeAnyMenu)">ⓘ Komplettera</button>
    <button onclick="deleteItem(${li}, ${ii}, lists, saveAndRenderList, closeAnyMenu)">✖ Ta bort</button>
  `;
  positionMenu(menu, btn);
};

window.closeAnyMenu = function() {
  const existing = document.querySelector('.item-menu');
  if (existing) existing.remove();
};

window.positionMenu = function(menu, btn) {
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
};

// --- Fade (animation, valfritt)
window.applyFade = function() {
  const app = document.getElementById("app");
  if (!app) return;
  app.classList.add('fade-enter');
  requestAnimationFrame(() => {
    app.classList.add('fade-enter-active');
    app.addEventListener('transitionend', () => {
      app.classList.remove('fade-enter', 'fade-enter-active');
    }, { once: true });
  });
};

// --- Första rendering
//window.renderAllLists();
