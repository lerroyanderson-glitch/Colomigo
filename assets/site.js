'use strict';
document.body.classList.add('js-ready');
document.getElementById('year').textContent = new Date().getFullYear();
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuButton.hidden = false;
function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});
const copyButton = document.getElementById('copy-email');
copyButton.hidden = false;
copyButton.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText('leroy@colomigo.com');
    status.textContent = 'Email address copied.';
  } catch {
    status.textContent = 'Please copy the address above, or select it to open your email app.';
  }
});
const briefDialog = document.getElementById('brief-dialog');
const privacyDialog = document.getElementById('privacy-dialog');
const briefLink = document.getElementById('open-brief');
const privacyButton = document.getElementById('privacy-open');
if (typeof briefDialog.showModal === 'function') {
  function openDialog(dialog) {
    dialog.showModal();
    document.body.classList.add('dialog-active');
  }
  [briefDialog, privacyDialog].forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => document.body.classList.remove('dialog-active'));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  briefLink.addEventListener('click', event => { event.preventDefault(); openDialog(briefDialog); });
  privacyButton.hidden = false;
  privacyButton.addEventListener('click', () => openDialog(privacyDialog));
}
document.getElementById('brief-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const value = key => String(data.get(key) || '').trim();
  const company = value('company');
  if (!company) return;
  const subject = 'Colo-Migo project inquiry — ' + company;
  const body = [
    'Hello LeRoy,', '', 'I would like to discuss a project.',
    '', 'Company: ' + company,
    'Project type: ' + value('project'),
    'Preferred market: ' + (value('market') || 'To be determined'),
    'Space / power needs: ' + (value('capacity') || 'To be determined'),
    'Target timeline: ' + (value('timeline') || 'To be determined'),
    '', 'Additional details:', value('details'), '', 'Thank you,'
  ].join('\n');
  window.location.href = 'mailto:leroy@colomigo.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  document.getElementById('brief-status').textContent =
    'Your email app should open with a draft. Review it and send when ready. If it does not open, email leroy@colomigo.com directly.';
});

// Enable the live scheduler only after the owner's real Calendly URL is set.
// Until then, the call request remains a working email link, including without JS.
function getCalendlyUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' ||
        !['calendly.com', 'www.calendly.com'].includes(url.hostname) ||
        url.username || url.password || url.pathname.replaceAll('/', '') === '') return '';
    return url.href;
  } catch {
    return '';
  }
}

const schedulingUrl = getCalendlyUrl(window.COLOMIGO_BOOKING?.url);
if (schedulingUrl) {
  const bookCall = document.getElementById('book-call');
  bookCall.href = schedulingUrl;
  bookCall.target = '_blank';
  bookCall.rel = 'noopener noreferrer';
  bookCall.childNodes[0].textContent = 'Choose a time ';
  document.getElementById('booking-description').textContent =
    'Find a time that works for you. We’ll discuss your project, answer your questions, and agree on a useful next step.';
  document.getElementById('booking-note').textContent =
    'Opens Calendly in a new tab. Times are shown in your local time zone.';
}
