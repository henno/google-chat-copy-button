import { toMarkdown } from './markdown.js';

// Observed in Google Chat: text bodies use bgckF and IDs ending in /qJTHM.
// These structural markers are independent of translated aria-labels and CSS.
export const BODY_SELECTOR = '[jsname="bgckF"][id$="/qJTHM"]';
const CONTROL = 'gcm-copy-control';

export function install(document, write = text => navigator.clipboard.writeText(text)) {
  const controls = new Map();
  const view = document.defaultView;
  let scheduled = false;
  let stopped = false;
  const timers = new Set();
  const eligible = body => body.matches(BODY_SELECTOR) && !body.closest('[contenteditable="true"],[role="textbox"]');

  function attach(body) {
    if (controls.has(body) || !eligible(body)) return;
    const control = document.createElement('span');
    control.className = CONTROL;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gcm-copy-button';
    button.textContent = 'Copy Markdown';
    button.setAttribute('aria-label', 'Copy message as Markdown');
    button.title = 'Copy this message as Markdown';
    const status = document.createElement('span');
    status.className = 'gcm-copy-status';
    status.setAttribute('role', 'status');
    control.append(button, status);
    body.after(control);
    let resetTimer;
    button.addEventListener('mousedown', event => event.stopPropagation());
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      view.clearTimeout(resetTimer);
      timers.delete(resetTimer);
      try {
        const text = toMarkdown(body);
        if (!text) throw new Error('No message text');
        await write(text);
        button.textContent = 'Copied!';
        status.textContent = 'Message copied as Markdown.';
        button.dataset.state = 'success';
      } catch {
        button.textContent = 'Retry copy';
        button.dataset.state = 'error';
        status.textContent = 'Copy failed. Focus this tab and try again.';
      } finally {
        button.disabled = false;
        if (!stopped) {
          resetTimer = view.setTimeout(() => {
            button.textContent = 'Copy Markdown';
            delete button.dataset.state;
            status.textContent = '';
            timers.delete(resetTimer);
          }, 3000);
          timers.add(resetTimer);
        }
      }
    });
    controls.set(body, control);
  }

  function scan() {
    scheduled = false;
    if (stopped) return;
    for (const [body, control] of controls) {
      if (!body.isConnected || !eligible(body) || !control.isConnected || control.previousElementSibling !== body) {
        control.remove();
        controls.delete(body);
      }
    }
    document.querySelectorAll(BODY_SELECTOR).forEach(attach);
  }
  const observer = new view.MutationObserver(records => {
    // Do not rescan for our own status text/button mutations.
    if (records.every(record => record.target.closest?.(`.${CONTROL}`))) return;
    if (!scheduled) {
      scheduled = true;
      view.requestAnimationFrame(scan);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'jsname', 'role', 'contenteditable'] });
  scan();
  return () => {
    stopped = true;
    observer.disconnect();
    timers.forEach(timer => view.clearTimeout(timer));
    controls.forEach(control => control.remove());
    controls.clear();
  };
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) install(document);
