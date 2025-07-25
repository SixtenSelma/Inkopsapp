// utils.js

/**
 * Applicerar en enkel fade‑in via CSS‑klasserna .fade-enter / .fade-enter-active
 * @param {Element} [el] - Element att animera. Om ej satt används #app.
 */
export function applyFade(el) {
  const target = el instanceof Element ? el : document.getElementById("app");
  if (!target) return;
  target.classList.add('fade-enter');
  requestAnimationFrame(() => {
    target.classList.add('fade-enter-active');
    target.addEventListener('transitionend', () => {
      target.classList.remove('fade-enter', 'fade-enter-active');
    }, { once: true });
  });
}

/**
 * Tar bort eventuella öppna menyer (.item-menu)
 */
export function closeAnyMenu() {
  const existing = document.querySelector('.item-menu');
  if (existing) existing.remove();
}

/**
 * Positionerar ett absolut-positionerat meny-element vid en knapp
 * @param {HTMLElement} menuEl - Meny-elementet
 * @param {HTMLElement} btnEl - Knappen som meny ska positioneras efter
 */
export function positionMenu(menuEl, btnEl) {
  const rect = btnEl.getBoundingClientRect();
  menuEl.style.position = 'absolute';
  menuEl.style.top = `${rect.bottom + window.scrollY}px`;
  menuEl.style.left = `${Math.min(window.innerWidth - 180, rect.left + window.scrollX - 100)}px`;
  document.body.appendChild(menuEl);
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!menuEl.contains(e.target)) {
        menuEl.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}

/**
 * Skapar och visar en meny baserat på HTML-sträng
 * @param {string} html - HTML-innehåll för .item-menu
 * @param {HTMLElement} btnEl - Knapp för positionering
 * @returns {HTMLElement} - Skapat meny-element
 */
export function createMenu(html, btnEl) {
  closeAnyMenu();
  const menu = document.createElement('div');
  menu.className = 'item-menu';
  menu.innerHTML = html;
  positionMenu(menu, btnEl);
  return menu;
}
