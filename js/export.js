/**
 * export.js — JSON serialization and file download.
 */
'use strict';

/**
 * Export the current app state as a JSON file download.
 * Also records the backup timestamp and updates the nav badge.
 */
function exportData() {
  const state = AppState.getState();
  const json = JSON.stringify(state, null, 2);
  const today = new Date().toISOString().slice(0, 10);
  const filename = 'habit-portal-backup-' + today + '.json';

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record backup time and refresh UI
  markBackupNow();
  _updateBackupBadge();
  _hideBackupBanner();
  showToast('✅ Backup saved: ' + filename, 'success');
}

/** Silent auto-export — no toast, just downloads the file. */
function _autoExportData() {
  const state = AppState.getState();
  const json = JSON.stringify(state, null, 2);
  const today = new Date().toISOString().slice(0, 10);
  const filename = 'habit-portal-auto-backup-' + today + '.json';

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  markBackupNow();
  _updateBackupBadge();
}

/** Update the "Last backup" text in the nav. */
function _updateBackupBadge() {
  const el = document.getElementById('nav-backup-info');
  if (!el) return;
  const last = getLastBackupDate();
  const days = daysSinceBackup();
  if (!last) {
    el.textContent = 'Never backed up';
    el.className = 'nav-backup-info danger';
  } else if (days >= BACKUP_WARN_DAYS) {
    el.textContent = '⚠ Backup ' + Math.floor(days) + 'd ago';
    el.className = 'nav-backup-info warn';
  } else {
    el.textContent = '✓ Backed up ' + formatBackupDate(last);
    el.className = 'nav-backup-info ok';
  }
}

/** Show the warning banner if backup is overdue. */
function _showBackupBannerIfNeeded() {
  const days = daysSinceBackup();
  if (days < BACKUP_WARN_DAYS) return;

  const existing = document.getElementById('backup-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'backup-banner';
  banner.className = 'backup-banner';

  const msg = document.createElement('span');
  msg.className = 'backup-banner-msg';
  msg.innerHTML = days === Infinity
    ? '⚠️ You have never exported a local backup. Export a JSON file to keep a copy of your data.'
    : '⚠️ Your last backup was <strong>' + Math.floor(days) + ' days ago</strong>. Export now to keep a local copy.';

  const backupBtn = document.createElement('button');
  backupBtn.className = 'btn backup-banner-btn';
  backupBtn.textContent = '↓ Backup Now';
  backupBtn.addEventListener('click', () => exportData());

  const closeBtn = document.createElement('button');
  closeBtn.className = 'backup-banner-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Dismiss (will remind again tomorrow)';
  closeBtn.addEventListener('click', () => _hideBackupBanner());

  banner.appendChild(msg);
  banner.appendChild(backupBtn);
  banner.appendChild(closeBtn);

  // Insert before main content area (inside .main-wrapper, above #app)
  const app = document.getElementById('app');
  if (app && app.parentNode) {
    app.parentNode.insertBefore(banner, app);
  } else {
    document.body.prepend(banner);
  }
}

function _hideBackupBanner() {
  const banner = document.getElementById('backup-banner');
  if (banner) banner.remove();
}

/**
 * Export a single month's habit data as a CSV file.
 * @param {number} monthIndex  0-based month index
 */
function exportMonthCSV(monthIndex) {
  const state = AppState.getState();
  const month = state.months[monthIndex];
  const monthName = AppState.MONTH_NAMES[monthIndex];
  const daysInMonth = AppState.DAYS_IN_MONTH[monthIndex];
  const year = AppState.getYear();

  const rows = [];
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  rows.push(['Habit', 'Tag', ...dayHeaders.map(d => monthName.slice(0, 3) + ' ' + d), 'Total Done', '% Done']);

  month.habits.forEach(habit => {
    const tag = (month.habitTags && month.habitTags[habit]) || '';
    const dayCells = dayHeaders.map(d => {
      const e = month.entries[habit] && (month.entries[habit][d] !== undefined ? month.entries[habit][d] : month.entries[habit][String(d)]);
      if (!e) return '0';
      return (typeof e === 'boolean' ? e : e.done === true) ? '1' : '0';
    });
    const total = dayCells.filter(v => v === '1').length;
    const pct = Math.round((total / daysInMonth) * 100);
    rows.push([habit, tag, ...dayCells, total, pct + '%']);
  });

  const mood = month.moodLog || {};
  const moodRow = ['MOOD (1-5)', '', ...dayHeaders.map(d => mood[String(d)] || mood[d] || ''), '', ''];
  rows.push(moodRow);

  const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habits-' + monthName + '-' + year + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ CSV exported: ' + monthName + ' ' + year, 'success');
}

