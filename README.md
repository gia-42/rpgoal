# RPGoal

A football career told with dice. Roll eight attributes, pick a playstyle, sign your first contract in your home country and play season by season on the d20, from the second division to the Champions League, the World Cup and the Ballon d'Or.

**Play:** https://YOUR-USERNAME.github.io/rpgoal/

## Install on a phone

- **iPhone / iPad:** open the link in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open the link in Chrome and tap **Install app** at the bottom of the game.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole game |
| `config.js` | Account settings. The only file you edit |
| `cloud.js` | Login and saving to your account |
| `supabase-setup.sql` | Creates the save table in Supabase (run once) |
| `manifest.webmanifest`, `icons/`, `favicon.svg` | App name and icons |
| `sw.js` | Offline support. Bump `VERSION` when you upload changes |

## Turning on accounts

The game works without accounts, saving on each device. To let players log in and keep their career on every device:

1. **Supabase project.** You can reuse the Daily Dharma project. The table has its own name (`rpgoal_saves`), so nothing clashes.
2. **Create the table.** Supabase > **SQL Editor** > **New query**, paste all of `supabase-setup.sql`, click **Run**. A warning about destructive operations is expected (it only refers to the `drop policy if exists` lines); click **Run query**. It should say "Success. No rows returned".
3. **Add your game's address.** Supabase > **Authentication** > **URL Configuration** > **Redirect URLs**, add `https://YOUR-USERNAME.github.io/rpgoal/`.
4. **Email codes.** Supabase > **Authentication** > **Emails** > **Magic Link** template: make sure the body includes `{{ .Token }}` so players receive a 6-digit code. If Daily Dharma already sends codes, this is done.
5. **Fill in `config.js`:** `supabaseUrl` and `supabaseAnonKey` from Project Settings. For Google's own sign-in button, also paste the Google **Web client ID** you used for Daily Dharma into `googleClientId`, and add `https://YOUR-USERNAME.github.io` to that client's **Authorized JavaScript origins** in Google Cloud Console.
6. Upload `config.js` to GitHub and change `VERSION` in `sw.js` (for example `rpgoal-v5`) so installed phones pick it up.

## How saving works

- Logged out: the career and Hall of Fame live on the device.
- Logged in: every change is saved to your account a moment later. On a new device, logging in loads the furthest-along career and merges both Halls of Fame.
- On iPhone, the home-screen app and Safari keep separate local saves; logging in to the same account on both keeps them in sync.
