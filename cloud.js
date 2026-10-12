// RPGoal accounts: log in with Google or an email code, and keep your career and Hall of Fame in your account.
// Settings live in config.js. With no settings there, the game runs as before and saves on this device only.
(function () {
  const C = window.RPGOAL_CONFIG || {};
  const ready = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase && window.supabase.createClient);

  const L = {
    en: {
      login: 'Log in', title: 'Your account', guest: 'Log in to keep your career and Hall of Fame on every device you play on.',
      google: 'Continue with Google', or: 'or', email: 'Email', send: 'Send code', sending: 'Sending…',
      sent: e => `We sent a 6-digit code to ${e}. It can take a minute to arrive.`, code: 'Code', verify: 'Log in', checking: 'Checking…',
      badEmail: 'Enter a valid email address.', badCode: 'That code didn’t work. Check it, or ask for a new one.', other: 'Use a different email',
      signedAs: e => `Logged in as ${e}`, synced: 'Saved to your account.', syncing: 'Saving…', offline: 'Couldn’t reach your account. Your game is still saved on this device and will sync later.',
      syncNow: 'Sync now', logout: 'Log out', close: 'Close', merged: 'Your account save was loaded.',
      uname: 'Username', unameHint: '3 to 20 letters, numbers, dots, dashes or underscores.', unameSave: 'Save', unameSaving: 'Saving…', unameOk: 'Username saved.', unameBad: 'Use 3 to 20 letters, numbers, dots, dashes or underscores.', unamePick: 'Choose a username', welcome: 'Welcome! Pick the name shown on your account.', later: 'Later'
    },
    pt: {
      login: 'Entrar', title: 'Sua conta', guest: 'Entre para guardar sua carreira e seu Hall da Fama em todos os aparelhos em que você jogar.',
      google: 'Continuar com Google', or: 'ou', email: 'E-mail', send: 'Enviar código', sending: 'Enviando…',
      sent: e => `Enviamos um código de 6 dígitos para ${e}. Pode levar um minuto para chegar.`, code: 'Código', verify: 'Entrar', checking: 'Verificando…',
      badEmail: 'Digite um e-mail válido.', badCode: 'Esse código não funcionou. Confira ou peça um novo.', other: 'Usar outro e-mail',
      signedAs: e => `Conectado como ${e}`, synced: 'Salvo na sua conta.', syncing: 'Salvando…', offline: 'Não foi possível acessar sua conta. O jogo continua salvo neste aparelho e sincroniza depois.',
      syncNow: 'Sincronizar agora', logout: 'Sair', close: 'Fechar', merged: 'O jogo salvo na sua conta foi carregado.',
      uname: 'Nome de usuário', unameHint: 'De 3 a 20 letras, números, pontos, hífens ou sublinhados.', unameSave: 'Salvar', unameSaving: 'Salvando…', unameOk: 'Nome de usuário salvo.', unameBad: 'Use de 3 a 20 letras, números, pontos, hífens ou sublinhados.', unamePick: 'Escolha um nome de usuário', welcome: 'Bem-vindo! Escolha o nome que aparece na sua conta.', later: 'Depois'
    }
  };
  const tt = () => L[typeof lang !== 'undefined' && lang === 'pt' ? 'pt' : 'en'];
  const escH = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uname = u => (u && u.user_metadata && u.user_metadata.username) || '';
  let askName = false, askedName = false;
  let sb = null, user = null, syncTimer = null, status = '', pending = null, busyPanel = false, note = '';

  // ----- header button -----
  window.cloudBtn = () => {
    if (!ready) return '';
    const label = user ? escH(uname(user) || (user.email || '').split('@')[0] || tt().title) : tt().login;
    return `<button class="theme-btn" data-cloud="open" aria-label="${tt().title}"><svg viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="2.6"/><path d="M2.8 14c.8-2.6 2.8-4 5.2-4s4.4 1.4 5.2 4"/></svg>${label}${user ? `<span class="cdot ${status === 'err' ? 'err' : ''}"></span>` : ''}</button>`;
  };
  if (!ready) return;

  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });

  // ----- syncing -----
  const careerWeight = c => !c || !c.phase ? -1 : (c.phase === 'create' ? 0 : 1 + (c.history ? c.history.length : 0) * 10 + (c.season ? c.season.idx || 0 : 0));
  // careers removed from the Hall of Fame stay removed on every device (tombstones ride along as one extra entry)
  const delIds = () => (typeof loadHofDel === 'function' ? loadHofDel() : []);
  function mergeHof(a, b) {
    const gone = new Set(delIds()), map = new Map();
    [...(a || []), ...(b || [])].forEach(e => { if (e && e.id != null && !gone.has(e.id)) map.set(e.id, e); });
    const all = [...map.values()];
    return typeof hofDedupe === 'function' ? hofDedupe(all) : all;   // the same career finished on two devices counts once
  }
  const finished = (c, hof) => typeof careerFinishedIn === 'function' && careerFinishedIn(c, hof);
  async function push() {
    if (!user) return;
    status = 'saving'; refresh();
    // achievements ride along in the hof column as one extra entry, so no database change is needed
    const ach = typeof loadAch === 'function' ? loadAch() : {};
    // never send an old copy of a career that is already in the Hall of Fame
    if (finished(S, loadHof())) { S = fresh(S.gender); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} render(); }
    const { error } = await sb.from('rpgoal_saves').upsert({ user_id: user.id, career: S, hof: loadHof().concat([{ id: '__ach', ach }, { id: '__del', ids: delIds() }]), updated_at: new Date().toISOString() });
    status = error ? 'err' : 'ok'; refresh();
  }
  async function pull() {
    if (!user) return;
    status = 'saving'; refresh();
    const { data, error } = await sb.from('rpgoal_saves').select('career,hof,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) { status = 'err'; refresh(); return; }
    if (data) {
      const cloud = data.career && typeof fixSave === 'function' ? fixSave(data.career) : data.career, local = S;
      const cloudHof = Array.isArray(data.hof) ? data.hof : [];
      const achRow = cloudHof.find(e => e && e.id === '__ach');
      if (achRow && achRow.ach && typeof loadAch === 'function') {
        const mine = loadAch(); let changed = false;
        Object.entries(achRow.ach).forEach(([k, ts]) => { if (!mine[k] || ts < mine[k]) { mine[k] = ts; changed = true; } });
        if (changed) { achMem = null; try { localStorage.setItem(ACHKEY, JSON.stringify(mine)); } catch (e) {} achMem = mine; }
      }
      const delRow = cloudHof.find(e => e && e.id === '__del');
      if (delRow && Array.isArray(delRow.ids) && typeof addHofDel === 'function') addHofDel(delRow.ids);
      const hof = mergeHof(loadHof(), cloudHof.filter(e => !(e && (e.id === '__ach' || e.id === '__del'))));
      hofMem = null; try { localStorage.setItem(HOFKEY, JSON.stringify(hof)); } catch (e) {} hofMem = hof.slice();
      // which career to keep: a copy of a career that already ended is never kept; the same career keeps its furthest copy;
      // two different careers keep the one played most recently
      const lStale = finished(local, hof), cStale = finished(cloud, hof);
      const same = cloud && local && careerId && careerId(cloud) && careerId(cloud) === careerId(local);
      let cloudWins;
      if (lStale && !cStale) cloudWins = true;
      else if (cStale && !lStale) cloudWins = false;
      else if (same) cloudWins = careerWeight(cloud) > careerWeight(local) || (careerWeight(cloud) === careerWeight(local) && (cloud.savedAt || 0) > (local.savedAt || 0));
      else cloudWins = !!cloud && cloud.phase && ((cloud.savedAt || 0) > (local.savedAt || 0) || careerWeight(local) <= 0 && careerWeight(cloud) > 0);
      if (lStale && cStale) { S = fresh(local.gender); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} note = tt().merged; }
      else if (cloudWins && cloud) {
        S = fixSave(cloud);
        if (S.phase === 'season' && !S.season) buildSeason();
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
        note = tt().merged;
      }
      render(); if (typeof scheduleAuto === 'function') scheduleAuto();
    }
    await push();
  }
  window.cloudSync = () => {
    if (!user) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(push, 1500);
  };
  addEventListener('online', () => { if (user) push(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && user) { clearTimeout(syncTimer); push(); } });

  sb.auth.onAuthStateChange((event, session) => {
    const was = user && user.id;
    user = session ? session.user : null;
    if (user && user.id !== was) { setTimeout(pull, 0); if (panelOpen()) drawPanel(); }
    // first sign-in (no username yet): ask for one right away
    if (event === 'SIGNED_IN' && user && !uname(user) && !askedName) { askedName = true; askName = true; openPanel(); }
    if (!user) status = '';
    refresh();
  });

  // ----- panel -----
  const css = document.createElement('style');
  css.textContent = `
  .cdot{width:7px;height:7px;border-radius:50%;background:var(--good);display:inline-block;margin-left:2px}
  .cdot.err{background:var(--warn)}
  .cpanel{position:fixed;inset:0;z-index:20;background:rgba(10,12,16,.55);display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 56px) 16px 24px;overflow-y:auto}
  .cbox{width:100%;max-width:400px;background:var(--card);color:var(--ink);border:1px solid var(--rule-2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px;font-family:var(--f-ui)}
  .cbox h2{font-size:20px}
  .cbox input{font:inherit;font-size:16px;width:100%;background:var(--card);color:var(--ink);border:1px solid var(--rule-2);border-radius:8px;padding:10px 12px}
  .cbox input.code{font-family:var(--f-num);letter-spacing:.3em;font-size:20px;text-align:center}
  .cbox .btn{width:100%}
  .cbox .or{display:flex;align-items:center;gap:10px;color:var(--ink-3);font-size:12px}
  .cbox .or::before,.cbox .or::after{content:"";flex:1;height:1px;background:var(--rule)}
  .cbox .gbtn{display:flex;align-items:center;justify-content:center;gap:10px}
  .cbox .gbtn svg{width:18px;height:18px}
  .cbox .gsi{display:flex;justify-content:center;min-height:44px;color-scheme:light}
  .cbox .gsi iframe{color-scheme:light;background:transparent}
  .cbox .msg{font-size:14px;color:var(--ink-2)}
  .cbox .msg.err{color:var(--bad)}
  .cbox .msg.small{font-size:12.5px;color:var(--ink-3)}
  .cbox .linkb{background:none;border:0;color:var(--ink-2);text-decoration:underline;font:inherit;font-size:13px;padding:0;align-self:flex-start;cursor:pointer}`;
  document.head.appendChild(css);

  let panel = null;
  const panelOpen = () => !!(panel && panel.isConnected);
  function openPanel() { if (!panel) { panel = document.createElement('div'); panel.className = 'cpanel'; panel.addEventListener('click', onPanelClick); panel.addEventListener('submit', onSubmit); } document.body.appendChild(panel); drawPanel(); }
  function closePanel() { if (panel) panel.remove(); note = ''; askName = false; }
  // only the account button changes; re-rendering the whole game here made results flicker
  function refresh() { const b = document.querySelector('[data-cloud="open"]'); if (b) b.outerHTML = window.cloudBtn(); if (panelOpen()) drawPanel(); }
  const G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function drawPanel(msg, isErr) {
    if (!panel) return;
    const T = tt();
    let body;
    if (user && askName && !uname(user)) {
      body = `<h2>${T.unamePick}</h2><div class="msg">${T.welcome}</div>
        <form data-f="uname" class="stack" style="gap:10px"><label class="lbl" for="cuname">${T.uname}</label>
        <input id="cuname" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${escH((user.email || '').split('@')[0])}">
        <div class="msg small">${T.unameHint}</div>
        <button class="btn" ${busyPanel ? 'disabled' : ''}>${busyPanel ? T.unameSaving : T.unameSave}</button></form>
        ${msg ? `<div class="msg ${isErr ? 'err' : ''}">${msg}</div>` : ''}
        <button class="linkb" data-c="later">${T.later}</button>`;
    } else if (user) {
      const st = status === 'saving' ? T.syncing : status === 'err' ? T.offline : status === 'ok' ? T.synced : '';
      const un = uname(user);
      body = `<h2>${un ? escH(un) : T.title}</h2><div class="msg">${T.signedAs(escH(user.email || ''))}</div>
        ${note ? `<div class="banner">${note}</div>` : ''}
        <form data-f="uname" class="stack" style="gap:8px"><label class="lbl" for="cuname">${T.uname}</label>
        ${un ? '' : `<div class="msg">${T.unamePick}</div>`}
        <div class="row" style="gap:8px;flex-wrap:nowrap"><input id="cuname" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" value="${escH(un)}" placeholder="${escH((user.email || '').split('@')[0])}">
        <button class="btn sm" style="width:auto;flex:none" ${busyPanel ? 'disabled' : ''}>${busyPanel ? T.unameSaving : T.unameSave}</button></div>
        <div class="msg small">${T.unameHint}</div></form>
        ${msg ? `<div class="msg ${isErr ? 'err' : ''}">${msg}</div>` : ''}
        ${st ? `<div class="msg ${status === 'err' ? 'err' : ''}">${st}</div>` : ''}
        <button class="btn ghost" data-c="sync">${T.syncNow}</button>
        <button class="btn danger" data-c="logout">${T.logout}</button>
        <button class="linkb" data-c="close">${T.close}</button>`;
    } else if (pending) {
      body = `<h2>${T.title}</h2><div class="msg">${T.sent(escH(pending))}</div>
        <form data-f="code" class="stack" style="gap:10px"><label class="lbl" for="ccode">${T.code}</label>
        <input id="ccode" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required>
        <button class="btn" ${busyPanel ? 'disabled' : ''}>${busyPanel ? T.checking : T.verify}</button></form>
        ${msg ? `<div class="msg ${isErr ? 'err' : ''}">${msg}</div>` : ''}
        <button class="linkb" data-c="other">${T.other}</button>
        <button class="linkb" data-c="close">${T.close}</button>`;
    } else {
      const useGoogle = !C.providers || C.providers.google !== false;
      // With a Google client ID, only Google's own button is shown, so the popup names this site
      // (never the Supabase address). The plain redirect button is a fallback for setups without one.
      const gis = useGoogle && !!C.googleClientId;
      body = `<h2>${T.title}</h2><div class="msg">${T.guest}</div>
        ${useGoogle ? (gis ? `<div id="cgsi" class="gsi"></div>` : `<button class="btn ghost gbtn" data-c="google">${G}${T.google}</button>`) + `<div class="or">${T.or}</div>` : ''}
        <form data-f="email" class="stack" style="gap:10px"><label class="lbl" for="cemail">${T.email}</label>
        <input id="cemail" type="email" inputmode="email" autocomplete="email" required>
        <button class="btn" ${busyPanel ? 'disabled' : ''}>${busyPanel ? T.sending : T.send}</button></form>
        ${msg ? `<div class="msg ${isErr ? 'err' : ''}">${msg}</div>` : ''}
        <button class="linkb" data-c="close">${T.close}</button>`;
    }
    panel.innerHTML = `<div class="cbox" role="dialog" aria-modal="true" aria-label="${T.title}">${body}</div>`;
    const slot = panel.querySelector('#cgsi');
    if (slot) mountGsi(slot, 0);
    const f = panel.querySelector('input'); if (f && !slot && !(user && uname(user))) f.focus();
  }
  let gsiInit = false;
  function mountGsi(slot, tries) {
    const g = window.google && window.google.accounts && window.google.accounts.id;
    if (!slot.isConnected) return;
    if (!g) { if (tries < 60) setTimeout(() => mountGsi(slot, tries + 1), 150); return; } // Google's script loads async
    if (!gsiInit) {
      g.initialize({ client_id: C.googleClientId, callback: async r => {
        const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token: r.credential });
        if (error) drawPanel(error.message, true);
      } });
      gsiInit = true;
    }
    const dark = typeof effTheme === 'function' && effTheme() === 'dark';
    g.renderButton(slot, { theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(320, slot.clientWidth || 300), locale: typeof lang !== 'undefined' && lang === 'pt' ? 'pt-BR' : 'en' });
  }
  async function onPanelClick(e) {
    if (e.target === panel) { closePanel(); return; }
    const b = e.target.closest('[data-c]'); if (!b) return;
    const c = b.dataset.c, T = tt();
    if (c === 'close') closePanel();
    else if (c === 'later') { askName = false; closePanel(); }
    else if (c === 'other') { pending = null; drawPanel(); }
    else if (c === 'google') {
      await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    } else if (c === 'sync') { await pull(); }
    else if (c === 'logout') { clearTimeout(syncTimer); await push(); await sb.auth.signOut(); user = null; status = ''; note = ''; closePanel(); render(); }
  }
  async function onSubmit(e) {
    e.preventDefault(); const T = tt();
    const form = e.target;
    if (form.dataset.f === 'uname') {
      const v = (panel.querySelector('#cuname').value || '').trim();
      if (!/^[\p{L}\p{N}._-]{3,20}$/u.test(v)) { drawPanel(T.unameBad, true); return; }
      busyPanel = true; drawPanel();
      const { data, error } = await sb.auth.updateUser({ data: { username: v } });
      busyPanel = false;
      if (error) { drawPanel(error.message, true); return; }
      if (data && data.user) user = data.user;
      render();
      if (askName) { askName = false; closePanel(); return; }
      drawPanel(T.unameOk);
      return;
    }
    if (form.dataset.f === 'email') {
      const email = (panel.querySelector('#cemail').value || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { drawPanel(T.badEmail, true); return; }
      busyPanel = true; drawPanel();
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      busyPanel = false;
      if (error) { drawPanel(error.message, true); return; }
      pending = email; drawPanel();
    } else if (form.dataset.f === 'code') {
      const token = (panel.querySelector('#ccode').value || '').replace(/\s/g, '');
      busyPanel = true; drawPanel();
      const { error } = await sb.auth.verifyOtp({ email: pending, token, type: 'email' });
      busyPanel = false;
      if (error) { drawPanel(T.badCode, true); return; }
      pending = null; drawPanel();
    }
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-cloud="open"]')) openPanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen()) closePanel(); });

  render();
  sb.auth.getSession().then(({ data }) => { if (data && data.session && !user) { user = data.session.user; pull(); } });
})();
