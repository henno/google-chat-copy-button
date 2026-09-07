# Google Chat Markdown Copy

Copy a whole Google Chat message as Markdown with one click. A **Copy Markdown** button appears below each text message, including in Estonian and other interface languages.

The extension reads the message body rather than selecting the whole message row. Sender names, timestamps, reaction controls, and attachment previews are excluded. Formatting includes emphasis, strikethrough, lists, links, blockquotes, inline code, and fenced code blocks. Existing Markdown text is kept as written.

## Install

1. Download the ZIP from [Releases](https://github.com/henno/google-chat-copy-button/releases/latest) and extract it to a permanent folder.
2. Open `chrome://extensions` in the same Chrome profile you use for Google Chat.
3. Enable **Developer mode**, click **Load unpacked**, and choose the extracted folder containing `manifest.json`.
4. Reload your [Google Chat](https://chat.google.com/) tab, then open a conversation.
5. Click **Copy Markdown** below a message. Paste into your editor or notes with Cmd+V / Ctrl+V.

GitHub installation is manual; this project is not published in the Chrome Web Store. When updating, replace the extracted files, click the extension's reload button on `chrome://extensions`, and reload Chat. Keep the folder in place after installation.

## Privacy and permissions

- Runs only on `https://chat.google.com/*`, including matching frames.
- Reads a message's text only when you click its copy button. It observes page structure to add buttons as conversations load.
- Writes to the clipboard; never reads it.
- No accounts, telemetry, storage, background worker, external servers, or network calls.
- All code, including the Markdown converter, is bundled locally.
- Requests `clipboardWrite` and the content-script site access required to operate on Google Chat. It does not request Gmail-wide access.

## Compatibility and limits

- Tested against Google Chat's September 2026 message markup. Detection uses `jsname="bgckF"` and message-body IDs, not translated button labels or obfuscated CSS classes. Google can still change these internal DOM markers.
- Manually verified in an Estonian Google Chat conversation on Chrome for macOS: buttons appeared on all 10 loaded text messages, and a long message pasted into a local editor with Markdown headings, lists, and code fences.
- Supports the standalone Google Chat website. Matching `chat.google.com` frames can also receive the script; Gmail embedding is not independently verified.
- Buttons stay visible below message text and are keyboard accessible. They do not depend on Chat's hover toolbar.
- Markdown is reconstructed from rendered content. Original source syntax cannot always be recovered; attachments, rich cards, and images are not exported. Literal Markdown is deliberately left unescaped.
- Code-block contents and indentation are retained, but language labels are not inferred.
- If no buttons appear after reloading, confirm the extension is enabled in the correct Chrome profile and report the issue. Do not include private message contents in bug reports.

## Develop

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run check
npm run package
```

Load `dist/` as an unpacked extension. Release archives are written to `release/`. Build inputs and dependencies are pinned; the release contains no remote executable code.

Tests cover Markdown conversion, locale-independent insertion, dynamically loaded and replaced messages, duplicate prevention, clipboard success/failure, and exclusion of non-message text. Test fixtures use synthetic content, not private conversations.

The initial release was checked locally with all 16 tests passing. A GitHub Actions template is provided at `docs/check-workflow.yml`; an owner with workflow permission can move it to `.github/workflows/check.yml` to enable CI. The publishing bot did not have that permission, so automated CI is not enabled in the initial release.

## License

MIT. Markdown conversion uses [Turndown](https://github.com/mixmark-io/turndown), also MIT licensed. Its license is included in release archives.
