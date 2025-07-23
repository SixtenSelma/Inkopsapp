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
    const pct = total ? Math.round((done/total)*100) : 0;
    return `
      <li class="list-item" onclick="viewList(${i})">
        <div class="list-card">
          <div class="list-card-header">
            <span class="list-card-title">${list.name}</span>
            <button class="icon-button" onclick="event.stopPropagation(); renameList(${i})">⚙️</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${done} / ${total} klara</div>
        </div>
      </li>`;
  }).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>Mina listor</h1>
      <div class="user-badge">${user}<button class="icon-button" onclick="changeUser()">⚙️</button></div>
    </div>
    <ul class="list-wrapper">
      ${listCards || '<p class="no-lists">Inga listor än.</p>'}
    </ul>
    <div class="bottom-bar">
      <button onclick="showNewListDialog()">➕</button>
    </div>
  `;

  applyFade();
}

// --- Rendera detaljvy ---
function renderListDetail(i) {
  const list = lists[i];
  const unchecked = list.items.filter(x => !x.done);
  const checked = list.items.filter(x => x.done);
  const items = [...unchecked, ...checked].map((item, idx) => `
    <li class="todo-item ${item.done?'done':''}">
      <input type="checkbox" ${item.done?'checked':''} onchange="toggleItem(${i},${idx})"/>
      <span class="item-name">
        ${item.done?`<s>${item.name}</s>`:item.name}
        ${item.done && item.doneBy?`<small>${item.doneBy}, ${item.doneAt}</small>`:''}
      </span>
      <button class="delete-btn" onclick="deleteItem(${i},${idx})">🗑️</button>
    </li>`).join("");

  app.innerHTML = `
    <div class="top-bar">
      <h1>${list.name}</h1>
      <div class="user-badge">${user}<button class="icon-button" onclick="changeUser()">⚙️</button></div>
    </div>
    <ul class="todo-list">${items || '<li>Inga varor än.</li>'}</ul>
    <div class="add-new-container">
      <input id="newItemInput" placeholder="Ny vara…" />
      <button onclick="addItem(${i})">Lägg till</button>
      <button class="btn-secondary" onclick="renderAllLists()">⬅️ Tillbaka</button>
    </div>
  `;

  document.getElementById("newItemInput").focus();
  applyFade();
}

// --- Globala funktioner ---
window.viewList    = i => renderListDetail(i);
window.addItem     = i => {
  const v = document.getElementById("newItemInput").value.trim();
  if (!v) return;
  lists[i].items.push({name:v,done:false});
  saveAndRenderList(i);
};
window.deleteItem  = (li,ii) => { lists[li].items.splice(ii,1); saveAndRenderList(li); };
window.toggleItem  = (li,ii) => {
  const it = lists[li].items[ii];
  it.done = !it.done;
  if(it.done){ it.doneBy=user; it.doneAt=new Date().toLocaleString();}
  else { delete it.doneBy; delete it.doneAt; }
  saveAndRenderList(li);
};
window.addList     = name => {
  if (!name.trim()) return;
  lists.push({name,items:[]});
  saveAndRender();
};
window.renameList  = i => {
  const n = prompt("Nytt namn:", lists[i].name);
  if(n){ lists[i].name=n; saveAndRender(); }
};
window.changeUser  = () => {
  const n = prompt("Vad heter du?", user);
  if(n){ user=n; localStorage.setItem("user",user); saveAndRender(); }
};

// --- Ny lista-dialog ---
window.showNewListDialog = () => {
  const m = document.createElement("div");
  m.className="modal";
  m.innerHTML=`
    <div class="modal-content">
      <h2>Ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewList()">Skapa</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById("modalNewListInput").focus(),50);
};
window.confirmNewList = () => {
  const inp = document.getElementById("modalNewListInput");
  if(inp && inp.value.trim()){ addList(inp.value.trim()); document.body.removeChild(document.querySelector('.modal')); }
};

// --- Animation & start ---
function applyFade(){
  app.classList.add('fade-enter');
  requestAnimationFrame(()=>{
    app.classList.add('fade-enter-active');
    app.addEventListener('transitionend',()=>{
      app.classList.remove('fade-enter','fade-enter-active');
    },{once:true});
  });
}
window.renderAllLists = renderAllLists;
renderAllLists();
