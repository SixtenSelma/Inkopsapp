// lists.js – hanterar inköpslistor och rendering

// ===== Initiera data =====
window.lists = loadLists();                  // Från storage.js
window.categoryMemory = (() => {
  try { return JSON.parse(localStorage.getItem('categoryMemory')) || {}; }
  catch { return {}; }
})();
window.user = getUser() || prompt("Vad heter du?");
setUser(window.user);

const app = document.getElementById("app");

// ===== Hjälpfunktioner =====

// Formatera ISO-datum till dd/MM hh:mm
window.formatDate = function(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = x => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Unika varunamn i alla listor
window.getAllUniqueItemNames = function(lists) {
  const set = new Set();
  lists.forEach(l => l.items.forEach(i => i.name && set.add(i.name.trim())));
  return Array.from(set).sort();
};

// Unika varunamn i mall-listor
window.getTemplateItemNames = function(lists) {
  const set = new Set();
  lists.forEach(l => {
    if (!l.name.startsWith('Mall:')) return;
    l.items.forEach(i => i.name && set.add(i.name.trim()));
  });
  return Array.from(set).sort();
};

// Unika varunamn i given kategori för en lista
window.getCategoryItemNames = function(list, category) {
  const set = new Set();
  list.items.forEach(i => {
    const cat = i.category || '🏠 Övrigt (Hem, Teknik, Kläder, Säsong)';
    if (cat === category && i.name) set.add(i.name.trim());
  });
  return Array.from(set).sort();
};

// ===== Modal: välj kategori via <select> =====
function chooseCategory(itemName) {
  return new Promise(resolve => {
    const overlay = document.createElement('div'); overlay.className = 'modal'; overlay.style.backdropFilter = 'blur(3px)';
    const box = document.createElement('div'); box.className = 'modal-content';
    box.innerHTML = `<h2>Ange kategori för<br><em>${itemName}</em></h2>`;
    const sel = document.createElement('select');
    standardKategorier.forEach(cat => {
      const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat;
      sel.appendChild(opt);
    });
    box.appendChild(sel);
    const actions = document.createElement('div'); actions.className = 'modal-actions';
    const btnCancel = document.createElement('button'); btnCancel.textContent = 'Avbryt'; btnCancel.className = 'btn-secondary';
    btnCancel.onclick = () => { cleanup(); resolve(null); };
    const btnOk = document.createElement('button'); btnOk.textContent = 'OK';
    btnOk.onclick = () => { cleanup(); resolve(sel.value); };
    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function cleanup(){ document.body.removeChild(overlay); }
  });
}

// ===== Dialog: Lägg till varor =====
window.showAddItemsDialog = function({ allaVaror, mallVaror, kategoriVaror, onDone }) {
  // Autocomplete-sammanslagning
  const suggestions = Array.from(new Set([
    ...(allaVaror||[]), ...(mallVaror||[]), ...(kategoriVaror||[])
  ])).sort();

  const overlay = document.createElement('div'); overlay.className = 'modal'; overlay.style.backdropFilter = 'blur(4px)';
  const box = document.createElement('div'); box.className = 'modal-content'; overlay.appendChild(box);

  const title = document.createElement('h2'); title.textContent = 'Lägg till varor'; box.appendChild(title);

  // datalist för autocomplete
  const dl = document.createElement('datalist'); dl.id = 'add-items-suggestions';
  suggestions.forEach(s => { const o = document.createElement('option'); o.value = s; dl.appendChild(o); });
  box.appendChild(dl);

  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = 'Varunamn, [komplement]'; input.setAttribute('list', 'add-items-suggestions');
  box.appendChild(input);

  const preview = document.createElement('ul'); preview.className = 'add-batch-preview-list'; box.appendChild(preview);
  let selected = [];
  function renderChips(){
    preview.innerHTML = '';
    selected.forEach((name,i) => {
      const li = document.createElement('li'); li.textContent = name;
      const btn = document.createElement('button'); btn.className = 'remove-btn';
      btn.onclick = ()=>{ selected.splice(i,1); renderChips(); };
      li.appendChild(btn); preview.appendChild(li);
    });
  }
  function addCurrent(){
    const raw = input.value.trim(); if(!raw) return;
    if(!selected.includes(raw)){ selected.push(raw); renderChips(); }
    input.value = '';
  }
  input.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addCurrent(); }});

  const actions = document.createElement('div'); actions.className = 'modal-actions';
  const btnCancel = document.createElement('button'); btnCancel.textContent='Avbryt'; btnCancel.className='btn-secondary'; btnCancel.onclick=cleanup;
  const btnDone = document.createElement('button'); btnDone.textContent='Klar';
  btnDone.onclick = () => { addCurrent(); cleanup(); onDone(selected); };
  actions.appendChild(btnCancel); actions.appendChild(btnDone); box.appendChild(actions);

  document.body.appendChild(overlay); input.focus();
  function cleanup(){ document.body.removeChild(overlay); }
};

