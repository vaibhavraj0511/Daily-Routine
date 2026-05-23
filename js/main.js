/**
 * main.js — Bootstrap wiring (async, Google Sheets backend).
 */
'use strict';

(function () {

  // ── Auth gate ────────────────────────────────────────────
  function _showLogin() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('hidden');
    _wireLoginForm();
  }

  function _hideLogin() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
  }

  function _wireLoginForm() {
    const titleEl        = document.getElementById('login-title');
    const subEl          = document.getElementById('login-sub');
    const pwWrap         = document.getElementById('login-pw-wrap');
    const confirmWrap    = document.getElementById('login-confirm-wrap');
    const recoveryWrap   = document.getElementById('login-recovery-wrap');
    const recoveryBlock  = document.getElementById('recovery-code-block');
    const recoveryValEl  = document.getElementById('recovery-code-value');
    const copyBtn        = document.getElementById('btn-copy-recovery');
    const btnEl          = document.getElementById('login-btn');
    const pwInput        = document.getElementById('login-password');
    const cfInput        = document.getElementById('login-confirm');
    const recInput       = document.getElementById('login-recovery');
    const errEl          = document.getElementById('login-error');
    const eyeBtn         = document.getElementById('login-eye');
    const eyeBtnC        = document.getElementById('login-eye-c');
    const forgotBtn      = document.getElementById('login-forgot-btn');
    const backBtn        = document.getElementById('login-back-btn');

    let currentMode = AuthManager.isSetup() ? 'login' : 'setup';

    function _show(el) { if (el) el.classList.remove('hidden'); }
    function _hide(el) { if (el) el.classList.add('hidden'); }
    function _showError(msg) { errEl.textContent = msg; _show(errEl); }
    function _clearError()   { _hide(errEl); }

    function _setMode(mode) {
      currentMode = mode;
      _clearError();
      btnEl.disabled = false;
      pwInput.value  = '';
      if (cfInput)   cfInput.value  = '';
      if (recInput)  recInput.value = '';

      // Hide everything optional first
      _hide(confirmWrap); _hide(recoveryWrap);
      _hide(recoveryBlock); _hide(forgotBtn); _hide(backBtn);
      _show(pwWrap);

      switch (mode) {
        case 'login':
          titleEl.textContent = 'Welcome back';
          subEl.textContent   = 'Enter your password to continue';
          btnEl.textContent   = 'Unlock';
          _show(forgotBtn);
          setTimeout(() => pwInput.focus(), 50);
          break;

        case 'setup':
          titleEl.textContent = 'Create a Password';
          subEl.textContent   = 'Set a password to protect your data';
          btnEl.textContent   = 'Create & Unlock';
          _show(confirmWrap);
          setTimeout(() => pwInput.focus(), 50);
          break;

        case 'forgot':
          titleEl.textContent = 'Reset Password';
          subEl.textContent   = 'Enter your recovery code and choose a new password';
          btnEl.textContent   = 'Reset & Unlock';
          _show(recoveryWrap);
          _show(confirmWrap);
          _show(backBtn);
          setTimeout(() => recInput && recInput.focus(), 50);
          break;

        case 'recovery-shown':
          titleEl.textContent = 'Save Your Recovery Code';
          subEl.textContent   = 'Store it somewhere safe — you need it to reset your password.';
          btnEl.textContent   = "I've Saved It — Continue";
          _hide(pwWrap);
          _show(recoveryBlock);
          break;
      }
    }

    // Eye toggles
    if (eyeBtn)  eyeBtn.addEventListener('click',  () => { pwInput.type = pwInput.type === 'password' ? 'text' : 'password'; });
    if (eyeBtnC) eyeBtnC.addEventListener('click', () => { cfInput.type = cfInput.type === 'password' ? 'text' : 'password'; });

    // Forgot / Back links
    if (forgotBtn) forgotBtn.addEventListener('click', () => _setMode('forgot'));
    if (backBtn)   backBtn.addEventListener('click',   () => _setMode('login'));

    // Copy recovery code
    if (copyBtn && recoveryValEl) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(recoveryValEl.textContent).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 2000);
        }).catch(() => {});
      });
    }

    async function _handleSubmit() {
      _clearError();

      // ── Mode: recovery-shown — user confirmed they saved the code ──
      if (currentMode === 'recovery-shown') {
        _hideLogin();
        await init();
        return;
      }

      // ── Mode: setup ───────────────────────────────────────────────
      if (currentMode === 'setup') {
        const pw = pwInput.value;
        if (!pw) { _showError('Please enter a password.'); return; }
        if (pw.length < 6) { _showError('Password must be at least 6 characters.'); return; }
        if (pw !== cfInput.value) { _showError('Passwords do not match.'); return; }

        btnEl.disabled = true; btnEl.textContent = 'Setting up…';

        const recoveryCode = AuthManager.generateRecoveryCode();
        const [hash, recoveryHash] = await Promise.all([
          AuthManager.hashString(pw),
          AuthManager.hashString(recoveryCode)
        ]);
        AuthManager.storeHash(hash);
        AuthManager.storeRecoveryHash(recoveryHash);

        if (recoveryValEl) recoveryValEl.textContent = recoveryCode;
        _setMode('recovery-shown');
        return;
      }

      // ── Mode: login ───────────────────────────────────────────────
      if (currentMode === 'login') {
        const pw = pwInput.value;
        if (!pw) { _showError('Please enter a password.'); return; }

        btnEl.disabled = true; btnEl.textContent = 'Checking…';
        const result = await AuthManager.login(pw);
        if (result.ok) {
          _hideLogin();
          await init();
        } else {
          btnEl.disabled = false; btnEl.textContent = 'Unlock';
          _showError(result.error);
          pwInput.value = ''; pwInput.focus();
        }
        return;
      }

      // ── Mode: forgot ──────────────────────────────────────────────
      if (currentMode === 'forgot') {
        const recCode = recInput ? recInput.value.trim().toUpperCase() : '';
        const pw      = pwInput.value;
        if (!recCode) { _showError('Enter your recovery code.'); return; }
        if (!pw)      { _showError('Enter your new password.'); return; }
        if (pw.length < 6) { _showError('Password must be at least 6 characters.'); return; }
        if (pw !== cfInput.value) { _showError('Passwords do not match.'); return; }

        btnEl.disabled = true; btnEl.textContent = 'Resetting…';

        const [valid, newHash] = await Promise.all([
          AuthManager.verifyRecovery(recCode),
          AuthManager.hashString(pw)
        ]);
        if (!valid) {
          btnEl.disabled = false; btnEl.textContent = 'Reset & Unlock';
          _showError('Invalid recovery code. Please try again.');
          return;
        }
        AuthManager.storeHash(newHash);
        _hideLogin();
        await init();
      }
    }

    btnEl.addEventListener('click', _handleSubmit);
    pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') _handleSubmit(); });
    if (cfInput)  cfInput.addEventListener('keydown',  e => { if (e.key === 'Enter') _handleSubmit(); });
    if (recInput) recInput.addEventListener('keydown', e => { if (e.key === 'Enter') _handleSubmit(); });

    _setMode(currentMode);
  }

  async function init() {
    const loadScreen = document.getElementById('loading-screen');
    const appShell   = document.getElementById('app-shell');

    if (loadScreen) loadScreen.classList.remove('hidden');

    // 1. Load state from Google Sheets
    try {
      const saved = await loadState();
      if (saved) {
        AppState.setState(saved);
      }
      // saved === null means sheet is empty (first run) — seed state is used silently
    } catch (e) {
      console.error('Init load error:', e);
      showToast('Could not reach Google Sheets. Working with seed data.', 'error');
    }

    // 2. Auto-detect year change
    const currentYear  = new Date().getFullYear();
    const storedYear   = AppState.getYear();
    if (storedYear !== currentYear) {
      AppState.changeYear(currentYear);
      showToast('Happy New Year ' + currentYear + '! Tick data cleared, habits kept.', 'success');
    }

    // 2. Show app, hide loading screen
    if (loadScreen) loadScreen.classList.add('hidden');
    if (appShell)   appShell.classList.remove('hidden');

    // 3. Bind router → render
    onRouteChange(route => renderView(route));

    // 4. Render current route
    renderView(getCurrentRoute());

    // 5. Wire all buttons and sidebar
    _wireButtons();
  }

  function _wireButtons() {
    // Logout / Lock
    _wireLogout();

    // Export
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', () => exportData());

    // Import
    const importBtn   = document.getElementById('btn-import');
    const importInput = document.getElementById('import-file-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => { importInput.value = ''; importInput.click(); });
      importInput.addEventListener('change', () => { if (importInput.files[0]) importData(importInput.files[0]); });
    }

    // Backup badge + banner
    _updateBackupBadge();
    if (daysSinceBackup() >= BACKUP_AUTO_DAYS) {
      setTimeout(() => _autoExportData(), 1500);
    }
    _showBackupBannerIfNeeded();

    // Year switcher
    _updateYearDisplay();
    _wireYearButtons();

    // Goal deadline notifications (after short delay so UI is ready)
    setTimeout(_checkGoalDeadlines, 2000);

    // Habit reminder scheduling
    setTimeout(_scheduleHabitReminders, 3000);

    // Profile switcher UI
    _wireProfileSwitcher();

    // Mobile sidebar toggle
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const openBtn  = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-close');

    function openSidebar()  { sidebar.classList.add('open');    overlay.classList.remove('hidden'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.add('hidden'); }

    if (openBtn)  openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay)  overlay.addEventListener('click', closeSidebar);

    // Auto-close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 900) closeSidebar();
      });
    });
  }

  function _checkGoalDeadlines() {
    const state   = AppState.getState();
    const today   = new Date().toISOString().slice(0, 10);
    const urgent  = [];
    const overdue = [];

    state.goals.forEach(goal => {
      if (goal.status === 'Achieved' || !goal.deadline) return;
      const msLeft   = new Date(goal.deadline) - new Date(today);
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if (daysLeft < 0)         overdue.push({ goal, daysLeft });
      else if (daysLeft <= 7)   urgent.push({ goal, daysLeft });
    });

    if (overdue.length === 0 && urgent.length === 0) return;

    // In-app toast summary
    const msgs = [];
    if (overdue.length) msgs.push(overdue.length + ' goal(s) overdue');
    if (urgent.length)  msgs.push(urgent.length + ' goal(s) due within 7 days');
    showToast('⚠️ Goals: ' + msgs.join(', ') + '. Check Goals page.', 'error');

    // Browser notification (if permitted)
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      _sendGoalNotification(urgent, overdue);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') _sendGoalNotification(urgent, overdue);
      });
    }
  }

  function _sendGoalNotification(urgent, overdue) {
    const lines = [];
    overdue.forEach(({ goal })  => lines.push('🔴 OVERDUE: ' + goal.description));
    urgent.forEach(({ goal, daysLeft }) => {
      lines.push('⚠️ ' + (daysLeft === 0 ? 'Due today' : daysLeft + 'd left') + ': ' + goal.description);
    });
    new Notification('Daily Habit Portal — Goal Deadlines', {
      body:    lines.join('\n'),
      icon:    'favicon.ico'
    });
  }

  function _updateYearDisplay() {
    const el = document.getElementById('year-display');
    if (el) el.textContent = AppState.getYear();
  }

  function _wireYearButtons() {
    const prevBtn = document.getElementById('year-prev');
    const nextBtn = document.getElementById('year-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        const current = AppState.getYear();
        const target  = current - 1;
        const ok = await _showConfirm({
          icon:  '📅',
          title: 'Switch to ' + target + '?',
          body:  'All ticked habit data for ' + current + ' will be cleared. Your habit names are kept.',
          tip:   '💡 Tip: Export a backup first.',
          confirmLabel: 'Switch Year'
        });
        if (!ok) return;
        AppState.changeYear(target);
        _updateYearDisplay();
        renderView(getCurrentRoute());
        showToast('Switched to ' + target + '. Tick data cleared.', 'success');
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        const current = AppState.getYear();
        const target  = current + 1;
        const ok = await _showConfirm({
          icon:  '🎉',
          title: 'Switch to ' + target + '?',
          body:  'All ticked habit data for ' + current + ' will be cleared. Your habit names are kept.',
          tip:   '💡 Tip: Export a backup first.',
          confirmLabel: 'Switch Year'
        });
        if (!ok) return;
        AppState.changeYear(target);
        _updateYearDisplay();
        renderView(getCurrentRoute());
        showToast('Switched to ' + target + '. Tick data cleared.', 'success');
      });
    }
  }

  /**
   * Show the custom confirm modal. Returns a Promise<boolean>.
   * @param {{ icon, title, body, tip, confirmLabel }} opts
   */
  function _showConfirm(opts) {
    return new Promise(resolve => {
      const backdrop    = document.getElementById('confirm-modal');
      const titleEl     = document.getElementById('modal-title');
      const bodyEl      = document.getElementById('modal-body');
      const tipEl       = document.getElementById('modal-tip');
      const iconEl      = backdrop.querySelector('.modal-icon');
      const confirmBtn  = document.getElementById('modal-confirm');
      const cancelBtn   = document.getElementById('modal-cancel');

      iconEl.textContent      = opts.icon  || '❓';
      titleEl.textContent     = opts.title || 'Are you sure?';
      bodyEl.textContent      = opts.body  || '';
      tipEl.textContent       = opts.tip   || '';
      confirmBtn.textContent  = opts.confirmLabel || 'Confirm';

      tipEl.style.display = opts.tip ? '' : 'none';

      backdrop.classList.remove('hidden');

      function close(result) {
        backdrop.classList.add('hidden');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        resolve(result);
      }
      function onConfirm()        { close(true);  }
      function onCancel()         { close(false); }
      function onBackdrop(e)      { if (e.target === backdrop) close(false); }

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
    });
  }

  // ── Profile Switcher ──────────────────────────────────────
  function _wireProfileSwitcher() {
    const currentNameEl  = document.getElementById('profile-current-name');
    const actionsEl      = document.getElementById('profile-actions');
    const selectEl       = document.getElementById('profile-select');
    const newBtn         = document.getElementById('btn-new-profile');
    const deleteBtn      = document.getElementById('btn-delete-profile');

    if (!currentNameEl) return;

    function _refreshSelect() {
      const profiles = ProfileManager.getProfiles();
      const currentId = ProfileManager.getCurrentId();
      if (!selectEl) return;
      selectEl.innerHTML = '';
      const defOpt = document.createElement('option');
      defOpt.value = ProfileManager.DEFAULT_PROFILE_ID;
      defOpt.textContent = '👤 Default';
      if (currentId === ProfileManager.DEFAULT_PROFILE_ID) defOpt.selected = true;
      selectEl.appendChild(defOpt);
      profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = '👤 ' + p.name;
        if (currentId === p.id) opt.selected = true;
        selectEl.appendChild(opt);
      });
      const name = ProfileManager.getCurrentName();
      currentNameEl.textContent = '👤 ' + name;
      if (deleteBtn) deleteBtn.disabled = currentId === ProfileManager.DEFAULT_PROFILE_ID;
    }

    currentNameEl.style.cursor = 'pointer';
    currentNameEl.addEventListener('click', () => {
      actionsEl.classList.toggle('hidden');
      _refreshSelect();
    });

    if (selectEl) {
      selectEl.addEventListener('change', () => {
        const newId = selectEl.value;
        const prevId = ProfileManager.getCurrentId();
        if (newId === prevId) return;
        // Save current state for prev profile (if not default)
        if (prevId !== ProfileManager.DEFAULT_PROFILE_ID) {
          ProfileManager.saveState(prevId, AppState.getState());
        }
        ProfileManager.setCurrentId(newId);
        const saved = ProfileManager.loadState(newId);
        if (saved) AppState.setState(saved);
        else AppState.setState(AppState.createSeedState());
        _refreshSelect();
        renderView(getCurrentRoute());
        showToast('Switched to profile: ' + ProfileManager.getCurrentName(), 'success');
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        const name = prompt('Enter a name for the new profile:');
        if (!name || !name.trim()) return;
        const id = ProfileManager.create(name);
        ProfileManager.saveState(id, AppState.createSeedState());
        selectEl.value = id;
        selectEl.dispatchEvent(new Event('change'));
        showToast('Profile "' + name + '" created.', 'success');
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const id = ProfileManager.getCurrentId();
        if (id === ProfileManager.DEFAULT_PROFILE_ID) return;
        const name = ProfileManager.getCurrentName();
        if (!confirm('Delete profile "' + name + '"? This cannot be undone.')) return;
        ProfileManager.remove(id);
        AppState.setState(AppState.createSeedState());
        _refreshSelect();
        renderView(getCurrentRoute());
        showToast('Profile "' + name + '" deleted.', 'success');
      });
    }

    _refreshSelect();
  }

  // ── Habit Reminders ──────────────────────────────────────
  function _scheduleHabitReminders() {
    if (!('Notification' in window)) return;
    const state     = AppState.getState();
    const now       = new Date();
    const mIdx      = now.getMonth();
    const month     = state.months[mIdx];
    if (!month) return;

    const reminders = month.habitReminders || {};
    Object.entries(reminders).forEach(([habit, timeStr]) => {
      if (!timeStr) return;
      const [hh, mm] = timeStr.split(':').map(Number);
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
      const delay  = target - now;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification('Habit Reminder ⏰', { body: 'Time for: ' + habit, icon: 'favicon.ico' });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
              if (perm === 'granted') new Notification('Habit Reminder ⏰', { body: 'Time for: ' + habit, icon: 'favicon.ico' });
            });
          }
        }, delay);
      }
    });
  }

  function _wireLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AuthManager.logout();
        const appShell = document.getElementById('app-shell');
        if (appShell) appShell.classList.add('hidden');
        _showLogin();
      });
    }
  }

  function _boot() {
    if (!AuthManager.isLoggedIn()) {
      _showLogin();
    } else {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // ── Service Worker (PWA offline support) ─────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .catch(err => console.warn('SW registration failed:', err));
    });
  }

})();
