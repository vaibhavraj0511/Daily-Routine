/**
 * storage.js — Google Sheets persistence layer + backup tracking.
 *
 * Reads/writes app state via a Google Apps Script Web App endpoint.
 * Backup timestamp is still tracked in localStorage (device-local metadata).
 */
'use strict';

const SHEETS_URL       = 'https://script.google.com/macros/s/AKfycbxuX2HJe0nWo2XOrkaM8nmo3EdyXxYZ5RwxjXLYdMblAexRVYzIWTslU0JuH_V1_EpZ/exec';
const BACKUP_TS_KEY    = 'habit-portal-last-backup';
const BACKUP_WARN_DAYS = 7;
const BACKUP_AUTO_DAYS = 7;

let _saveTimer = null;

/**
 * Load state from Google Sheets (async).
 * @returns {Promise<object|null>}
 */
async function loadState() {
  const res    = await fetch(SHEETS_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text   = await res.text();
  const parsed = JSON.parse(text);
  if (!parsed || parsed.version !== 1) return null;
  return parsed;
}

/**
 * Save state to Google Sheets (debounced 1 s, fire-and-forget POST).
 * Uses Content-Type: text/plain (simple CORS request, no preflight) so the body reaches doPost.
 * @param {object} appState
 */
function saveState(appState) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _setSyncStatus('saving');
    fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(appState),
      redirect: 'follow'
    })
      .then(r => {
        // opaque = cross-origin redirect followed successfully (write happened server-side)
        if (r.ok || r.type === 'opaque') {
          _setSyncStatus('saved');
        } else {
          throw new Error('HTTP ' + r.status);
        }
      })
      .catch(err => {
        console.error('saveState error:', err);
        _setSyncStatus('error');
        showToast('Could not sync to Google Sheets.', 'error');
      });
  }, 1000);
}

/** Update the sync indicator in the sidebar footer. */
function _setSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  const map = {
    saving: { text: '⟳ Syncing…',   cls: 'sync-saving' },
    saved:  { text: '✓ Synced',      cls: 'sync-saved'  },
    error:  { text: '✕ Sync failed', cls: 'sync-error'  }
  };
  const s = map[status];
  if (!s) { el.textContent = ''; el.className = 'sync-status'; return; }
  el.textContent = s.text;
  el.className = 'sync-status ' + s.cls;
  if (status === 'saved') {
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.textContent = '';
      el.className = 'sync-status';
    }, 3000);
  }
}

/** Record the current timestamp as the last backup time. */
function markBackupNow() {
  localStorage.setItem(BACKUP_TS_KEY, Date.now().toString());
}

/** Return the last backup Date, or null if never backed up. */
function getLastBackupDate() {
  const ts = localStorage.getItem(BACKUP_TS_KEY);
  return ts ? new Date(parseInt(ts, 10)) : null;
}

/** Return days since last backup, or Infinity if never. */
function daysSinceBackup() {
  const last = getLastBackupDate();
  if (!last) return Infinity;
  return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
}

/** Format a Date as a readable string like "Jan 15, 2025 at 3:42 PM". */
function formatBackupDate(date) {
  if (!date) return 'Never';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast' + (type ? ' toast-' + type : '');
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}
