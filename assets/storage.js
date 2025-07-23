// storage.js – sparar/laddar allt i localStorage
window.loadLists = function() {
  return JSON.parse(localStorage.getItem("lists") || "[]");
};

window.saveLists = function(lists) {
  localStorage.setItem("lists", JSON.stringify(lists));
};

window.loadCategoryMemory = function() {
  return JSON.parse(localStorage.getItem("categoryMemory") || "{}");
};

window.saveCategoryMemory = function(mem) {
  localStorage.setItem("categoryMemory", JSON.stringify(mem));
};

window.getUser = function() {
  return localStorage.getItem("user");
};

window.setUser = function(name) {
  localStorage.setItem("user", name);
};
