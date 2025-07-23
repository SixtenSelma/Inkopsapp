// kategori.js – kategorier och kategori-popup

window.standardKategorier = [
  "🥦 Frukt & Grönt",
  "🍞 Bröd & Bageri",
  "🧀 Mejeri",
  "🍗 Kött, Fisk, Fågel & Chark",
  "❄️ Frysvaror",
  "🍝 Skafferi / Torrvaror",
  "🥤 Dryck",
  "🍫 Godis, Snacks & Nötter",
  "🧴 Hygien & Apotek",
  "🧽 Städ & Tvätt",
  "👶 Barn & Baby",
  "🐾 Djur",
  "🏠 Övrigt (Hem, Teknik, Kläder, Säsong)"
];

// Visa popup för att välja kategori
window.showCategoryPicker = function(name, onSave) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Kategori för "${name}"</h2>
      <select id="categorySelectPopup" style="width:100%;margin-top:14px;font-size:1.1rem;padding:10px;border-radius:8px;border:2px solid #2863c7;">
        <option value="">Välj kategori…</option>
        ${standardKategorier.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <div class="modal-actions" style="margin-top:16px;">
        <button onclick="document.body.removeChild(this.closest('.modal'))">Avbryt</button>
        <button onclick="pickCategoryOK()">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const select = document.getElementById("categorySelectPopup");
  select.focus();
  window.pickCategoryOK = () => {
    const value = select.value;
    if (!value) {
      select.style.border = "2px solid red";
      select.focus();
      return;
    }
    onSave(value);
    document.body.removeChild(m);
  };
};
