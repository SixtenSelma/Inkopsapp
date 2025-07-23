// modal.js – återanvändbara modaler med bättre mobilhantering

window.scrollModalToTop = function() {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

// Byt namn-modal
window.showRenameDialog = function(title, currentName, onConfirm) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <input id="renameInput" value="${currentName}" autocomplete="off" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmRename()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("renameInput");
  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();
  input.select();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmRename();
  });

  window.confirmRename = () => {
    const newName = input.value.trim();
    if (newName) {
      onConfirm(newName);
      document.body.removeChild(m);
    }
  };
};

// Ny lista-modal
window.showNewListDialog = function(onConfirm) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Skapa ny lista</h2>
      <input id="modalNewListInput" placeholder="Namn på lista…" autocomplete="off" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmNewList()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("modalNewListInput");
  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmNewList();
  });

  window.confirmNewList = () => {
    const val = input.value.trim();
    if (val) {
      if (onConfirm) onConfirm(val);
      document.body.removeChild(m);
    }
  };
};

// Batch add-modal (flera varor samtidigt)
window.showBatchAddDialog = function(i, onDone) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Lägg till vara</h2>
      <input id="batchItemInput" placeholder="Skriv vara och tryck Enter…" autocomplete="off" />
      <ul id="batchPreview" class="preview-list"></ul>
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmBatchAdd()">Klar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("batchItemInput");
  const preview = document.getElementById("batchPreview");
  let added = [];

  input.focus();
  window.scrollModalToTop && window.scrollModalToTop();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      const name = input.value.trim();
      added.push(name);
      const li = document.createElement("li");
      li.textContent = name;
      preview.appendChild(li);
      input.value = "";
    }
  });

  window.confirmBatchAdd = () => {
    if (input && input.value.trim()) {
      added.push(input.value.trim());
    }
    if (onDone) onDone(added);
    document.body.removeChild(m);
  };
};
