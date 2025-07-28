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

window.showCategoryPicker = function(name, onSave) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-content">
      <h2>Kategori för "<em>${name}</em>"</h2>
      <select id="categorySelectPopup" style="width:100%; margin-top:14px; font-size:1.1rem; padding:10px; border-radius:8px; border:2px solid #2863c7;">
        ${standardKategorier.map(cat =>
          `<option value="${cat}"${cat === "🏠 Övrigt" ? " selected" : ""}>${cat}</option>`
        ).join("")}
      </select>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn-secondary">Avbryt</button>
        <button id="pickCategoryOK">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  // Stäng-knapp
  m.querySelector(".btn-secondary").onclick = () => {
    document.body.removeChild(m);
  };

  // Fokusera på select
  const select = m.querySelector("#categorySelectPopup");
  setTimeout(() => select.focus(), 100);

  // OK-knapp
  m.querySelector("#pickCategoryOK").onclick = () => {
    const value = select.value;
    document.body.removeChild(m);
    onSave(value);
  };
};
