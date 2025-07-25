// storage.js – sparar/laddar allt i localStorage

// Ladda alla listor från localStorage
window.loadLists = function() {
  try {
    return JSON.parse(localStorage.getItem("lists") || "[]");
  } catch {
    return [];
  }
};

// Spara alla listor till localStorage
window.saveLists = function(lists) {
  localStorage.setItem("lists", JSON.stringify(lists));
};

// Ladda kategori-minne (per varunamn)
window.loadCategoryMemory = function() {
  try {
    return JSON.parse(localStorage.getItem("categoryMemory") || "{}");
  } catch {
    return {};
  }
};

// Spara kategori-minne
window.saveCategoryMemory = function(mem) {
  localStorage.setItem("categoryMemory", JSON.stringify(mem));
};

// Hämta användarnamn
window.getUser = function() {
  return localStorage.getItem("user");
};

// Sätt/uppdatera användarnamn
window.setUser = function(name) {
  localStorage.setItem("user", name);
};
