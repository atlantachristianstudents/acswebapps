// Arrow keys complement the normal Tab order outside typing and form fields.
(() => {
  const shortcuts = {
    '1': '#book',
    '2': '#readJourney',
    '3': '#home',
    '4': '#friends',
    '\\': 'header .account',
  };
  Object.entries(shortcuts).forEach(([key, selector]) => {
    const control = document.querySelector(selector);
    if (control) control.title += ` (${key})`;
  });
  // Capture before the typing page's automatic input-focus handler.
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey ||
        event.altKey || event.shiftKey || !Object.hasOwn(shortcuts, event.key)) return;
    if (typeof mode !== 'undefined' && mode === 'custom' && !document.body.classList.contains('reading-mode')) return;
    if (document.querySelector('dialog[open]')) return;
    const active = document.activeElement;
    if (active?.id !== 'typing' &&
        active?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const control = document.querySelector(shortcuts[event.key]);
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) control.click();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const active = document.activeElement;
    if (active?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="spinbutton"], [role="region"]')) return;
    const scope = document.querySelector('dialog[open]') || document;
    const controls = Array.from(scope.querySelectorAll('a[href], button, input, textarea, select, [tabindex], [contenteditable="true"]'))
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') &&
        !element.closest('[hidden], [inert]') && element.getClientRects().length &&
        getComputedStyle(element).visibility !== 'hidden');
    if (!controls.length) return;
    const index = controls.indexOf(active);
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    let next = controls[index < 0 ? (forward ? 0 : controls.length - 1) : index + (forward ? 1 : -1)];
    // Up/down follow visual rows, including the book picker grid.
    if (index >= 0 && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const origin = active.getBoundingClientRect();
      const x = origin.left + origin.width / 2;
      const y = origin.top + origin.height / 2;
      let best = Infinity;
      for (const element of controls) {
        const rect = element.getBoundingClientRect();
        const dy = (rect.top + rect.height / 2 - y) * (forward ? 1 : -1);
        if (dy <= 1) continue;
        const dx = Math.abs(rect.left + rect.width / 2 - x);
        const score = Math.hypot(dx, dy) + dx;
        if (score < best) {
          best = score;
          next = element;
        }
      }
    }
    if (next) {
      event.preventDefault();
      next.focus();
    }
  });
})();
