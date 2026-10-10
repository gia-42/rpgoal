# RPGoal

A football career told with dice. Roll eight attributes, sign your first contract in your home country and play season by season on the d20, from the second division to the Champions League, the World Cup and the Ballon d'Or.

**Play:** https://YOUR-USERNAME.github.io/rpgoal/

## Install on a phone

- **iPhone / iPad:** open the link in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open the link in Chrome and tap **Install app** at the bottom of the game (or use the browser menu).

Once installed it opens full screen with its own icon and keeps working offline.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole game: markup, styles and script |
| `manifest.webmanifest` | App name, colours and icons for installing |
| `sw.js` | Offline support. Bump `VERSION` when you upload changes |
| `icons/` | Home-screen icons (iPhone, Android and maskable) |
| `favicon.svg` | Browser tab icon |

No build step and nothing to install.

## Saves

Careers and the Hall of Fame are stored in local storage on each device. On iPhone, the home-screen app keeps its own storage, separate from Safari.