/**
 * Export the full year's habit summary as a CSV file.
 */
function exportYearCSV() {
  const state = AppState.getState();
  const year = AppState.getYear();
  const rows = [];
  rows.push(['Month', 'Habits Count', 'Daily Avg %', 'Total Check-ins', 'Mood Avg']);

  AppState.MONTH_NAMES.forEach((name, idx) => {
    const month = state.months[idx];
    const avg = AppState.monthlyDailyAvg(idx);
    const daysInM = AppState.DAYS_IN_MONTH[idx];
    let checkins = 0;
    month.habits.forEach(h => {
      for (let d = 1; d <= daysInM; d++) {
        const e = month.entries[h] && (month.entries[h][d] !== undefined ? month.entries[h][d] : month.entries[h][String(d)]);
        if (e && (typeof e === 'boolean' ? e : e.done === true)) checkins++;
      }
    });
    const moodVals = Object.values(month.moodLog || {}).filter(v => v >= 1 && v <= 5);
    const moodAvg = moodVals.length ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1) : '';
    rows.push([name, month.habits.length, avg + '%', checkins, moodAvg]);
  });

  const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habit-year-summary-' + year + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ Year CSV exported: ' + year, 'success');
}

/**
 * Open a printable monthly report in a new tab (browser PDF via Ctrl+P).
 * @param {number} monthIndex
 */
function printMonthReport(monthIndex) {
  const state = AppState.getState();
  const month = state.months[monthIndex];
  const monthName = AppState.MONTH_NAMES[monthIndex];
  const daysInMonth = AppState.DAYS_IN_MONTH[monthIndex];
  const year = AppState.getYear();
  const avg = AppState.monthlyDailyAvg(monthIndex);

  let rows = '';
  month.habits.forEach(habit => {
    const tag = (month.habitTags && month.habitTags[habit]) || '';
    let cells = '';
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const e = month.entries[habit] && (month.entries[habit][d] !== undefined ? month.entries[habit][d] : month.entries[habit][String(d)]);
      const done = e && (typeof e === 'boolean' ? e : e.done === true);
      if (done) total++;
      cells += '<td style="text-align:center;background:' + (done ? '#22c55e' : '#f3f4f6') + ';color:' + (done ? '#fff' : '#ccc') + '">' + (done ? '✓' : '·') + '</td>';
    }
    rows += '<tr><td style="padding:4px 8px;font-size:12px">' + habit + (tag ? ' <span style="font-size:10px;color:#888">(' + tag + ')</span>' : '') + '</td>' + cells + '<td style="text-align:center;font-weight:700">' + total + '</td></tr>';
  });

  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => '<th style="min-width:20px;font-size:10px;padding:2px">' + (i + 1) + '</th>').join('');

  const html = '<!DOCTYPE html><html><head><title>' + monthName + ' ' + year + ' Habit Report</title>' +
    '<style>body{font-family:sans-serif;padding:24px;color:#1a1a2e}h1{font-size:22px;margin-bottom:4px}p{color:#666;font-size:13px;margin:0 0 16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:3px}thead th{background:#4f46e5;color:#fff;font-size:11px}@media print{button{display:none}}</style>' +
    '</head><body>' +
    '<h1>📊 ' + monthName + ' ' + year + ' — Habit Report</h1>' +
    '<p>Monthly Average: <strong>' + avg + '%</strong> &nbsp;|&nbsp; Habits tracked: <strong>' + month.habits.length + '</strong></p>' +
    '<button onclick="window.print()" style="margin-bottom:12px;padding:6px 16px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Print / Save as PDF</button>' +
    '<table><thead><tr><th>Habit</th>' + dayHeaders + '<th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '</body></html>';

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Pop-up blocked. Allow pop-ups and try again.', 'error');
}
