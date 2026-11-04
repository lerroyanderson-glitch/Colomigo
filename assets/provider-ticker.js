'use strict';
const providerNetwork = document.querySelector('.provider-network');
if (providerNetwork) {
  const pauseTicker = providerNetwork.querySelector('.ticker-control');
  pauseTicker.hidden = false;
  pauseTicker.addEventListener('click', () => {
    const paused = providerNetwork.classList.toggle('is-paused');
    pauseTicker.textContent = paused ? 'Play' : 'Pause';
    pauseTicker.setAttribute('aria-label', paused ? 'Play provider ticker' : 'Pause provider ticker');
  });
}
