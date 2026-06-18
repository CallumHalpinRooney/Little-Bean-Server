# Dimly Theme — Chrome Extension

A Manifest V3 Chrome extension that restyles your open tabs to match a clean,
dark "Dimly" aesthetic: deep near-black surfaces, soft off-white text, an
indigo/violet accent, Inter typography, rounded panels and subtle borders.

The theme is applied as an overlay stylesheet on top of whatever page you're
on — it does not rebuild each site, it re-skins it. Preferences are remembered
**per site (origin)**.

## Install (developer mode)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `dimly-extension/` folder.
4. Pin the extension and click its toolbar icon to open the popup.

## Use

- **Theme this site** — toggles the Dimly theme for the current tab's origin.
- **Apply to all open tabs** — enables it across every open tab at once.
- A small `ON` badge marks themed tabs. Choices persist across reloads.

## Customize the look

All colors, fonts, radii and shadows live as CSS variables at the top of
[`theme.css`](./theme.css), under `:root.dimly-themed`. Edit those values to
match the exact Dimly palette/typography, then reload the extension. The most
useful knobs:

| Variable          | Controls                         |
| ----------------- | -------------------------------- |
| `--dimly-bg`      | page background                  |
| `--dimly-bg-elev` | cards / panels / modals          |
| `--dimly-text`    | primary text color               |
| `--dimly-accent`  | links, primary buttons, focus    |
| `--dimly-font`    | global font family               |
| `--dimly-radius`  | corner rounding                  |

## Files

| File            | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `manifest.json` | MV3 manifest, permissions, content-script config     |
| `content.js`    | Injects `theme.css` and toggles the theme class      |
| `theme.css`     | The Dimly theme (all design tokens live here)        |
| `background.js` | Keeps the per-tab `ON` badge in sync                 |
| `popup.html/css/js` | Toolbar popup: per-site toggle + apply-to-all    |

## Notes

This recreates a *style* (a dark theme of original CSS), not the proprietary
assets or branding of any specific company. Swap the variables in `theme.css`
to dial it in to a reference design.
