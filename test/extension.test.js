import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { toMarkdown } from '../src/markdown.js';
import { install } from '../src/content.js';

const dom = html => new JSDOM(html, { pretendToBeVisual: true, url: 'https://chat.google.com/app/home' });
const convert = html => {
  const window = dom(`<main>${html}</main>`).window;
  try { return toMarkdown(window.document.querySelector('main')); }
  finally { window.close(); }
};
const fixture = (text = 'Hello <b>world</b>', id = 'synthetic') => `<section><header>Sender</header><div><div jsname="bgckF" id="${id}/qJTHM">${text}</div><div role="button" aria-label="Rohkem toiminguid">Menu</div></div><footer>12:34</footer></section>`;
const settle = async window => {
  await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
};

test('converts semantic formatting and preserves existing Markdown', () => {
  assert.equal(convert('<b>bold</b> <i>italic</i> <s>gone</s><br>## Existing **source**'), '**bold** *italic* ~~gone~~  \n## Existing **source**');
});
test('converts lists, blockquotes, and styled spans', () => {
  const result = convert('<ol start="3"><li>Third</li><li>Fourth<ul><li>Nested</li></ul></li></ol><blockquote>Quote</blockquote><span style="font-weight:700">Strong</span>');
  assert.match(result, /3\.\s+Third/);
  assert.match(result, /4\.\s+Fourth/);
  assert.match(result, /-\s+Nested/);
  assert.match(result, /> Quote/);
  assert.match(result, /\*\*Strong\*\*/);
});
test('keeps safe links and drops executable link destinations', () => {
  assert.equal(convert('<a href="https://example.com/a(b)">Docs</a> <a href="javascript:alert(1)">Bad</a>'), '[Docs](https://example.com/a%28b%29) Bad');
});
test('removes hidden source markers and UI controls', () => {
  assert.equal(convert('<span style="display:none">**</span><b>Bold</b><span hidden>secret</span><button>Wrap</button><span aria-hidden="true">icon</span>'), '**Bold**');
});
test('converts Google Chat code articles with indentation and blank lines', () => {
  assert.equal(convert('<div><article role="code"><div>function run() {</div><div>  return 42;</div><div><br></div><div>}</div></article><div><button>Wrap text</button></div></div>'), '```\nfunction run() {\n  return 42;\n\n}\n```');
});
test('code fences exceed backtick runs in content', () => {
  assert.equal(convert('<pre><code>  ```example\n  x\n  ```</code></pre>'), '````\n  ```example\n  x\n  ```\n````');
});
test('retains an explicit blank final line in Google Chat code', () => {
  assert.equal(convert('<article role="code"><div>a</div><div><br></div></article>'), '```\na\n\n```');
});
test('escapes brackets in generated link labels', () => {
  assert.equal(convert('<a href="https://example.com">a] [b</a>'), '[a\\] \\[b](https://example.com)');
});
test('preserves inline code and multiple code blocks', () => {
  const output = convert('<code>a &lt; b</code><pre>one</pre><pre>two</pre>');
  assert.match(output, /`a < b`/);
  assert.match(output, /```\none\n```/);
  assert.match(output, /```\ntwo\n```/);
});
test('creates buttons without any English Google Chat labels; copies only body', async () => {
  const { window } = dom(fixture());
  let copied;
  const stop = install(window.document, async value => { copied = value; });
  const button = window.document.querySelector('.gcm-copy-button');
  assert.ok(button);
  button.click();
  await Promise.resolve();
  assert.equal(copied, 'Hello **world**');
  assert.equal(button.textContent, 'Copied!');
  assert.match(window.document.querySelector('[role="status"]').textContent, /copied/);
  stop(); window.close();
});
test('handles new messages, replacements, and rerenders without duplicate buttons', async () => {
  const { window } = dom(fixture());
  const stop = install(window.document, async () => {});
  window.document.body.insertAdjacentHTML('beforeend', fixture('Second', 'second'));
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 2);
  const original = window.document.querySelector('[jsname="bgckF"]');
  original.outerHTML = '<div jsname="bgckF" id="replacement/qJTHM">Replacement</div>';
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 2);
  window.document.querySelector('.gcm-copy-control').remove();
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 2);
  window.document.querySelector('section').remove();
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 1);
  stop(); window.close();
});
test('copies edited content at click time, not cached text', async () => {
  const { window } = dom(fixture('Before'));
  let copied;
  const stop = install(window.document, async value => { copied = value; });
  window.document.querySelector('[jsname="bgckF"]').textContent = 'After';
  window.document.querySelector('button').click();
  await Promise.resolve();
  assert.equal(copied, 'After');
  stop(); window.close();
});
test('never adds controls to a composer or unrelated content', () => {
  const { window } = dom(`<div contenteditable="true">${fixture()}</div><main>Unrelated text</main><div jsname="bgckF" id="other">Not a message</div>`);
  const stop = install(window.document, async () => {});
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 0);
  stop(); window.close();
});
test('reports clipboard failure without a false success', async () => {
  const { window } = dom(fixture());
  const stop = install(window.document, async () => { throw new Error('denied'); });
  const button = window.document.querySelector('button');
  button.click();
  await Promise.resolve();
  assert.equal(button.textContent, 'Retry copy');
  assert.equal(button.disabled, false);
  assert.match(window.document.querySelector('[role="status"]').textContent, /failed/);
  stop(); window.close();
});
test('removes controls when a message is recycled or becomes editable', async () => {
  const { window } = dom(fixture());
  const stop = install(window.document, async () => {});
  const body = window.document.querySelector('[jsname="bgckF"]');
  body.id = 'not-a-message';
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 0);
  body.id = 'again/qJTHM';
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 1);
  body.parentElement.contentEditable = 'true';
  body.parentElement.setAttribute('contenteditable', 'true');
  await settle(window);
  assert.equal(window.document.querySelectorAll('.gcm-copy-button').length, 0);
  stop(); window.close();
});
test('does not export embedded image URLs', () => {
  assert.equal(convert('Message<img src="https://example.com/private.png" alt="Attachment">'), 'Message');
});
