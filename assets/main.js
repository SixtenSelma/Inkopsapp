// Hämta användare eller fråga efter namn. Samma som tidigare.
const user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

// Ladda listor från localStorage
let lists = JSON.parse(localStorage.getItem("lists") || "[]");

// Funktion för att spara och ladda om alla listor
function saveAndRender() {
    localStorage.setItem("lists", JSON.stringify(lists));
    renderAllLists();
}

// Funktion för att spara och ladda om en specifik lista
function saveAndRenderList(listIndex) {
    localStorage.setItem("lists", JSON.stringify(lists));
    renderListDetail(listIndex);
}

const appContainer = document.getElementById("app");

// --- RENDERINGSFUNKTIONER ---

// Renderar startsidan med alla inköpslistor
function renderAllLists() {
    const listItems = lists.map((list, index) => `
        <li class="list-item" onclick="window.viewList(${index})">
            <span class="list-item-name">${list.name}</span>
            <span class="list-item-count">${list.items.filter(it => it.done).length} / ${list.items.length}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); window.deleteList(${index})">🗑️</button>
        </li>
    `).join("");

    appContainer.innerHTML = `
        <h1>Hej, ${user}!</h1>
        <h2>Dina inköpslistor</h2>
        <ul>${listItems}</ul>
        <div class="add-new-container">
            <input id="newListInput" type="text" placeholder="Namn på ny lista...">
            <button onclick="window.addList()">Skapa lista</button>
        </div>
    `;
    document.getElementById("newListInput").focus();
}

// Renderar detaljvyn för en specifik lista
function renderListDetail(listIndex) {
    const list = lists[listIndex];

    // Separera klara och ej klara varor
    const uncheckedItems = list.items.filter(item => !item.done);
    const checkedItems = list.items.filter(item => item.done);

    const itemsHtml = [...uncheckedItems, ...checkedItems].map((item, itemIndex) => `
        <li class="todo-item ${item.done ? 'done' : ''}">
            <input type="checkbox" ${item.done ? "checked" : ""} onchange="window.toggleItem(${listIndex}, ${itemIndex})" />
            <span class="item-name">
                ${item.done ? `<s>${item.name}</s>` : item.name}
                ${item.done && item.doneBy ? `<small><br><em>${item.doneBy}, ${item.doneAt}</em></small>` : ""}
            </span>
            <button class="delete-btn" onclick="window.deleteItem(${listIndex}, ${itemIndex})">🗑️</button>
        </li>
    `).join("");

    appContainer.innerHTML = `
        <h1>${list.name}</h1>
        <ul>${itemsHtml || '<li>Inga varor än.</li>'}</ul>
        <div class="add-new-container">
            <input id="newItemInput" type="text" placeholder="Ny vara...">
            <button onclick="window.addItem(${listIndex})">Lägg till</button>
        </div>
        <div class="add-new-container">
            <button class="btn-secondary" onclick="window.renderAllLists()">Tillbaka till alla listor</button>
        </div>
    `;
    document.getElementById("newItemInput").focus();
}


// --- FUNKTIONALITET (exponerad på window-objektet) ---

// Lägg till en ny lista
window.addList = () => {
    const input = document.getElementById("newListInput");
    if (!input.value) return;
    lists.push({ name: input.value, items: [] });
    saveAndRender();
};

// Ta bort en lista
window.deleteList = (index) => {
    if (confirm(`Är du säker på att du vill ta bort listan "${lists[index].name}"?`)) {
        lists.splice(index, 1);
        saveAndRender();
    }
};

// Visa en specifik lista
window.viewList = (index) => {
    renderListDetail(index);
};

// Lägg till en vara i en lista
window.addItem = (listIndex) => {
    const input = document.getElementById("newItemInput");
    if (!input.value) return;
    lists[listIndex].items.push({ name: input.value, done: false });
    saveAndRenderList(listIndex);
};

// Ta bort en vara från en lista
window.deleteItem = (listIndex, itemIndex) => {
    lists[listIndex].items.splice(itemIndex, 1);
    saveAndRenderList(listIndex);
};

// Checka i/ur en vara
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

// Gör renderAllLists globalt
window.renderAllLists = renderAllLists;

// --- STARTA APPLIKATIONEN ---
renderAllLists();
