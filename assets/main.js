const user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

let lists = JSON.parse(localStorage.getItem("lists") || "[]");

function saveAndRender() {
    localStorage.setItem("lists", JSON.stringify(lists));
    renderAllLists();
}

function saveAndRenderList(listIndex) {
    localStorage.setItem("lists", JSON.stringify(lists));
    renderListDetail(listIndex);
}

const appContainer = document.getElementById("app");

function renderAllLists() {
    const listItems = lists.map((list, index) => {
        const done = list.items.filter(i => i.done).length;
        const total = list.items.length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        return `
        <div class="list-card">
            <div class="list-card-header">
                <span class="list-name" onclick="window.viewList(${index})">${list.name}</span>
                <button class="edit-btn" onclick="event.stopPropagation(); window.renameList(${index})">⚙️</button>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${percent}%;"></div>
            </div>
            <div class="progress-label">${done} / ${total}</div>
        </div>
        `;
    }).join("");

    appContainer.innerHTML = `
        <h1>
            <span>Mina listor</span>
            <div class="user-info">
                ${user} <button class="edit-btn" onclick="window.changeUser()">⚙️</button>
            </div>
        </h1>
        <div class="lists-wrapper">
            ${listItems || "<p>Inga listor än.</p>"}
        </div>
        <div class="add-new-container center">
            <button onclick="window.openNewListDialog()">➕ Ny lista</button>
        </div>
        <dialog id="newListDialog">
            <form method="dialog">
                <h3>Ny lista</h3>
                <input id="dialogListName" type="text" placeholder="Namn på listan..." required />
                <div class="dialog-buttons">
                    <button type="submit" onclick="window.confirmAddList()">Skapa</button>
                    <button onclick="window.closeNewListDialog()">Avbryt</button>
                </div>
            </form>
        </dialog>
    `;
}

function renderListDetail(listIndex) {
    const list = lists[listIndex];
    const unchecked = list.items.filter(i => !i.done);
    const checked = list.items.filter(i => i.done);

    const itemsHtml = [...unchecked, ...checked].map((item, i) => `
        <li class="todo-item ${item.done ? 'done' : ''}">
            <input type="checkbox" ${item.done ? "checked" : ""} onchange="window.toggleItem(${listIndex}, ${list.items.indexOf(item)})" />
            <span class="item-name">
                ${item.done ? `<s>${item.name}</s>` : item.name}
                ${item.doneBy ? `<small><br><em>${item.doneBy}, ${item.doneAt}</em></small>` : ""}
            </span>
            <button class="delete-btn" onclick="window.deleteItem(${listIndex}, ${list.items.indexOf(item)})">🗑️</button>
        </li>
    `).join("");

    appContainer.innerHTML = `
        <h1>${list.name}</h1>
        <ul>${itemsHtml || "<li>Inga varor än.</li>"}</ul>
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

window.addList = (name) => {
    if (!name) return;
    lists.push({ name, items: [] });
    saveAndRender();
};

window.renameList = (index) => {
    const newName = prompt("Nytt namn på listan:", lists[index].name);
    if (newName) {
        lists[index].name = newName;
        saveAndRender();
    }
};

window.deleteList = (index) => {
    if (confirm(`Ta bort listan "${lists[index].name}"?`)) {
        lists.splice(index, 1);
        saveAndRender();
    }
};

window.viewList = (index) => renderListDetail(index);

window.addItem = (listIndex) => {
    const input = document.getElementById("newItemInput");
    if (!input.value) return;
    lists[listIndex].items.push({ name: input.value, done: false });
    saveAndRenderList(listIndex);
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

window.changeUser = () => {
    const newUser = prompt("Ange nytt namn:", user);
    if (newUser) {
        localStorage.setItem("user", newUser);
        location.reload();
    }
};

window.openNewListDialog = () => {
    document.getElementById("newListDialog").showModal();
};

window.closeNewListDialog = () => {
    document.getElementById("newListDialog").close();
};

window.confirmAddList = () => {
    const input = document.getElementById("dialogListName");
    if (input.value) {
        window.addList(input.value);
        window.closeNewListDialog();
    }
};

window.renderAllLists = renderAllLists;
renderAllLists();