// ===== Rendera alla listor =====
window.renderAllLists = function() {
  const active = lists.filter(l=>!l.archived);
  const archived = lists.filter(l=>l.archived);

  const sortedActive = [...active].sort((a,b)=>{
    const tA=a.name.startsWith('Mall:'),tB=b.name.startsWith('Mall:'); if(tA!==tB) return tA?1:-1;
    return a.name.localeCompare(b.name,'sv');
  });
  const sortedArchived = [...archived].sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));

  let html = `<div class="top-bar"><h1>Inköpslista</h1><div class="user-badge">${user}<button class="icon-button" onclick="changeUser()">🖊</button></div></div><ul class="list-wrapper">`;
  sortedActive.forEach(list=>{
    const done=list.items.filter(i=>i.done).length;
    const total=list.items.length;
    const pct=total?Math.round(done/total*100):0;
    const extra=list.name.startsWith('Mall:')?'list-card-template':'';
    html += `<li class="list-item" onclick="viewListByName('${list.name.replace(/'/g,"\\'")}')"><div class="list-card ${extra}"><div class="list-card-header"><span class="list-card-title">${list.name}</span><button class="menu-btn" onclick="event.stopPropagation();openListMenuByName('${list.name.replace(/'/g,"\\'")}',this)">⋮</button></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-text">${done} / ${total} klara</div></div></li>`;
  });
  html += `</ul>`;
  if(sortedArchived.length){
    html += `<div class="archived-section"><button class="archived-toggle" onclick="toggleArchivedSection(event)"><span id="archived-arrow">▼</span> Arkiverade listor (${sortedArchived.length})</button><ul class="list-wrapper archived-lists" style="display:none;">`;
    sortedArchived.forEach(list=>{
      const dateTxt=list.archivedAt?formatDate(list.archivedAt):'';
      html += `<li class="list-item archived" onclick="viewListByName('${list.name.replace(/'/g,"\\'")}')"><div class="list-card archived-list-card"><div class="list-card-header"><span class="list-card-title">${list.name}</span><button class="menu-btn" onclick="event.stopPropagation();openListMenuByName('${list.name.replace(/'/g,"\\'")}',this)">⋮</button></div><div class="progress-text">Arkiverad: ${dateTxt}</div></div></li>`;
    });
    html += `</ul></div>`;
  }
  html += `<div class="bottom-bar"><button onclick="showNewListDialog()">➕</button></div>`;
  app.innerHTML = html;

  window.toggleArchivedSection = function(e){ e.stopPropagation(); const btn=e.currentTarget,ul=btn.nextElementSibling; if(ul.style.display==='none'){ul.style.display='block'; btn.querySelector('#archived-arrow').textContent='▲';}else{ul.style.display='none'; btn.querySelector('#archived-arrow').textContent='▼';}};
  applyFade && applyFade();
};

// ===== Visa / öppna meny via namn =====
window.viewListByName = name => { const idx=lists.findIndex(l=>l.name===name); if(idx>=0) renderListDetail(idx); };
window.openListMenuByName = (name,btn) => { const idx=lists.findIndex(l=>l.name===name); if(idx>=0) openListMenu(idx,btn); };

