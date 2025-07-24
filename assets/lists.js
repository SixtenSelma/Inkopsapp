// lists.js – hanterar inköpslistor och rendering

// === Hjälpfunktion: formatera datum
window.formatDate = function(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = x => String(x).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};

window.lists = loadLists();                   // Från storage.js
window.categoryMemory = loadCategoryMemory();  // Från storage.js
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// === Renderar alla listor ===
window.renderAllLists = function() {
  const listCards = lists.map((list, i) => {
    const done  = list.items.filter(x => x.done).length;
    const total = list.items.length;
    const pct   = total ? Math.round((done/total)*100) : 0;
    return `
      <li class="list-item" onclick="viewList(${i})">
        <div class="list-card">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="menu-btn" onclick="event.stopPropagation(); openListMenu(${i}, this)">⋮</button>
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
  applyFade && applyFade();
};

// === Renderar en enskild lista ===
window.renderListDetail = function(i) {
  const list = lists[i];

  // Hämta inställning för "dölj klara"
  let hideDone = true;
  try { hideDone = localStorage.getItem("hideDone")!=="false"; } catch {}

  // Kopiera in realIdx
  const allItems = list.items.map((item, realIdx) => ({ ...item, realIdx }));

  // Gruppindelning på kategori
  const grouped = {};
  standardKategorier.forEach(cat => grouped[cat]=[]);
  allItems.forEach(item => {
    const cat = item.category || "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)";
    (grouped[cat]||=[]).push(item);
  });

  // Dela upp i kategorier med varor resp. tomma
  const withItems = [], emptyCats = [];
  Object.entries(grouped).forEach(([cat, items]) => {
    let filtered = items;
    if (hideDone) filtered = items.filter(x=>!x.done);
    if (filtered.length) withItems.push({cat, items:filtered});
    else emptyCats.push({cat, items:[]});
  });

  // Behåll originalordning
  const orderIndex = c => standardKategorier.indexOf(c);
  withItems.sort((a,b)=>orderIndex(a.cat)-orderIndex(b.cat));
  emptyCats.sort((a,b)=>orderIndex(a.cat)-orderIndex(b.cat));

  const finalCats = hideDone
    ? withItems
    : [...withItems, ...emptyCats];

  // Bygg HTML
  const itemsHTML = finalCats.map(({cat, items})=>{
    // Sortera ej klara först, sen klara, båda i namnordning
    const sorted = [
      ...items.filter(x=>!x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv')),
      ...items.filter(x=> x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv'))
    ];

    // Generera list-items eller tom-kategori-text
    const listInner = sorted.length
      ? sorted.map(item=>{
          let row1 = item.done
            ? `<s>${item.name}</s>`
            : `<strong>${item.name}</strong>`;
          let row2 = '';
          if(item.done && item.doneBy) row2 += `${item.doneBy} ${formatDate(item.doneAt)}`;
          if(item.note){
            if(row2) row2 += ' – ';
            row2 += `<span class="item-note">${item.note}</span>`;
          }
          return `
            <li class="todo-item ${item.done?'done':''}">
              <input type="checkbox" ${item.done?'checked':''}
                     onchange="toggleItem(${i},${item.realIdx}, window.lists, window.user, window.saveAndRenderList)" />
              <span class="item-name">
                <span>${row1}</span>
                ${row2?`<small>${row2}</small>`:''}
              </span>
              <button class="menu-btn" onclick="openItemMenu(${i},${item.realIdx},this)">⋮</button>
            </li>`;
        }).join('')
      : `<p class="empty-category">Inga varor i denna kategori</p>`;

    return `
      <div class="category-block">
        <h3 class="category-heading">
          ${cat}
          <button class="category-add-btn"
                  title="Lägg till vara i ${cat}"
                  onclick="addItemViaCategory(${i}, '${cat}')">+</button>
        </h3>
        <ul class="todo-list">${listInner}</ul>
      </div>`;
  }).join('');

  app.innerHTML = `
    <div class="top-bar">
      <span class="back-arrow" onclick="renderAllLists()">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
             stroke="#232323" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </span>
      <h1 class="back-title">${list.name}</h1>
      <div style="flex:1"></div>
      <label class="hide-done-label">
        <input id="hideDoneCheckbox" type="checkbox" ${hideDone?'checked':''}/>
        <span class="hide-done-text">Dölj klara</span>
      </label>
    </div>
    <div class="category-list">
      ${itemsHTML||'<p>Inga varor än.</p>'}
    </div>
    <div class="bottom-bar">
      <button onclick="addItemsWithCategory(${i})" title="Lägg till vara">➕</button>
    </div>
  `;

  // Lyssna på Dölj-klara-checkbox
  const chk = document.getElementById("hideDoneCheckbox");
  if(chk){
    chk.onchange = ()=>{
      localStorage.setItem("hideDone", chk.checked?"true":"false");
      renderListDetail(i);
    };
  }

  applyFade && applyFade();
};

// === Lägg till via kategori-knapp ===
window.addItemViaCategory = function(listIndex, category){
  const allNames = getAllUniqueItemNames(lists);

  function doAdd(name, cat){
    lists[listIndex].items.push({name, note:"", done:false, category:cat});
    categoryMemory[name.trim().toLowerCase()] = cat;
    saveCategoryMemory(categoryMemory);
    saveLists(lists);
    renderListDetail(listIndex);
  }

  showRenameDialog(
    `Lägg till vara i "${category}"`, "", name=>{
      if(!name) return;
      const key = name.trim().toLowerCase();
      const prev = categoryMemory[key];
      if(prev && prev!==category){
        if(confirm(`Byta kategori från "${prev}" till "${category}"?`)){
          doAdd(name, category);
        } else {
          doAdd(name, prev);
        }
      } else {
        doAdd(name, category);
      }
    },
    allNames
  );
};

// === Lägg till varor med kategori (batch) ===
window.addItemsWithCategory = function(listIndex){
  showBatchAddDialog(listIndex, added=>{
    if(!added||!added.length) return;
    let queue = [...added];
    (function next(){
      if(!queue.length){
        saveLists(lists);
        renderListDetail(listIndex);
        return;
      }
      const raw = queue.shift();
      const {name, note} = splitItemInput(raw);
      const key = name.trim().toLowerCase();
      const suggested = categoryMemory[key];
      if(suggested){
        lists[listIndex].items.push({name, note, done:false, category:suggested});
        next();
      } else {
        showCategoryPicker(name, chosen=>{
          lists[listIndex].items.push({name, note, done:false, category:chosen});
          categoryMemory[key] = chosen;
          saveCategoryMemory(categoryMemory);
          next();
        });
      }
    })();
  });
};

// === Skapa ny lista (popup) ===
window.showNewListDialog = function(){
  showNewListModal(name=>{
    lists.push({name, items:[]});
    saveLists(lists);
    renderAllLists();
  });
};

// === Byt namn på lista ===
window.renameList = function(i){
  showRenameDialog("Byt namn på lista", lists[i].name, newName=>{
    lists[i].name = newName;
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  });
};

// === Ta bort lista ===
window.deleteList = function(i){
  if(confirm("Vill du ta bort listan permanent?")){
    lists.splice(i,1);
    saveLists(lists);
    renderAllLists();
    closeAnyMenu && closeAnyMenu();
  }
};

// Gör saveAndRenderList globalt för toggleItem
window.saveAndRenderList = function(i){
  saveLists(lists);
  renderListDetail(i);
};

// Initiera första renderingen
if(typeof renderAllLists==="function") renderAllLists();
