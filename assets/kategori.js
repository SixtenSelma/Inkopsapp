// kategori.js – kategorier och kategori-popup

// Globala standardkategorier (ändra ordning/rubriker vid behov)
window.standardKategorier = [
  "🥦 Frukt & Grönt",
  "🍞 Bröd & Bageri",
  "🧀 Mejeri",
  "🍗 Chark(Kött, Fisk, Fågel)",
  "❄️ Frysvaror",
  "🍝 Skafferi / Torrvaror",
  "🥤 Dryck",
  "🍫 Godis, Snacks & Nötter",
  "🧴 Hygien & Apotek",
  "🧽 Städ & Tvätt",
  "👶 Barn & Baby",
  "🐾 Djur",
  "🏠 Övrigt"
];

// Visa popup för att välja kategori – används vid komplettering av vara och ibland batch add
window.showCategoryPicker = function(name, onSave) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Kategori för "${name}"</h2>
      <select id="categorySelectPopup" style="width:100%;margin-top:14px;font-size:1.1rem;padding:10px;border-radius:8px;border:2px solid #2863c7;">
        <option value="">Välj kategori…</option>
        ${standardKategorier
          .map(cat => `<option value="${cat}">${cat}</option>`)
          .join("")}
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
  window.scrollModalToTop && window.scrollModalToTop();
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
