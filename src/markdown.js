import TurndownService from 'turndown';

const omitted = 'button,[role="button"],[role="menu"],[role="tooltip"],script,style,svg,img,picture,[hidden],[aria-hidden="true"],.gcm-copy-control';

// Google Chat renders fenced code as article[role=code], with one div per line.
function codeText(node) {
  if (node.nodeType === 3) return node.nodeValue;
  if (node.nodeType !== 1) return '';
  if (node.matches(omitted) || node.style.display === 'none') return '';
  if (node.tagName === 'BR') return '\n';
  const text = Array.from(node.childNodes, codeText).join('');
  return node.tagName === 'DIV' && !text.endsWith('\n') ? text + '\n' : text;
}

export function toMarkdown(body) {
  const clone = body.cloneNode(true);
  clone.querySelectorAll(omitted).forEach(node => node.remove());
  clone.querySelectorAll('[style]').forEach(node => {
    if (node.style.display === 'none' || node.style.visibility === 'hidden') node.remove();
  });
  clone.querySelectorAll('article[role="code"]').forEach(article => {
    const pre = clone.ownerDocument.createElement('pre');
    const code = clone.ownerDocument.createElement('code');
    code.textContent = codeText(article).replace(/\n$/, '');
    pre.append(code);
    article.replaceWith(pre);
  });

  const converter = new TurndownService({
    headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-',
    emDelimiter: '*', strongDelimiter: '**'
  });
  // Many messages already contain Markdown source pasted from another app.
  converter.escape = text => text;
  converter.addRule('strikethrough', {
    filter: ['del', 's', 'strike'], replacement: content => content ? `~~${content}~~` : ''
  });
  converter.addRule('styledText', {
    filter: node => node.nodeName === 'SPAN' && Boolean(node.style.fontWeight || node.style.fontStyle || node.style.textDecoration),
    replacement(content, node) {
      if (!content) return '';
      if (node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) content = `**${content}**`;
      if (node.style.fontStyle === 'italic') content = `*${content}*`;
      if (node.style.textDecoration.includes('line-through')) content = `~~${content}~~`;
      return content;
    }
  });
  converter.addRule('safeLinks', {
    filter: 'a',
    replacement(content, node) {
      const href = node.getAttribute('href') || '';
      if (!/^(https?:|mailto:)/i.test(href)) return content;
      const url = href.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, c => encodeURIComponent(c));
      const label = content.replace(/([\[\]])/g, '\\$1');
      return content === href ? `<${url}>` : `[${label}](${url})`;
    }
  });
  converter.addRule('fencedCode', {
    filter: 'pre',
    replacement(_content, node) {
      const text = node.textContent;
      const longest = Math.max(0, ...Array.from(text.matchAll(/`+/g), match => match[0].length));
      const fence = '`'.repeat(Math.max(3, longest + 1));
      return `\n\n${fence}\n${text}\n${fence}\n\n`;
    }
  });
  return converter.turndown(clone).trim();
}
