(() => {
  const button = document.querySelector('#installApp');
  const status = document.querySelector('#offlineStatus');
  let installPrompt;
  let offlineReady = false;
  function updateStatus() {
    status.textContent = !navigator.onLine
      ? (offlineReady ? 'offline · races need internet' : 'offline')
      : (offlineReady ? 'ready offline' : '');
  }
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    button.hidden = true;
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    await prompt.userChoice;
  });
  window.addEventListener('appinstalled', () => {
    button.hidden = true;
    installPrompt = null;
  });
  updateStatus();
  if (['http:', 'https:'].includes(location.protocol) && 'serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      offlineReady = true;
      updateStatus();
    }).catch(() => {
      status.textContent = 'offline setup unavailable · retry online';
    });
  }
})();
