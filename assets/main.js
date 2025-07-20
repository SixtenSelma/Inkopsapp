
// Enkel mock av funktionalitet för inköpslistor
const user = localStorage.getItem("user") || prompt("Vad heter du?");
localStorage.setItem("user", user);

const lists = JSON.parse(localStorage.getItem("lists") || "[]");

function render() {
  const container = document.getElementById("app");
  container.innerHTML = `
    <h1>Hej, ${user}!</h1>
    <h2>Dina inköpslistor</h2>
    <ul>
      ${lists.map((l, i) => `<li onclick="viewList(${i})">${l.name} (${l.items.filter(it => it.done).length}/${l.items.length})</li>`).join("")}
    </ul>
    <input id="newList" placeholder="Ny lista" />
    <button onclick="addList()">Lägg till lista</button>
  `;
}

window.addList = () => {
  const name = document.getElementById("newList").value;
  if (!name) return;
  lists.push({ name, items: [], updated: new Date().toISOString() });
  localStorage.setItem("lists", JSON.stringify(lists));
  render();
};

window.viewList = (index) => {
  const list = lists[index];
  document.getElementById("app").innerHTML = `
    <h1>${list.name}</h1>
    <ul>
    ${list.items.map((item, i) => `
      <li>
        <input type="checkbox" ${item.done ? "checked" : ""} onchange="toggleItem(${index}, ${i})" />
        ${item.name} ${item.done ? `(✓ ${item.doneBy} - ${item.doneAt})` : ""}
      </li>`).join("")}
    </ul>
    <input id="newItem" placeholder="Ny vara" />
    <button onclick="addItem(${index})">Lägg till vara</button><br><br>
    <button onclick="render()">Tillbaka</button>
  `;
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
  lists[listIndex].updated = new Date().toISOString();
  localStorage.setItem("lists", JSON.stringify(lists));
  viewList(listIndex);
};

window.addItem = (listIndex) => {
  const name = document.getElementById("newItem").value;
  if (!name) return;
  lists[listIndex].items.push({ name, done: false });
  lists[listIndex].updated = new Date().toISOString();
  localStorage.setItem("lists", JSON.stringify(lists));
  viewList(listIndex);
};

render();