// ===== Rendera detaljvy =====
window.renderListDetail = function(i) {
  const list=lists[i];
  let hide=localStorage.getItem('hideDone')!=='false';
  const all=list.items.map((it,j)=>({...it,idx:j}));
  const grouped={}; standardKategorier.forEach(c=>grouped[c]=[]);
  all.forEach(item=>{ const cat=item.category||'🏠 Övrigt (Hem, Teknik, Kläder, Säsong)'; grouped[cat]?(grouped[cat].push(item)):grouped[cat]=[item]; });
  const filled=[],empty=[];
  Object.entries(grouped).forEach(([cat,items])=>{ const vis=hide?items.filter(x=>!x.done):items; (vis.length?filled:empty).push({cat,items:vis}); });
  const final=hide?filled:[...filled,...empty]; final.sort((a,b)=>standardKategorier.indexOf(a.cat)-standardKategorier.indexOf(b.cat));
  let html=`<div class="top-bar"><span class="back-arrow" onclick="renderAllLists()" style="margin-right:10px;display:flex;align-items:center;cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="28"height="28"viewBox="0 0 24 24"fill="none"stroke="#232323"stroke-width="2.5"stroke-linecap="round"stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span><h1 class="back-title" style="margin:0;font-size:1.45em;font-weight:700;">${list.name}</h1><div style="flex:1"></div><label class="hide-done-label" style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="hideDoneCheckbox"${hide?' checked':''}style="margin-right:7px;"/><span class="hide-done-text">Dölj klara</span></label></div><div class="category-list">`;
  final.forEach(({cat,items})=>{
    html+=`<div class="category-block"><h3 class="category-heading">${cat}<button class="category-add-btn"onclick="addItemViaCategory(${i},'${cat}')">+</button></h3><ul class="todo-list">`;
    if(items.length){
      const sorted=[...items.filter(x=>!x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv')),...items.filter(x=>x.done).sort((a,b)=>a.name.localeCompare(b.name,'sv'))];
      sorted.forEach(item=>{
        const label=item.done?`<s>${item.name}</s>`:`<strong>${item.name}</strong>`;
        const note=item.note?`<span class="left">${item.note}</span>`:`<span class="left"></span>`;
        const sig=(item.done&&item.doneBy)?`<span class="right">${item.doneBy} ${formatDate(item.doneAt)}</span>`:`<span class="right"></span>`;
        html+=`<li class="todo-item ${item.done?'done':''}"><input type="checkbox"${item.done?' checked':''}onchange="toggleItem(${i},${item.idx},lists,user,saveAndRenderList)"/><span class="item-name">${label}<div class="item-row2">${note}${sig}</div></span><button class="menu-btn"onclick="openItemMenu(${i},${item.idx},this)">⋮</button></li>`;
      });
    } else html+='<p class="empty-category">Inga varor i denna kategori</p>';
    html+='</ul></div>';
  });
  html+='</div><div class="bottom-bar"><button onclick="addItemsWithCategory('+i+')">➕</button></div>';
  app.innerHTML=html;
  const chk=document.getElementById('hideDoneCheckbox'); if(chk) chk.onchange=()=>{localStorage.setItem('hideDone',chk.checked?'false':'true'); renderListDetail(i);};
  applyFade&&applyFade();
};

// ===== Lägg till via kategori-knapp =====
window.addItemViaCategory = function(listIndex,category){
  showAddItemsDialog({
    allaVaror:getAllUniqueItemNames(lists),
    mallVaror:getTemplateItemNames(lists),
    kategoriVaror:getCategoryItemNames(lists[listIndex],category),
    onDone:added=>{
      if(!added||!added.length)return;
      added.forEach(raw=>{
        const [namePart,...noteParts]=raw.split(',');
        const name=namePart.trim();
        const note=noteParts.join(',').trim();
        if(!lists[listIndex].items.some(i=>i.name.trim().toLowerCase()===name.toLowerCase())){
          lists[listIndex].items.push({name,note,done:false,category});
        }
      });
      saveLists(lists); renderListDetail(listIndex);
    }
  });
};

// ===== Lägg till via plusknapp =====
window.addItemsWithCategory = function(listIndex=null){
  let i=listIndex; if(i===null){ if(!lists.length)return; let val=prompt('Vilken lista vill du lägga till i?\n'+lists.map((l,idx)=>(idx+1)+': '+l.name).join('\n')); if(!val)return; i=parseInt(val,10)-1; if(isNaN(i)||i<0||i>=lists.length)return; }
  showAddItemsDialog({
    allaVaror:getAllUniqueItemNames(lists),
    mallVaror:getTemplateItemNames(lists),
    kategoriVaror:[],
    onDone:async added=>{
      if(!added||!added.length)return;
      for(const raw of added){
        const [namePart,...noteParts]=raw.split(','); const name=namePart.trim(); const note=noteParts.join(',').trim();
        if(lists[i].items.some(it=>it.name.trim().toLowerCase()===name.toLowerCase())) continue;
        let cat=window.categoryMemory[name]; if(!cat){ cat=await chooseCategory(name)||'🏠 Övrigt (Hem, Teknik, Kläder, Säsong)'; window.categoryMemory[name]=cat; try{localStorage.setItem('categoryMemory',JSON.stringify(window.categoryMemory));}catch{} }
        lists[i].items.push({name,note,done:false,category:cat});
      }
      saveLists(lists); renderListDetail(i);
    }
  });
};

// ===== CRUD =====
window.showNewListDialog = function() {
  showNewListModal(listName => {
    if (listName && listName.trim()) {
      lists.push({ name: listName.trim(), items: [] });
      saveLists(lists);
      renderAllLists();
    }
  });
};

window.renameList = function(i) {
  const current = lists[i].name;
  showRenameDialog("Byt namn på lista", current, newName => {
    if (newName && newName.trim()) {
      lists[i].name = newName.trim();
      saveLists(lists);
      renderAllLists();
      if (typeof closeAnyMenu === 'function') closeAnyMenu();
    }
  });
};

window.deleteList = function(i) {
  if (confirm("Vill du ta bort listan permanent?")) {
    lists.splice(i, 1);
    saveLists(lists);
    renderAllLists();
    if (typeof closeAnyMenu === 'function') closeAnyMenu();
  }
};

window.archiveList = function(i) {
  lists[i].archived = true;
  lists[i].archivedAt = new Date().toISOString();
  saveLists(lists);
  renderAllLists();
  if (typeof closeAnyMenu === 'function') closeAnyMenu();
};

window.unarchiveList = function(i) {
  delete lists[i].archived;
  delete lists[i].archivedAt;
  saveLists(lists);
  renderAllLists();
  if (typeof closeAnyMenu === 'function') closeAnyMenu();
};

window.saveAndRenderList = function(i) {
  saveLists(lists);
  renderListDetail(i);
};

// ===== Init =====
if(typeof renderAllLists==='function') renderAllLists();
