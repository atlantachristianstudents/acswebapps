// Arrow keys complement the normal Tab order outside typing and form fields.
(() => {
  function allowPaste(target) {
    const field = target?.closest?.('input, textarea, [contenteditable]:not([contenteditable="false"])');
    return !!field && field.id !== 'typing' && !field.disabled && !field.readOnly;
  }
  function blockPaste(event) {
    if (allowPaste(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  }
  document.addEventListener('paste', blockPaste, true);
  document.addEventListener('beforeinput', event => {
    if (event.inputType?.startsWith('insertFromPaste')) blockPaste(event);
  }, true);
  const shortcuts = {
    '1': '#book',
    '2': '#readJourney',
    '3': '#home',
    '4': '#friends',
    '5': '#records',
    '6': '#history',
    '\\': 'header .account',
  };
  Object.entries(shortcuts).forEach(([key, selector]) => {
    const control = document.querySelector(selector);
    if (control) control.title += ` (${key})`;
  });
  // Capture before the typing page's automatic input-focus handler.
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey ||
        event.altKey || event.shiftKey || (!Object.hasOwn(shortcuts, event.key) && !['j', 'h'].includes(event.key))) return;
    const modal = document.querySelector('#modal');
    const journeyShortcut = event.key === 'j' && modal?.open && ['records', 'journeyCompletions'].includes(modal.dataset.view);
    const historyShortcut = event.key === 'h' && modal?.open && ['history', 'profile'].includes(modal.dataset.view);
    if ((event.key === 'j' && !journeyShortcut) || (event.key === 'h' && !historyShortcut)) return;
    const menuOpen = modal?.open && ['records', 'history', 'profile', 'journeyCompletions',
      'settings', 'themes', 'customTheme', 'historyStorage'].includes(modal.dataset.view);
    if (document.querySelector('dialog[open]:not(#modal)') || (modal?.open && !menuOpen)) return;
    if (!menuOpen && typeof mode !== 'undefined' && mode === 'custom' &&
        (typeof done === 'undefined' || !done) && !document.body.classList.contains('race-lobby-open') &&
        !document.body.classList.contains('reading-mode')) return;
    const active = document.activeElement;
    if (active?.id !== 'typing' &&
        active?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (historyShortcut) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) focusLatestHistoryResult();
      return;
    }
    if (journeyShortcut) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        if (modal.dataset.view === 'journeyCompletions') openModal('records');
        else openModal('journeyCompletions');
      }
      return;
    }
    const control = document.querySelector(shortcuts[event.key]);
    if (!control || control.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      if (menuOpen && control.dataset.dialog === modal.dataset.view) {
        modal.close();
        return;
      }
      if (menuOpen && !control.dataset.dialog) modal.close();
      control.click();
    }
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
