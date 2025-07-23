// modal.js – återanvändbara modaler
window.showRenameDialog = function(title, currentName, onConfirm) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <input id="renameInput" value="${currentName}" />
      <div class="modal-actions">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="confirmRename()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const input = document.getElementById("renameInput");
  input.focus();
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
