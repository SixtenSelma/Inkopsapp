// main.js – binder ihop all logik, hanterar navigation & event
import { applyFade, closeAnyMenu, createMenu } from './utils.js';

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
    ${!list.archived
      ? `<button onclick=\"archiveList(${i})\">↘ Arkivera</button>`
      : `<button onclick=\"unarchiveList(${i})\">↺ Återställ</button>`
    }
  `;
  createMenu(html, btn);
};

window.openItemMenu = function(li, ii, btn) {
  const html = `
    <button onclick="renameItem(${li}, ${ii}, lists, saveAndRenderList, closeAnyMenu)">🖊 Byt namn</button>
    <button onclick="complementItem(${li}, ${ii}, lists, categoryMemory, saveAndRenderList, closeAnyMenu)">ⓘ Komplettera</button>
    <button onclick="deleteItem(${li}, ${ii}, lists, saveAndRenderList, closeAnyMenu)" style="color:#d44;">✖ Ta bort</button>
  `;
  createMenu(html, btn);
};

// --- Initiera första rendering ---
window.renderAllLists();
