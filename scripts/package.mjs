import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { version } = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
await mkdir('release', { recursive: true });
const name = `google-chat-copy-button-v${version}.zip`;
await rm(`release/${name}`, { force: true });
execFileSync('zip', ['-q', '-r', `../release/${name}`, 'manifest.json', 'content.js', 'content.css', 'icons', 'LICENSE', 'THIRD_PARTY_LICENSES.txt'], { cwd: 'dist' });
console.log(`Created release/${name}`);
