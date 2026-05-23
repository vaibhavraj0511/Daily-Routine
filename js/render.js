/**
 * render.js — Pure render functions (Tasks 7–13).
 * All functions are globals on window.
 * Entry point: renderView(route) dispatches to the correct render function.
 */
'use strict';

// ============================================================
// Helpers
// ============================================================

/** Show/hide a view element. */
function _showView(id) {
  ['view-dashboard', 'view-year', 'view-month', 'view-goals', 'view-schedule'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });
}

/** Build a progress bar element. */
function _progressBar(pct) {
  const wrap = document.createElement('div');
  wrap.className = 'progress-bar-wrap';
  const fill = document.createElement('div');
  fill.className = 'progress-bar-fill';
  fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  wrap.appendChild(fill);
  return wrap;
}

/** Create a DOM element with optional className and textContent. */
function _el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Play a brief tick sound using Web Audio API when a habit is checked. */
function _playTickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {}
}

/**
 * Auto-generate a weekly review based on actual habit performance.
 * @param {number} monthIndex
 * @param {number[]} days  array of day numbers in the week
 * @returns {{ well: string, improve: string, goal: string }}
 */
function _generateWeekReview(monthIndex, days) {
  const month   = AppState.getState().months[monthIndex];
  const habits  = month.habits || [];
  const entries = month.entries || {};

  if (!habits.length || !days.length) {
    return { well: 'No habits tracked yet.', improve: 'Add habits to start tracking.', goal: 'Set up your habits for this month.' };
  }

  const stats = habits.map(h => {
    let done = 0;
    days.forEach(d => {
      const e = entries[h] && entries[h][d];
      if (e && (typeof e === 'boolean' ? e : e.done === true)) done++;
    });
    return { name: h, done, total: days.length, pct: Math.round(done / days.length * 100) };
  });

  const weekPct  = Math.round(stats.reduce((s, x) => s + x.pct, 0) / stats.length);
  const top      = stats.filter(s => s.pct >= 80).sort((a, b) => b.pct - a.pct);
  const mid      = stats.filter(s => s.pct >= 50 && s.pct < 80);
  const low      = stats.filter(s => s.pct > 0  && s.pct < 50).sort((a, b) => a.pct - b.pct);
  const zero     = stats.filter(s => s.pct === 0);
  const perfect  = stats.filter(s => s.pct === 100);

  // ── What went well ──────────────────────────────────────────
  let well;
  if (weekPct === 0) {
    well = 'No habits were recorded this week — let\'s start fresh next week!';
  } else if (perfect.length === habits.length) {
    well = '🎉 Perfect week! Every single habit was completed every day. Outstanding discipline!';
  } else if (top.length >= habits.length * 0.7) {
    well = 'Strong week overall at ' + weekPct + '%! ' +
      (perfect.length ? perfect.slice(0, 2).map(s => s.name).join(' and ') + ' hit 100%. ' : '') +
      'Momentum is building.';
  } else if (top.length > 0) {
    const names = top.slice(0, 3).map(s => s.name + ' (' + s.pct + '%)').join(', ');
    well = 'Stayed consistent with: ' + names + '. Overall week: ' + weekPct + '%.';
  } else if (weekPct >= 40) {
    well = 'Made progress at ' + weekPct + '% — some effort every day. Keep building the habit.';
  } else {
    well = 'Showed up despite the low ' + weekPct + '% score. That counts — build on it.';
  }

  // ── What to improve ────────────────────────────────────────
  let improve;
  if (weekPct === 0) {
    improve = 'Pick 2–3 key habits to focus on next week and commit to at least one per day.';
  } else if (low.length === 0 && zero.length === 0) {
    improve = 'Almost nothing to fix — just maintain the consistency you built this week!';
  } else {
    const struggle = [...zero.slice(0, 2), ...low.slice(0, 2)];
    const names    = struggle.slice(0, 3).map(s => s.name + (s.pct === 0 ? ' (0%)' : ' (' + s.pct + '%)')).join(', ');
    improve = (zero.length > 0 ? 'Skipped entirely: ' + zero.slice(0, 2).map(s => s.name).join(', ') + '. ' : '') +
      (low.length > 0  ? 'Needs attention: ' + low.slice(0, 2).map(s => s.name + ' (' + s.pct + '%)').join(', ') + '. ' : '') +
      'Try scheduling these earlier in the day.';
  }

  // ── Goal for next week ──────────────────────────────────────
  let goal;
  if (weekPct === 100) {
    goal = 'Maintain your perfect streak. Challenge yourself to stay at 100%!';
  } else if (weekPct >= 80) {
    goal = 'Hold at ' + weekPct + '%+ and work on turning ' + (low.length ? low[0].name : 'the weaker habits') + ' into a daily win.';
  } else if (weekPct >= 50) {
    const target = Math.min(100, weekPct + 15);
    goal = 'Push from ' + weekPct + '% to ' + target + '%. Focus on ' + (low.concat(zero).slice(0, 2).map(s => s.name).join(' and ') || 'the habits you missed') + '.';
  } else if (weekPct > 0) {
    goal = 'Aim for ' + Math.min(100, weekPct + 20) + '% next week. Pick your top ' + Math.min(3, habits.length) + ' habits and nail those first.';
  } else {
    goal = 'Start small — complete each habit at least once next week. Every tick counts!';
  }

  return { well, improve, goal };
}

// ============================================================
// Dashboard — renderDashboard(state)
// ============================================================

const _QUOTES = [
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { text: 'The secret of your future is hidden in your daily routine.', author: 'Mike Murdock' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Small disciplines repeated with consistency every day lead to great achievements.', author: 'John Maxwell' },
  { text: 'Your net worth to the world is usually determined by what remains after your bad habits are subtracted.', author: 'Benjamin Franklin' },
  { text: 'A habit is a cable; we weave a thread of it each day, until it becomes so strong we cannot break it.', author: 'Horace Mann' },
  { text: 'The chains of habit are too light to be felt until they are too heavy to be broken.', author: 'Warren Buffett' },
  { text: 'First forget inspiration. Habit is more dependable. Habit will sustain you whether you\'re inspired or not.', author: 'Octavia Butler' },
  { text: 'In essence, if we want to direct our lives, we must take control of our consistent actions.', author: 'Tony Robbins' },
  { text: 'The quality of your life is determined by the quality of your habits.', author: 'Brian Tracy' },
  { text: 'It\'s not what we do once in a while that shapes our lives. It\'s what we do consistently.', author: 'Anthony Robbins' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'Win the morning, win the day.', author: 'Tim Ferriss' }
];
function _quoteOfDay() {
  const d = new Date(); const idx = (d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate()) % _QUOTES.length;
  return _QUOTES[idx];
}

function _buildYearHeatmap(state) {
  const year = AppState.getYear();
  const today = new Date();
  const wrap = _el('div', 'heatmap-wrap');
  const monthLabels = _el('div', 'heatmap-month-labels');
  const grid = _el('div', 'heatmap-grid');

  AppState.MONTH_NAMES.forEach((name, mIdx) => {
    const days = AppState.DAYS_IN_MONTH[mIdx];
    const col = _el('div', 'heatmap-month-col');
    const lbl = _el('div', 'heatmap-month-lbl', name.slice(0, 3));
    col.appendChild(lbl);
    const cells = _el('div', 'heatmap-cells');
    for (let d = 1; d <= days; d++) {
      const pct = AppState.dailyProgress(mIdx, d);
      const cell = _el('div', 'heatmap-cell');
      const isToday = today.getFullYear() === year && today.getMonth() === mIdx && today.getDate() === d;
      const isFuture = (mIdx > today.getMonth() && today.getFullYear() === year) ||
                       (mIdx === today.getMonth() && d > today.getDate() && today.getFullYear() === year);
      if (isToday) cell.classList.add('heatmap-today');
      if (isFuture) cell.classList.add('heatmap-future');
      else if (pct === 0) cell.classList.add('heatmap-0');
      else if (pct < 25)  cell.classList.add('heatmap-1');
      else if (pct < 50)  cell.classList.add('heatmap-2');
      else if (pct < 75)  cell.classList.add('heatmap-3');
      else                cell.classList.add('heatmap-4');
      cell.title = AppState.MONTH_NAMES[mIdx] + ' ' + d + ': ' + pct + '%';
      cells.appendChild(cell);
    }
    col.appendChild(cells);
    grid.appendChild(col);
  });

  wrap.appendChild(grid);

  const legend = _el('div', 'heatmap-legend');
  legend.appendChild(_el('span', 'heatmap-legend-lbl', 'Less'));
  ['heatmap-0','heatmap-1','heatmap-2','heatmap-3','heatmap-4'].forEach(c => {
    const s = _el('div', 'heatmap-cell ' + c); legend.appendChild(s);
  });
  legend.appendChild(_el('span', 'heatmap-legend-lbl', 'More'));
  wrap.appendChild(legend);
  return wrap;
}

function _buildLineChart(monthAvgs) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const W = 600, H = 220;
  const padL = 36, padR = 16, padT = 16, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('class', 'dash-line-chart');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const areaGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  areaGrad.setAttribute('id', 'chartAreaGrad'); areaGrad.setAttribute('x1','0'); areaGrad.setAttribute('y1','0'); areaGrad.setAttribute('x2','0'); areaGrad.setAttribute('y2','1');
  const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#6366f1'); s1.setAttribute('stop-opacity','0.22');
  const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','#6366f1'); s2.setAttribute('stop-opacity','0.01');
  areaGrad.appendChild(s1); areaGrad.appendChild(s2); defs.appendChild(areaGrad); svg.appendChild(defs);

  [0, 25, 50, 75, 100].forEach(val => {
    const y = padT + innerH - (val / 100) * innerH;
    const gl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gl.setAttribute('x1', padL); gl.setAttribute('x2', W - padR);
    gl.setAttribute('y1', y); gl.setAttribute('y2', y);
    gl.setAttribute('stroke', val === 0 ? 'rgba(99,102,241,.18)' : 'rgba(99,102,241,.07)');
    gl.setAttribute('stroke-width', '1'); gl.setAttribute('stroke-dasharray', val === 0 ? '' : '3 3');
    svg.appendChild(gl);
    const lt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lt.setAttribute('x', padL - 5); lt.setAttribute('y', y + 3.5);
    lt.setAttribute('text-anchor', 'end'); lt.setAttribute('font-size', '9');
    lt.setAttribute('fill', '#b0b0d0'); lt.setAttribute('font-family', 'Inter,sans-serif');
    lt.textContent = val + '%'; svg.appendChild(lt);
  });

  const pts = monthAvgs.map((avg, i) => ({
    x: padL + (i / 11) * innerW,
    y: padT + innerH - ((avg || 0) / 100) * innerH,
    avg: avg || 0
  }));

  const areaD = ['M', pts[0].x, padT + innerH];
  pts.forEach(p => areaD.push('L', p.x, p.y));
  areaD.push('L', pts[11].x, padT + innerH, 'Z');
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('d', areaD.join(' ')); area.setAttribute('fill', 'url(#chartAreaGrad)');
  svg.appendChild(area);

  let lineD = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i-1].x + pts[i].x) / 2;
    lineD += ' C ' + cp + ' ' + pts[i-1].y + ' ' + cp + ' ' + pts[i].y + ' ' + pts[i].x + ' ' + pts[i].y;
  }
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', lineD); linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', '#6366f1'); linePath.setAttribute('stroke-width', '2.5');
  linePath.setAttribute('stroke-linecap', 'round'); svg.appendChild(linePath);

  pts.forEach((p, i) => {
    if (p.avg === 0) return;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', '4.5');
    dot.setAttribute('fill', '#fff'); dot.setAttribute('stroke', '#6366f1'); dot.setAttribute('stroke-width', '2.5');
    const tt = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    tt.textContent = MONTHS[i] + ': ' + p.avg + '%';
    dot.appendChild(tt); svg.appendChild(dot);
  });

  MONTHS.forEach((m, i) => {
    const xt = padL + (i / 11) * innerW;
    const xl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xl.setAttribute('x', xt); xl.setAttribute('y', H - 6);
    xl.setAttribute('text-anchor', 'middle'); xl.setAttribute('font-size', '9');
    xl.setAttribute('fill', '#b0b0d0'); xl.setAttribute('font-weight', '600');
    xl.setAttribute('font-family', 'Inter,sans-serif');
    xl.textContent = m; svg.appendChild(xl);
  });

  return svg;
}

function renderDashboard(state) {
  const container = document.getElementById('view-dashboard');
  container.innerHTML = '';

  const today         = new Date();
  const curMIdx       = today.getMonth();
  const curDay        = today.getDate();
  const curMonthName  = AppState.MONTH_NAMES[curMIdx];
  const curMonth      = state.months[curMIdx];
  const ytd           = AppState.yearToDateAvg();
  const curAvg        = AppState.monthlyDailyAvg(curMIdx);
  const todayPct      = AppState.dailyProgress(curMIdx, curDay);
  const todayDone     = curMonth.habits.filter(h => {
    const e = curMonth.entries[h] && curMonth.entries[h][curDay];
    return e && (typeof e === 'boolean' ? e : e.done === true);
  }).length;
  const todayTotal    = curMonth.habits.length;
  const totalGoals    = state.goals.length;
  const achievedGoals = state.goals.filter(g => g.status === 'achieved').length;
  const goalPct       = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;
  const hour          = today.getHours();
  const greet         = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // ── Page header ───────────────────────────────────────────
  const hdr = _el('div', 'dash-header');
  const greetWrap = _el('div', 'dash-greet');
  greetWrap.appendChild(_el('h1', 'dash-greet-title', greet + ' 👋'));
  greetWrap.appendChild(_el('p', 'dash-greet-date',
    today.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })));
  hdr.appendChild(greetWrap);
  const hdBadge = _el('div', 'dash-year-badge', String(AppState.getYear()));
  hdr.appendChild(hdBadge);
  container.appendChild(hdr);

  // ── Quote of the day ──────────────────────────────────────
  const q = _quoteOfDay();
  const quoteCard = _el('div', 'dash-quote-card');
  quoteCard.appendChild(_el('div', 'dash-quote-icon', '💬'));
  const quoteTextWrap = _el('div', 'dash-quote-body');
  quoteTextWrap.appendChild(_el('p', 'dash-quote-text', '\u201c' + q.text + '\u201d'));
  quoteTextWrap.appendChild(_el('span', 'dash-quote-author', '\u2014 ' + q.author));
  quoteCard.appendChild(quoteTextWrap);
  container.appendChild(quoteCard);

  // ── KPI cards ─────────────────────────────────────────────
  const kpiRow = _el('div', 'dash-kpi-row');
  [
    { icon: '📈', value: ytd + '%',                   label: 'YTD Average',       sub: 'year-to-date daily rate',             cls: 'kpi-indigo' },
    { icon: '📅', value: curAvg + '%',                label: curMonthName + ' Avg', sub: 'this month\'s daily avg',            cls: 'kpi-violet' },
    { icon: '✅', value: todayDone + ' / ' + todayTotal, label: 'Today\'s Habits', sub: todayPct + '% done today',             cls: 'kpi-green'  },
    { icon: '🎯', value: achievedGoals + ' / ' + totalGoals, label: 'Goals Done', sub: goalPct + '% of goals achieved',       cls: 'kpi-amber'  }
  ].forEach(k => {
    const card = _el('div', 'dash-kpi-card ' + k.cls);
    const circle = _el('div', 'kpi-bg-circle'); card.appendChild(circle);
    const inner = _el('div', 'kpi-inner');
    inner.appendChild(_el('div', 'kpi-icon', k.icon));
    inner.appendChild(_el('div', 'kpi-value', k.value));
    inner.appendChild(_el('div', 'kpi-label', k.label));
    inner.appendChild(_el('div', 'kpi-sub',   k.sub));
    card.appendChild(inner);
    kpiRow.appendChild(card);
  });
  container.appendChild(kpiRow);

  // ── Monthly Progress Bar ─────────────────────────────────
  const daysInCurMonth  = AppState.DAYS_IN_MONTH[curMIdx];
  const monthElapsedPct = Math.round((curDay / daysInCurMonth) * 100);
  const onTrack         = curAvg >= monthElapsedPct;
  const progCard = _el('div', 'dash-card dash-prog-card');
  const progHead = _el('div', 'dash-card-head');
  progHead.appendChild(_el('div', 'dash-card-title', '📅 ' + curMonthName + ' Progress'));
  progHead.appendChild(_el('div', 'dash-card-sub', 'Day ' + curDay + ' of ' + daysInCurMonth + ' — ' + (onTrack ? '✅ On track' : '⚠️ Behind pace')));
  progCard.appendChild(progHead);
  const progRows = _el('div', 'dash-prog-rows');
  [{ label: 'Month elapsed', pct: monthElapsedPct, cls: 'fill-time' },
   { label: 'Your completion', pct: curAvg, cls: onTrack ? 'fill-comp-good' : 'fill-comp-bad' }
  ].forEach(({ label, pct, cls }) => {
    const row = _el('div', 'dash-prog-row');
    row.appendChild(_el('span', 'dash-prog-label', label));
    const track = _el('div', 'dash-prog-track');
    const fill  = _el('div', 'dash-prog-fill ' + cls);
    fill.style.width = Math.min(pct, 100) + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(_el('span', 'dash-prog-val', pct + '%'));
    progRows.appendChild(row);
  });
  progCard.appendChild(progRows);
  container.appendChild(progCard);

  // ── Focus Habit of the Day + Quick-Complete (2-col row) ──
  const todayRemaining = curMonth.habits.filter(h => {
    const e = curMonth.entries[h] && curMonth.entries[h][curDay];
    return !e || !(typeof e === 'boolean' ? e : e.done === true);
  });
  const actionRow = _el('div', 'dash-action-row');

  // Focus Habit
  if (todayRemaining.length > 0) {
    const seed = curDay + curMIdx * 31;
    const focusHabit = todayRemaining[seed % todayRemaining.length];
    const focusCard  = _el('div', 'dash-card dash-focus-card');
    focusCard.appendChild(_el('div', 'dash-card-title', '🎯 Focus Habit of the Day'));
    focusCard.appendChild(_el('div', 'dash-focus-habit', focusHabit));
    focusCard.appendChild(_el('p', 'dash-focus-sub', 'Make this one your priority today.'));
    const focusBtn = _el('button', 'btn btn-primary dash-focus-btn', '✅ Mark Done');
    focusBtn.addEventListener('click', () => {
      renderTimeEntryUI(focusHabit, curDay, curMIdx, null, () => {
        renderDashboard(AppState.getState());
      }, () => {});
    });
    focusCard.appendChild(focusBtn);
    actionRow.appendChild(focusCard);
  }

  // Quick-Complete panel
  if (todayRemaining.length > 0) {
    const qcCard = _el('div', 'dash-card dash-quickdo-card');
    const qcHead = _el('div', 'dash-card-head');
    qcHead.appendChild(_el('div', 'dash-card-title', '⚡ Quick Complete'));
    qcHead.appendChild(_el('div', 'dash-card-sub', 'Tap to mark done for today'));
    qcCard.appendChild(qcHead);
    const qcList = _el('div', 'dash-quickdo-list');
    todayRemaining.forEach(habit => {
      const row  = _el('div', 'dash-quickdo-row');
      const cb   = document.createElement('input');
      cb.type    = 'checkbox'; cb.className = 'dash-quickdo-cb';
      cb.id      = 'qc-' + habit.replace(/\s+/g, '-') + '-' + curDay;
      cb.addEventListener('change', (e) => {
        cb.checked = false; // reset — let time UI confirm it
        renderTimeEntryUI(habit, curDay, curMIdx, null, () => {
          renderDashboard(AppState.getState());
        }, () => {});
      });
      const lbl  = document.createElement('label');
      lbl.className = 'dash-quickdo-label';
      lbl.htmlFor   = cb.id;
      lbl.textContent = habit;
      row.appendChild(cb); row.appendChild(lbl);
      qcList.appendChild(row);
    });
    qcCard.appendChild(qcList);
    actionRow.appendChild(qcCard);
  } else if (todayTotal > 0) {
    const doneCard = _el('div', 'dash-card dash-quickdo-card dash-alldone-card');
    doneCard.appendChild(_el('div', 'dash-card-title', '🎉 All Done!'));
    doneCard.appendChild(_el('p', 'dash-alldone-msg', 'Every habit checked off for today. Amazing work!'));
    actionRow.appendChild(doneCard);
  }
  if (actionRow.children.length > 0) container.appendChild(actionRow);

  // ── Main 2-col grid ───────────────────────────────────────
  const mainGrid = _el('div', 'dash-main-grid');

  // LEFT: line chart
  const chartCard = _el('div', 'dash-card dash-chart-card');
  const chartHead = _el('div', 'dash-card-head');
  chartHead.appendChild(_el('div', 'dash-card-title', '📊 Monthly Performance — ' + AppState.getYear()));
  chartHead.appendChild(_el('div', 'dash-card-sub', 'Daily habit completion rate per month'));
  chartCard.appendChild(chartHead);
  const monthAvgs = AppState.MONTH_NAMES.map((_, i) => AppState.monthlyDailyAvg(i));
  chartCard.appendChild(_buildLineChart(monthAvgs));

  // Month bar summary below chart
  const barRow = _el('div', 'dash-month-bar-row');
  AppState.MONTH_NAMES.forEach((name, i) => {
    const avg = monthAvgs[i];
    const col = _el('div', 'dash-month-bar-col');
    const bar = _el('div', 'dash-month-bar-track');
    const fill = _el('div', 'dash-month-bar-fill');
    fill.style.height = avg + '%';
    fill.title = name + ': ' + avg + '%';
    bar.appendChild(fill);
    col.appendChild(bar);
    col.appendChild(_el('div', 'dash-month-bar-label', name.slice(0,1)));
    barRow.appendChild(col);
  });
  chartCard.appendChild(barRow);
  mainGrid.appendChild(chartCard);

  // RIGHT column
  const rightCol = _el('div', 'dash-right-col');

  // Today ring card
  const todayCard = _el('div', 'dash-card dash-today-card');
  todayCard.appendChild(_el('div', 'dash-card-title', '☀️ Today — ' + curMonthName + ' ' + curDay));
  const ringWrap = _el('div', 'dash-ring-wrap');
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - ((todayTotal > 0 ? todayPct : 0) / 100) * circumference;
  ringWrap.innerHTML = [
    '<svg width="100" height="100" viewBox="0 0 100 100">',
    '<circle cx="50" cy="50" r="36" fill="none" stroke="rgba(99,102,241,.12)" stroke-width="8"/>',
    '<circle cx="50" cy="50" r="36" fill="none" stroke="url(#rg)" stroke-width="8"',
    '  stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"',
    '  stroke-linecap="round" transform="rotate(-90 50 50)"/>',
    '<defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">',
    '<stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>',
    '<text x="50" y="47" text-anchor="middle" font-size="16" font-weight="900" fill="#4f46e5" font-family="Inter,sans-serif">' + (todayTotal > 0 ? todayPct : '—') + (todayTotal > 0 ? '%' : '') + '</text>',
    '<text x="50" y="61" text-anchor="middle" font-size="8" fill="#9090c0" font-weight="700" font-family="Inter,sans-serif">TODAY</text>',
    '</svg>'
  ].join('');
  const ringStats = _el('div', 'dash-ring-stats');
  ringStats.appendChild(_el('div', 'ring-stat-val', todayDone + ' / ' + todayTotal));
  ringStats.appendChild(_el('div', 'ring-stat-lbl', 'Habits Done'));
  const ringRow = _el('div', 'dash-ring-row');
  ringRow.appendChild(ringWrap); ringRow.appendChild(ringStats);
  todayCard.appendChild(ringRow);

  const remaining = curMonth.habits.filter(h => {
    const e = curMonth.entries[h] && curMonth.entries[h][curDay];
    return !e || !(typeof e === 'boolean' ? e : e.done === true);
  });
  if (todayTotal === 0) {
    todayCard.appendChild(_el('div', 'dash-empty-msg', 'No habits tracked for ' + curMonthName + ' yet.'));
  } else if (remaining.length === 0) {
    todayCard.appendChild(_el('div', 'dash-all-done', '🎉 All habits done today!'));
  } else {
    todayCard.appendChild(_el('div', 'dash-remain-label', remaining.length + ' remaining:'));
    const chips = _el('div', 'dash-remain-chips');
    remaining.slice(0, 5).forEach(h => chips.appendChild(_el('div', 'dash-chip', h)));
    if (remaining.length > 5) chips.appendChild(_el('div', 'dash-chip dash-chip-more', '+' + (remaining.length - 5) + ' more'));
    todayCard.appendChild(chips);
  }
  rightCol.appendChild(todayCard);

  // Active streaks card
  const streaks = curMonth.habits
    .map(h => ({ name: h, streak: AppState.habitStreak(curMIdx, h) }))
    .filter(s => s.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6);
  const streakCard = _el('div', 'dash-card dash-streak-card');
  const skHead = _el('div', 'dash-card-head');
  skHead.appendChild(_el('div', 'dash-card-title', '🔥 Active Streaks'));
  skHead.appendChild(_el('div', 'dash-card-sub', curMonthName + ' consecutive days'));
  streakCard.appendChild(skHead);
  if (streaks.length === 0) {
    streakCard.appendChild(_el('div', 'dash-empty-msg', 'Check habits to start a streak!'));
  } else {
    const sl = _el('div', 'dash-streak-list');
    streaks.forEach((s, i) => {
      const row = _el('div', 'dash-streak-row');
      const rank = _el('div', 'dash-rank dash-rank-' + Math.min(i + 1, 4), String(i + 1));
      const name = _el('div', 'dash-streak-name', s.name);
      const badge = _el('div', 'dash-streak-badge', '🔥 ' + s.streak + 'd');
      row.appendChild(rank); row.appendChild(name); row.appendChild(badge);
      sl.appendChild(row);
    });
    streakCard.appendChild(sl);
  }
  rightCol.appendChild(streakCard);
  mainGrid.appendChild(rightCol);
  container.appendChild(mainGrid);

  // ── Goals summary ─────────────────────────────────────────
  if (state.goals.length > 0) {
    const goalsCard = _el('div', 'dash-card dash-goals-card');
    const gHead = _el('div', 'dash-card-head');
    gHead.appendChild(_el('div', 'dash-card-title', '🎯 Goals Overview'));
    gHead.appendChild(_el('div', 'dash-card-sub', achievedGoals + ' of ' + totalGoals + ' achieved'));
    goalsCard.appendChild(gHead);
    const gg = _el('div', 'dash-goals-grid');
    state.goals.slice(0, 6).forEach(goal => {
      const pct = AppState.goalProgress(goal.id);
      const gc = _el('div', 'dash-goal-item');
      const gt = _el('div', 'dash-goal-row');
      const dot = _el('span', 'dash-goal-dot gdot-' + goal.status);
      const gname = _el('span', 'dash-goal-name', goal.title);
      const gbadge = _el('span', 'dash-goal-badge gbadge-' + goal.status, goal.status);
      gt.appendChild(dot); gt.appendChild(gname); gt.appendChild(gbadge);
      gc.appendChild(gt);
      const pb = _progressBar(pct);
      gc.appendChild(pb);
      const gm = _el('div', 'dash-goal-pct', pct + '% complete');
      gc.appendChild(gm);
      gg.appendChild(gc);
    });
    goalsCard.appendChild(gg);
    container.appendChild(goalsCard);
  }

  // ── Year Heatmap ──────────────────────────────────────────
  const heatCard = _el('div', 'dash-card dash-heatmap-card');
  const heatHead = _el('div', 'dash-card-head');
  heatHead.appendChild(_el('div', 'dash-card-title', '🗓️ Activity Heatmap — ' + AppState.getYear()));
  heatHead.appendChild(_el('div', 'dash-card-sub', 'Each square = one day. Darker = more habits done.'));
  heatCard.appendChild(heatHead);
  heatCard.appendChild(_buildYearHeatmap(state));
  container.appendChild(heatCard);

  // ── Weekly Snapshot ──────────────────────────────────────
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekSnap  = _el('div', 'dash-card dash-week-card');
  const wsHead    = _el('div', 'dash-card-head');
  wsHead.appendChild(_el('div', 'dash-card-title', '📆 This Week'));
  let thisWeekSum = 0, lastWeekSum = 0, thisWeekDays = 0;
  const wsDays = [];
  const weekStart = new Date(today);
  const dow = today.getDay();
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const mi = d.getMonth(); const dy = d.getDate();
    const isFuture = d > today;
    const pct = isFuture ? null : AppState.dailyProgress(mi, dy);
    // last week same day
    const ld = new Date(d); ld.setDate(d.getDate() - 7);
    const lpct = AppState.dailyProgress(ld.getMonth(), ld.getDate());
    if (!isFuture) { thisWeekSum += pct; thisWeekDays++; }
    lastWeekSum += lpct;
    wsDays.push({ d, mi, dy, pct, isFuture, dow: d.getDay() });
  }
  const thisWeekAvg = thisWeekDays > 0 ? Math.round(thisWeekSum / thisWeekDays) : 0;
  const lastWeekAvg = Math.round(lastWeekSum / 7);
  const wkDiff = thisWeekAvg - lastWeekAvg;
  wsHead.appendChild(_el('div', 'dash-card-sub',
    'Avg ' + thisWeekAvg + '% this week — ' +
    (wkDiff >= 0 ? '⬆️ +' : '⬇️ ') + wkDiff + '% vs last week'));
  weekSnap.appendChild(wsHead);
  const wsDayRow = _el('div', 'dash-week-row');
  wsDays.forEach(({ d, pct, isFuture, dow: dw }) => {
    const col  = _el('div', 'dash-week-col' + (d.toDateString() === today.toDateString() ? ' dash-week-today' : ''));
    col.appendChild(_el('div', 'dash-week-dow', dowNames[dw]));
    col.appendChild(_el('div', 'dash-week-date', d.getDate()));
    const bar  = _el('div', 'dash-week-bar');
    if (!isFuture && pct !== null) {
      const fill = _el('div', 'dash-week-fill');
      fill.style.height = Math.max(4, pct) + '%';
      fill.style.background = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)';
      fill.title = pct + '%';
      bar.appendChild(fill);
    }
    col.appendChild(bar);
    col.appendChild(_el('div', 'dash-week-pct', isFuture ? '–' : pct + '%'));
    wsDayRow.appendChild(col);
  });
  weekSnap.appendChild(wsDayRow);
  container.appendChild(weekSnap);

  // ── Habit Health Scores + Upcoming Deadlines (2-col) ─────
  const healthRow = _el('div', 'dash-health-row');

  // Habit Health Scores
  if (curMonth.habits.length > 0) {
    const scores = curMonth.habits.map(habit => {
      const done = Object.values(curMonth.entries[habit] || {})
        .filter(e => e && (typeof e === 'boolean' ? e : e.done === true)).length;
      const pct  = curDay > 0 ? Math.round((done / curDay) * 100) : 0;
      return { name: habit, pct };
    }).sort((a, b) => b.pct - a.pct);
    const healthCard = _el('div', 'dash-card dash-health-card');
    const hhHead = _el('div', 'dash-card-head');
    hhHead.appendChild(_el('div', 'dash-card-title', '📊 Habit Health'));
    hhHead.appendChild(_el('div', 'dash-card-sub', 'Completion rate so far this month'));
    healthCard.appendChild(hhHead);
    const hhList = _el('div', 'dash-health-list');
    scores.forEach((s, i) => {
      const row  = _el('div', 'dash-health-row-item');
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' :
                    i >= scores.length - 1 ? '🟥' : '●';
      row.appendChild(_el('span', 'dash-health-medal', medal));
      const nm = _el('span', 'dash-health-name', s.name);
      row.appendChild(nm);
      const track = _el('div', 'dash-health-track');
      const fill  = _el('div', 'dash-health-fill');
      fill.style.width = s.pct + '%';
      fill.style.background = s.pct >= 80 ? 'var(--green)' : s.pct >= 50 ? 'var(--accent)' : 'var(--red)';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(_el('span', 'dash-health-pct', s.pct + '%'));
      hhList.appendChild(row);
    });
    healthCard.appendChild(hhList);
    healthRow.appendChild(healthCard);
  }

  // ── Recent Activity Feed (side-by-side with Habit Health) ──
  const recentActivity = [];
  curMonth.habits.forEach(habit => {
    Object.entries(curMonth.entries[habit] || {}).forEach(([day, entry]) => {
      if (entry && typeof entry === 'object' && entry.done && entry.ts) {
        recentActivity.push({ habit, day: parseInt(day, 10), ts: entry.ts });
      }
    });
  });
  recentActivity.sort((a, b) => b.ts.localeCompare(a.ts));
  if (recentActivity.length > 0) {
    const feedCard = _el('div', 'dash-card dash-feed-card');
    const fdHead   = _el('div', 'dash-card-head');
    fdHead.appendChild(_el('div', 'dash-card-title', '📰 Recent Activity'));
    fdHead.appendChild(_el('div', 'dash-card-sub', curMonthName + ' — latest completions'));
    feedCard.appendChild(fdHead);
    const feedList = _el('div', 'dash-feed-list');
    recentActivity.slice(0, 8).forEach(({ habit, day, ts }) => {
      const item  = _el('div', 'dash-feed-item');
      item.appendChild(_el('span', 'dash-feed-check', '✅'));
      const info  = _el('div', 'dash-feed-info');
      info.appendChild(_el('span', 'dash-feed-habit', habit));
      info.appendChild(_el('span', 'dash-feed-time', curMonthName + ' ' + day + ' · ' + ts.slice(11, 16)));
      item.appendChild(info);
      feedList.appendChild(item);
    });
    feedCard.appendChild(feedList);
    healthRow.appendChild(feedCard);
  }
  if (healthRow.children.length > 0) container.appendChild(healthRow);

  // ── Upcoming Deadlines (full-width row) ───────────────────
  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = state.goals
    .filter(g => g.status !== 'Achieved' && g.deadline)
    .map(g => {
      const daysLeft = Math.ceil((new Date(g.deadline) - new Date(todayStr)) / 86400000);
      return { ...g, daysLeft };
    })
    .filter(g => g.daysLeft >= 0 && g.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (upcoming.length > 0) {
    const dlCard = _el('div', 'dash-card dash-deadline-card');
    const dlHead = _el('div', 'dash-card-head');
    dlHead.appendChild(_el('div', 'dash-card-title', '⏰ Upcoming Deadlines'));
    dlHead.appendChild(_el('div', 'dash-card-sub', 'Goals due within 14 days'));
    dlCard.appendChild(dlHead);
    const dlList = _el('div', 'dash-deadline-list');
    upcoming.forEach(g => {
      const row    = _el('div', 'dash-deadline-row');
      const urgCls = g.daysLeft === 0 ? 'dl-today' : g.daysLeft <= 3 ? 'dl-urgent' : 'dl-soon';
      const badge  = _el('span', 'dash-dl-badge ' + urgCls,
        g.daysLeft === 0 ? 'TODAY' : g.daysLeft + 'd left');
      row.appendChild(badge);
      row.appendChild(_el('span', 'dash-dl-name', g.title || g.description || 'Unnamed goal'));
      dlList.appendChild(row);
    });
    dlCard.appendChild(dlList);
    container.appendChild(dlCard);
  }

  // ── Achievements / Badges ────────────────────────────────
  const newlyAwarded = AppState.checkAndAwardBadges();
  newlyAwarded.forEach(b => {
    const def = AppState.BADGE_DEFS.find(d => d.id === b.id);
    if (def) showToast('🏆 Badge unlocked: ' + def.icon + ' ' + def.name + ' — ' + def.desc, 'success');
  });
  const earned = AppState.getEarnedBadges();
  const badgesCard = _el('div', 'dash-card dash-badges-card');
  const bHead = _el('div', 'dash-card-head');
  bHead.appendChild(_el('div', 'dash-card-title', '🏆 Achievements'));
  bHead.appendChild(_el('div', 'dash-card-sub', earned.length + ' of ' + AppState.BADGE_DEFS.length + ' unlocked'));
  badgesCard.appendChild(bHead);
  const badgeGrid = _el('div', 'dash-badge-grid');
  AppState.BADGE_DEFS.forEach(def => {
    const isEarned = earned.some(e => e.id === def.id);
    const badge = _el('div', 'dash-badge-item' + (isEarned ? ' badge-earned' : ' badge-locked'));
    badge.title = def.desc + (isEarned ? '' : ' (not yet unlocked)');
    badge.appendChild(_el('div', 'badge-icon', isEarned ? def.icon : '🔒'));
    badge.appendChild(_el('div', 'badge-name', def.name));
    if (isEarned) {
      const earnedEntry = earned.find(e => e.id === def.id);
      badge.appendChild(_el('div', 'badge-date', earnedEntry ? earnedEntry.earnedAt.slice(0, 10) : ''));
    }
    badgeGrid.appendChild(badge);
  });
  badgesCard.appendChild(badgeGrid);
  container.appendChild(badgesCard);

}

// ============================================================
// Task 7 — renderYearOverview(state)
// ============================================================

function renderYearOverview(state) {
  const container = document.getElementById('view-year');
  container.innerHTML = '';

  const ytd = AppState.yearToDateAvg();

  // ── Hero stats row ──────────────────────────────────────────
  const hero = _el('div', 'year-hero');

  // Compute year-wide numbers
  let totalHabits = 0, totalChecked = 0, bestMonth = '', bestMonthPct = 0;
  let activeDays = 0;
  AppState.MONTH_NAMES.forEach((name, idx) => {
    const month = state.months[idx];
    const daysInMonth = AppState.DAYS_IN_MONTH[idx];
    month.habits.forEach(h => {
      for (let d = 1; d <= daysInMonth; d++) {
        totalHabits++;
        const e = month.entries[h] && month.entries[h][d];
        if (e && (typeof e === 'boolean' ? e : e.done === true)) { totalChecked++; activeDays++; }
      }
    });
    const avg = AppState.monthlyDailyAvg(idx);
    if (avg > bestMonthPct) { bestMonthPct = avg; bestMonth = name; }
  });
  const overallPct = totalHabits > 0 ? Math.round((totalChecked / totalHabits) * 100) : 0;

  // Count active months (months with any data)
  const activeMonths = AppState.MONTH_NAMES.filter((_, idx) => AppState.monthlyDailyAvg(idx) > 0).length;

  const heroStats = [
    { cls: 'hs-primary', icon: '📊', value: ytd + '%',       label: 'YTD Average',    sub: 'daily completion rate' },
    { cls: 'hs-green',   icon: '✅', value: totalChecked,     label: 'Total Check-ins', sub: 'across all habits' },
    { cls: 'hs-amber',   icon: '🔥', value: activeMonths,     label: 'Active Months',  sub: bestMonth ? 'best: ' + bestMonth + ' (' + bestMonthPct + '%)' : 'no data yet' },
    { cls: 'hs-violet',  icon: '🎯', value: overallPct + '%', label: 'Overall Rate',   sub: totalChecked + ' of ' + totalHabits + ' possible' }
  ];

  heroStats.forEach(s => {
    const card = _el('div', 'hero-stat ' + s.cls);
    card.appendChild(_el('div', 'hero-stat-icon', s.icon));
    card.appendChild(_el('div', 'hero-stat-value', String(s.value)));
    card.appendChild(_el('div', 'hero-stat-label', s.label));
    card.appendChild(_el('div', 'hero-stat-sub', s.sub));
    hero.appendChild(card);
  });
  container.appendChild(hero);

  // ── Section header ──────────────────────────────────────────
  const yearHeader = _el('div', 'year-header');
  const left = _el('div', 'year-header-left');
  left.appendChild(_el('h1', null, 'Monthly Breakdown'));
  left.appendChild(_el('span', 'ytd-badge', 'YTD ' + ytd + '%'));
  yearHeader.appendChild(left);
  container.appendChild(yearHeader);

  // ── Month cards grid ────────────────────────────────────────
  const grid = _el('div', 'year-grid');

  AppState.MONTH_NAMES.forEach((name, idx) => {
    const avg = AppState.monthlyDailyAvg(idx);
    const month = state.months[idx];
    const daysInMonth = AppState.DAYS_IN_MONTH[idx];

    const card = _el('div', 'month-card');
    card.setAttribute('data-month', idx);

    // Header row: name + pct
    const cardHeader = _el('div', 'month-card-header');
    cardHeader.appendChild(_el('div', 'month-card-name', name));

    const pctEl = document.createElement('div');
    pctEl.className = 'month-card-pct';
    pctEl.textContent = avg + '';
    pctEl.appendChild(_el('span', null, '%'));
    cardHeader.appendChild(pctEl);
    card.appendChild(cardHeader);

    // Progress bar
    card.appendChild(_progressBar(avg));

    // Mini heatmap — one dot per day
    const heatmap = _el('div', 'month-heatmap');
    for (let d = 1; d <= 31; d++) {
      const dot = _el('div', 'hm-dot');
      if (d > daysInMonth) {
        dot.classList.add('hm-future');
      } else {
        const pct = AppState.dailyProgress(idx, d);
        // Only show as filled if there's any entry data for this day
        const hasEntry = month.habits.some(h => month.entries[h] && month.entries[h][d] !== undefined);
        if (!hasEntry) {
          dot.classList.add('hm-future');
        } else if (pct === 0)   { /* default grey */ }
        else if (pct < 40)  dot.classList.add('hm-low');
        else if (pct < 70)  dot.classList.add('hm-mid');
        else if (pct < 100) dot.classList.add('hm-high');
        else                dot.classList.add('hm-full');
      }
      heatmap.appendChild(dot);
    }
    card.appendChild(heatmap);

    // Habit count
    const streakEl = _el('div', 'month-card-streak');
    streakEl.innerHTML = month.habits.length + ' habits &nbsp;·&nbsp; <span>' + avg + '%</span> avg';
    card.appendChild(streakEl);

    card.addEventListener('click', () => navigate('month/' + idx));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ============================================================
// Task 8 — renderDailyGrid(state, monthIndex)
// ============================================================
// Day + Time picker — lets user pick any day then log a time
// ============================================================

/**
 * Show a floating day-picker for a habit, then open the time entry modal.
 * Allows logging time for any completed day in the month.
 */
function _showDayTimePicker(habitName, monthIndex, month, daysInMonth) {
  // Remove any existing picker
  document.querySelectorAll('.day-time-picker').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'day-time-picker';

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'day-time-backdrop';
  backdrop.addEventListener('click', () => {
    backdrop.remove();
    picker.remove();
  });
  document.body.appendChild(backdrop);

  const title = document.createElement('div');
  title.className = 'dtp-title';
  title.textContent = 'Pick a day to log time for "' + habitName + '"';
  picker.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'dtp-subtitle';
  subtitle.textContent = 'Right-click any checked cell, or select a day below:';
  picker.appendChild(subtitle);

  const grid = document.createElement('div');
  grid.className = 'dtp-grid';

  for (let d = 1; d <= daysInMonth; d++) {
    const entryVal = month.entries[habitName] && month.entries[habitName][d];
    const checked  = entryVal ? (typeof entryVal === 'boolean' ? entryVal : entryVal.done === true) : false;
    const entryTs  = (entryVal && typeof entryVal === 'object') ? entryVal.ts : null;

    const btn = document.createElement('button');
    btn.className = 'dtp-day' + (checked ? ' dtp-day-done' : ' dtp-day-empty');
    btn.textContent = String(d);
    btn.title = checked
      ? (entryTs ? 'Logged: ' + entryTs.slice(11, 16) + ' — click to change' : 'Done — click to log time')
      : 'Not done — click to mark done and log time';

    btn.addEventListener('click', () => {
      backdrop.remove();
      picker.remove();
      renderTimeEntryUI(habitName, d, monthIndex, entryTs, () => {
        renderDailyGrid(AppState.getState(), monthIndex);
      }, () => {});
    });

    grid.appendChild(btn);
  }

  picker.appendChild(grid);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dtp-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close';
  closeBtn.addEventListener('click', () => { backdrop.remove(); picker.remove(); });
  picker.appendChild(closeBtn);

  document.body.appendChild(picker);
}

function renderDailyGrid(state, monthIndex) {
  // Remove any floating habit popups left from previous render
  document.querySelectorAll('.habit-popup, .day-time-picker, .day-time-backdrop').forEach(el => el.remove());

  // Replace panel node to remove ALL accumulated event listeners from previous renders.
  // (panel.innerHTML = '' clears children but NOT listeners on the panel itself.)
  const oldPanel = document.getElementById('tab-daily');
  const panel    = oldPanel.cloneNode(false);   // false = no children
  oldPanel.parentNode.replaceChild(panel, oldPanel);

  const month      = state.months[monthIndex];
  const daysInMonth= AppState.DAYS_IN_MONTH[monthIndex];
  const archived   = month.archived || false;
  const pinned     = month.pinnedHabits  || [];
  const tags       = month.habitTags     || {};
  const freqs      = month.habitFrequency || {};
  const dayNotes   = month.dayNotes      || {};

  // --- Archive banner ---
  if (archived) {
    const banner = _el('div', 'archive-banner');
    const msg = _el('span', null, '🔒 This month is archived — editing is locked.');
    const unBtn = _el('button', 'btn btn-sm btn-secondary', 'Unarchive');
    unBtn.addEventListener('click', () => {
      AppState.unarchiveMonth(monthIndex);
      renderDailyGrid(AppState.getState(), monthIndex);
    });
    banner.appendChild(msg); banner.appendChild(unBtn);
    panel.appendChild(banner);
  }

  // --- Controls row ---
  const ctrlRow = _el('div', 'grid-controls-row');
  const srcIdx  = monthIndex === 0 ? 11 : monthIndex - 1;
  const srcName = AppState.MONTH_NAMES[srcIdx];
  if (!archived) {
    const copyBtn = _el('button', 'btn btn-secondary btn-sm', '📋 Copy habits from ' + srcName);
    copyBtn.title = 'Add all habits from ' + srcName + ' that are not already here';
    copyBtn.addEventListener('click', () => {
      const added = AppState.copyHabitsFromMonth(monthIndex, srcIdx);
      if (added > 0) {
        renderDailyGrid(AppState.getState(), monthIndex);
        renderWeeklySummary(AppState.getState(), monthIndex);
        renderStatistics(AppState.getState(), monthIndex);
        showToast(added + ' habit(s) copied from ' + srcName + '.', 'success');
      } else {
        showToast('All habits from ' + srcName + ' are already here.', 'success');
      }
    });
    ctrlRow.appendChild(copyBtn);

    const archBtn = _el('button', 'btn btn-secondary btn-sm', '🔒 Archive');
    archBtn.title = 'Lock this month from further edits';
    archBtn.addEventListener('click', () => {
      AppState.archiveMonth(monthIndex);
      renderDailyGrid(AppState.getState(), monthIndex);
      showToast(AppState.MONTH_NAMES[monthIndex] + ' archived.', 'success');
    });
    ctrlRow.appendChild(archBtn);

    // Copy to all future months
    const copyFutureBtn = _el('button', 'btn btn-secondary btn-sm', '📋→ All Future');
    copyFutureBtn.title = 'Copy habits to all future months this year';
    copyFutureBtn.addEventListener('click', () => {
      let total = 0;
      for (let m = monthIndex + 1; m < 12; m++) total += AppState.copyHabitsFromMonth(m, monthIndex);
      showToast(total + ' habit(s) copied to future months.', 'success');
    });
    ctrlRow.appendChild(copyFutureBtn);

    // CSV export
    const csvBtn = _el('button', 'btn btn-secondary btn-sm', '⬇ CSV');
    csvBtn.title = 'Export this month as CSV';
    csvBtn.addEventListener('click', () => exportMonthCSV(monthIndex));
    ctrlRow.appendChild(csvBtn);

    // Print/PDF
    const printBtn = _el('button', 'btn btn-secondary btn-sm', '🖨 Print');
    printBtn.title = 'Print / save as PDF';
    printBtn.addEventListener('click', () => printMonthReport(monthIndex));
    ctrlRow.appendChild(printBtn);
  }
  panel.appendChild(ctrlRow);

  // --- Search / filter bar ---
  const searchWrap = _el('div', 'grid-search-wrap');
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'grid-search-input';
  searchInput.placeholder = '🔍 Filter habits…';
  searchInput.autocomplete = 'off';
  searchWrap.appendChild(searchInput);
  panel.appendChild(searchWrap);

  // --- Sort habits: pinned first ---
  const sortedHabits = [
    ...pinned.filter(h => month.habits.includes(h)),
    ...month.habits.filter(h => !pinned.includes(h))
  ];

  const todayDate = new Date();
  const todayMonthIdx = todayDate.getMonth();
  const todayDay      = todayDate.getDate();
  const isCurrentMonth = (monthIndex === todayMonthIdx) && (todayDate.getFullYear() === AppState.getYear());

  // Precompute daily completion % once — used for color-coding each checked cell
  const dailyPcts = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyPcts[d] = AppState.dailyProgress(monthIndex, d);
  }

  const wrap  = _el('div', 'grid-wrap');
  const table = _el('table', 'habit-grid');

  // --- COLGROUP: enforce fixed column widths so table never scrolls ---
  // Available width = container width. Fixed cols take 262px.
  // Remaining is split equally among daysInMonth day columns.
  const colgroup = document.createElement('colgroup');
  // Col 1: drag
  const cDrag = document.createElement('col'); cDrag.style.width = '18px'; colgroup.appendChild(cDrag);
  // Col 2: habit name
  const cName = document.createElement('col'); cName.style.width = '150px'; colgroup.appendChild(cName);
  // Day cols: fluid — browser will distribute remaining space
  for (let d = 1; d <= daysInMonth; d++) {
    const cDay = document.createElement('col');
    cDay.className = 'col-day';
    colgroup.appendChild(cDay);
  }
  // Streak col
  const cStreak = document.createElement('col'); cStreak.style.width = '56px'; colgroup.appendChild(cStreak);
  // Actions col
  const cAct = document.createElement('col'); cAct.style.width = '38px'; colgroup.appendChild(cAct);
  table.appendChild(colgroup);

  // --- THEAD with day-note indicators ---
  const thead   = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(_el('th', 'th-drag', ''));
  headRow.appendChild(_el('th', 'th-habit', 'Habit'));
  for (let d = 1; d <= daysInMonth; d++) {
    const th = document.createElement('th');
    const hasNote = !!dayNotes[d];
    th.textContent = String(d);
    if (hasNote) th.classList.add('day-has-note');
    th.title  = hasNote ? '📝 ' + dayNotes[d] : 'Click to add note for day ' + d;
    th.classList.add('day-th-clickable');
    th.setAttribute('data-day-note', d);
    if (isCurrentMonth && d === todayDay) th.classList.add('th-today');
    headRow.appendChild(th);
  }
  headRow.appendChild(_el('th', 'th-streak', '🔥'));
  headRow.appendChild(_el('th', null, ''));
  thead.appendChild(headRow);
  table.appendChild(thead);

  // --- TBODY ---
  const tbody = document.createElement('tbody');
  let _draggedHabit = null;

  sortedHabits.forEach(habit => {
    const isPinned  = pinned.includes(habit);
    const tag       = tags[habit] || '';
    const streak    = AppState.habitStreak(monthIndex, habit);
    const habitColor = AppState.getHabitColor(monthIndex, habit);
    const tr        = document.createElement('tr');
    tr.setAttribute('data-habit-name', habit.toLowerCase());
    if (isPinned) tr.classList.add('row-pinned');
    if (tag) tr.setAttribute('data-tag', tag);
    if (habitColor) tr.style.setProperty('--habit-color', habitColor);

    // Drag-handle cell
    const tdDrag = document.createElement('td');
    tdDrag.className = 'td-drag';
    if (!archived) {
      const handle = _el('span', 'drag-handle', '⠿');
      handle.title = 'Drag to reorder';
      tdDrag.appendChild(handle);
      tdDrag.draggable = true;
      tdDrag.addEventListener('dragstart', e => {
        _draggedHabit = habit;
        tr.classList.add('row-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', habit);
        e.stopPropagation();
      });
      tdDrag.addEventListener('dragend', () => {
        tr.classList.remove('row-dragging');
        tbody.querySelectorAll('.row-drag-over').forEach(r => r.classList.remove('row-drag-over'));
        _draggedHabit = null;
      });
      tr.addEventListener('dragover', e => {
        if (!_draggedHabit || _draggedHabit === habit) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tbody.querySelectorAll('.row-drag-over').forEach(r => r.classList.remove('row-drag-over'));
        tr.classList.add('row-drag-over');
      });
      tr.addEventListener('dragleave', e => {
        if (!tr.contains(e.relatedTarget)) tr.classList.remove('row-drag-over');
      });
      tr.addEventListener('drop', e => {
        e.preventDefault();
        tr.classList.remove('row-drag-over');
        if (_draggedHabit && _draggedHabit !== habit) {
          AppState.reorderHabit(monthIndex, _draggedHabit, habit);
          renderDailyGrid(AppState.getState(), monthIndex);
          renderWeeklySummary(AppState.getState(), monthIndex);
          renderStatistics(AppState.getState(), monthIndex);
        }
        _draggedHabit = null;
      });
    }
    tr.appendChild(tdDrag);

    // Habit name cell: pin btn + name only (no inline meta)
    const tdName = document.createElement('td');
    tdName.className = 'td-habit-name';

    const pinBtn = _el('button', 'pin-btn' + (isPinned ? ' pinned' : ''), isPinned ? '📌' : '📍');
    pinBtn.title = isPinned ? 'Unpin habit' : 'Pin to top';
    pinBtn.setAttribute('data-pin-habit', habit);
    tdName.appendChild(pinBtn);

    // Color swatch dot
    if (habitColor) {
      const dot = _el('span', 'habit-color-dot');
      dot.style.background = habitColor;
      tdName.appendChild(dot);
    }

    tdName.appendChild(_el('span', 'habit-label', habit));

    // ── Click-based settings popup ─────────────────────────────
    // Hover approaches fail because the popup lives in <body> (separate DOM tree)
    // and there is always a gap between the cell and popup where mouseleave fires.
    // Solution: show a ⚙ button on row-hover (pure CSS), click to pin popup open,
    // close on outside-click or ESC.
    if (!archived) {
      let _popup = null;

      const editBtn = _el('button', 'habit-edit-btn', '\u2699');
      editBtn.title = 'Habit settings';
      editBtn.setAttribute('aria-label', 'Edit settings for ' + habit);
      tdName.appendChild(editBtn);

      function _buildPopup() {
        const pop = _el('div', 'habit-popup');

        // Close button
        const closeBtn = _el('button', 'habit-popup-close', '\u2715');
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); _closePopup(); });
        pop.appendChild(closeBtn);

        // Habit name header
        pop.appendChild(_el('div', 'habit-popup-title', habit));

        // Tag badge
        if (tag) pop.appendChild(_el('span', 'habit-tag-badge', tag));

        // Frequency
        const freqWrap = _el('div', 'habit-popup-field');
        freqWrap.appendChild(_el('label', 'habit-popup-label', 'Freq'));
        const freqSel = document.createElement('select');
        freqSel.className = 'habit-popup-select';
        [['daily','Daily'],['weekdays','Weekdays'],['3x','3\u00d7/wk'],['5x','5\u00d7/wk'],['6x','6\u00d7/wk']].forEach(([val, lbl]) => {
          const o = _el('option', null, lbl); o.value = val;
          if ((freqs[habit] || 'daily') === val) o.selected = true;
          freqSel.appendChild(o);
        });
        freqSel.addEventListener('change', () => { AppState.setHabitFrequency(monthIndex, habit, freqSel.value); renderDailyGrid(AppState.getState(), monthIndex); });
        freqWrap.appendChild(freqSel);
        pop.appendChild(freqWrap);

        // Category
        const catWrap = _el('div', 'habit-popup-field');
        catWrap.appendChild(_el('label', 'habit-popup-label', 'Category'));
        const catSel = document.createElement('select');
        catSel.className = 'habit-popup-select';
        AppState.HABIT_CATEGORIES.forEach(cat => {
          const o = _el('option', null, cat); o.value = cat;
          if (AppState.getHabitCategory(monthIndex, habit) === cat) o.selected = true;
          catSel.appendChild(o);
        });
        catSel.addEventListener('change', () => { AppState.setHabitCategory(monthIndex, habit, catSel.value); });
        catWrap.appendChild(catSel);
        pop.appendChild(catWrap);

        // Color
        const colorWrap = _el('div', 'habit-popup-field');
        colorWrap.appendChild(_el('label', 'habit-popup-label', 'Color'));
        const colorInput = document.createElement('input');
        colorInput.type = 'color'; colorInput.className = 'habit-popup-color';
        colorInput.value = AppState.getHabitColor(monthIndex, habit) || '#6366f1';
        colorInput.addEventListener('change', () => { AppState.setHabitColor(monthIndex, habit, colorInput.value); renderDailyGrid(AppState.getState(), monthIndex); });
        colorWrap.appendChild(colorInput);
        pop.appendChild(colorWrap);

        // Reminder
        const remWrap = _el('div', 'habit-popup-field');
        remWrap.appendChild(_el('label', 'habit-popup-label', '\u23f0 Reminder'));
        const remInput = document.createElement('input');
        remInput.type = 'time'; remInput.className = 'habit-popup-time';
        remInput.value = AppState.getHabitReminder(monthIndex, habit) || '';
        remInput.addEventListener('change', () => {
          AppState.setHabitReminder(monthIndex, habit, remInput.value || null);
          if (remInput.value) showToast('\u23f0 Reminder set: ' + habit + ' at ' + remInput.value, 'success');
        });
        remWrap.appendChild(remInput);
        pop.appendChild(remWrap);

        // Numeric target
        const numWrap = _el('div', 'habit-popup-field');
        numWrap.appendChild(_el('label', 'habit-popup-label', 'Target #'));
        const numInput = document.createElement('input');
        numInput.type = 'number'; numInput.className = 'habit-popup-num';
        numInput.min = '0'; numInput.max = '9999'; numInput.placeholder = 'e.g. 8000';
        const curTarget = AppState.getNumericTarget(monthIndex, habit);
        numInput.value = curTarget !== null ? curTarget : '';
        numInput.addEventListener('change', () => {
          const val = parseInt(numInput.value, 10);
          AppState.setNumericTarget(monthIndex, habit, isNaN(val) || val <= 0 ? null : val);
          renderDailyGrid(AppState.getState(), monthIndex);
        });
        numWrap.appendChild(numInput);
        pop.appendChild(numWrap);

        return pop;
      }

      function _openPopup() {
        // Close any other open popup first
        document.querySelectorAll('.habit-popup').forEach(p => p.remove());
        _popup = _buildPopup();
        _popup.style.position = 'fixed';
        document.body.appendChild(_popup);

        // Position after render
        requestAnimationFrame(() => {
          if (!_popup) return;
          const rect = editBtn.getBoundingClientRect();
          const popW = _popup.offsetWidth  || 260;
          const popH = _popup.offsetHeight || 260;
          const viewW = window.innerWidth;
          const viewH = window.innerHeight;
          let left = rect.right + 6;
          if (left + popW > viewW - 8) left = rect.left - popW - 6;
          if (left < 8) left = 8;
          let top = rect.top;
          if (top + popH > viewH - 8) top = viewH - popH - 8;
          if (top < 8) top = 8;
          _popup.style.left = left + 'px';
          _popup.style.top  = top  + 'px';
        });

        editBtn.classList.add('active');

        // Close on ESC
        const _onKey = (e) => { if (e.key === 'Escape') { _closePopup(); document.removeEventListener('keydown', _onKey); } };
        document.addEventListener('keydown', _onKey);

        // Close on outside click (next tick so this click doesn't immediately close it)
        setTimeout(() => {
          const _onOutside = (e) => {
            if (_popup && !_popup.contains(e.target) && e.target !== editBtn) {
              _closePopup();
              document.removeEventListener('click', _onOutside);
              document.removeEventListener('keydown', _onKey);
            }
          };
          document.addEventListener('click', _onOutside);
        }, 0);
      }

      function _closePopup() {
        if (_popup) { _popup.remove(); _popup = null; }
        editBtn.classList.remove('active');
      }

      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_popup) { _closePopup(); } else { _openPopup(); }
      });
    }

    // Keep the old habitMeta div empty (for backward compat with event delegation)
    const habitMeta = _el('div', 'habit-meta');
    if (tag) {
      const tagBadge = _el('span', 'habit-tag-badge', tag);
      tagBadge.setAttribute('data-tag', tag);
      habitMeta.appendChild(tagBadge);
    }
    if (habitMeta.children.length > 0) tdName.appendChild(habitMeta);
    tr.appendChild(tdName);

    // Day cells — only render actual days in this month
    const numTarget = AppState.getNumericTarget(monthIndex, habit);
    for (let d = 1; d <= daysInMonth; d++) {
      const td = document.createElement('td');
      const entryVal = month.entries[habit] && month.entries[habit][d];
      const checked  = entryVal ? (typeof entryVal === 'boolean' ? entryVal : entryVal.done === true) : false;
      const entryTs  = (entryVal && typeof entryVal === 'object') ? entryVal.ts : null;
      let checkedClass = '';
      if (checked) {
        const pct = dailyPcts[d] || 0;
        checkedClass = pct >= 70 ? ' cell-checked-high' : pct >= 40 ? ' cell-checked-mid' : ' cell-checked-low';
      }
      td.className = 'entry-cell' + checkedClass + (archived ? ' cell-archived' : '') + (isCurrentMonth && d === todayDay ? ' td-today' : '');

      // Numeric habit mode: show +/- counter
      if (numTarget !== null && !archived) {
        td.classList.add('entry-cell-numeric');
        td.removeAttribute('data-habit');
        td.removeAttribute('data-day');
        const numVal = AppState.getNumericEntry(monthIndex, habit, d);
        const numWrap = _el('div', 'num-cell-wrap');
        const decBtn  = _el('button', 'num-btn num-dec', '\u2212');
        const numDisp = _el('span', 'num-display' + (numVal >= numTarget ? ' num-done' : ''), String(numVal));
        const incBtn  = _el('button', 'num-btn num-inc', '+');
        decBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (numVal > 0) { AppState.setNumericEntry(monthIndex, habit, d, numVal - 1); renderDailyGrid(AppState.getState(), monthIndex); }
        });
        incBtn.addEventListener('click', e => {
          e.stopPropagation();
          AppState.setNumericEntry(monthIndex, habit, d, numVal + 1);
          if (numVal + 1 >= numTarget) _playTickSound();
          renderDailyGrid(AppState.getState(), monthIndex);
        });
        numWrap.appendChild(decBtn);
        numWrap.appendChild(numDisp);
        numWrap.appendChild(incBtn);
        numWrap.appendChild(_el('span', 'num-target-lbl', '/' + numTarget));
        td.appendChild(numWrap);
      } else {
        if (!archived) {
          td.setAttribute('data-habit', habit);
          td.setAttribute('data-day', d);
        }
        // Show timestamp badge if present
        if (entryTs) {
          const tsBadge = _el('span', 'cell-ts-badge', entryTs.slice(11, 16));
          td.appendChild(tsBadge);
        }
        // Right-click on any checked cell opens time entry for that day
        if (!archived && checked) {
          td.title = entryTs ? 'Logged: ' + entryTs.slice(11, 16) + ' \u2014 right-click to change' : 'Right-click to log time';
          td.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();
            const currentTs = (month.entries[habit] && typeof month.entries[habit][d] === 'object')
              ? month.entries[habit][d].ts : null;
            renderTimeEntryUI(habit, d, monthIndex, currentTs, () => {
              renderDailyGrid(AppState.getState(), monthIndex);
            }, () => {});
          });
        }
      }
      tr.appendChild(td);
    }

    // Streak + completion cell (with clock icon for manual time entry)
    const doneCount = Array.from({length: daysInMonth}, (_, i) => i + 1)
      .filter(d => {
        const e = month.entries[habit] && month.entries[habit][d];
        return e ? (typeof e === 'boolean' ? e : e.done === true) : false;
      }).length;
    const tdStreak = document.createElement('td');
    tdStreak.className = 'td-streak';
    const streakWrap = _el('div', 'streak-wrap');
    if (streak > 0) {
      const badge = _el('span', 'streak-badge', '🔥 ' + streak);
      badge.title = 'Current streak: ' + streak + ' days';
      streakWrap.appendChild(badge);
    }
    if (doneCount > 0) {
      streakWrap.appendChild(_el('span', 'habit-done-count', doneCount + '/' + daysInMonth));
    }
    tdStreak.appendChild(streakWrap);
    tr.appendChild(tdStreak);

    // Delete cell (+ clock icon for manual time entry — any day)
    const tdRemove = document.createElement('td');
    if (!archived) {
      // Clock icon — opens a day picker then time entry modal
      const clockBtn = _el('button', 'btn-icon grid-clock-btn', '🕐');
      clockBtn.title = 'Log time for any day this month';
      clockBtn.setAttribute('aria-label', 'Log completion time for ' + habit);
      clockBtn.addEventListener('click', e => {
        e.stopPropagation();
        _showDayTimePicker(habit, monthIndex, month, daysInMonth);
      });
      tdRemove.appendChild(clockBtn);

      const delBtn = _el('button', 'btn-icon', '×');
      delBtn.title = 'Delete habit';
      delBtn.setAttribute('data-remove-habit', habit);
      tdRemove.appendChild(delBtn);
    }
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });

  // --- TFOOT ---
  const tfoot   = document.createElement('tfoot');
  const footRow = document.createElement('tr');
  footRow.className = 'grid-footer';
  footRow.appendChild(document.createElement('td'));
  footRow.appendChild(_el('td', null, 'Progress'));
  for (let d = 1; d <= daysInMonth; d++) {
    const td = document.createElement('td');
    if (isCurrentMonth && d === todayDay) td.classList.add('td-today');
    const pct = AppState.dailyProgress(monthIndex, d);
    if (pct > 0) {
      const barWrap = _el('div', 'foot-day-bar');
      const fill    = _el('div', 'foot-day-fill' + (pct >= 80 ? ' pct-high' : pct < 40 ? ' pct-low' : ''));
      const maxPx   = 28;
      fill.style.height = Math.max(2, Math.round((pct / 100) * maxPx)) + 'px';
      const lbl = _el('span', 'foot-day-pct', pct + '%');
      barWrap.appendChild(fill);
      barWrap.appendChild(lbl);
      td.appendChild(barWrap);
    }
    footRow.appendChild(td);
  }
  footRow.appendChild(document.createElement('td'));
  footRow.appendChild(document.createElement('td'));
  tfoot.appendChild(footRow);

  table.appendChild(tbody); table.appendChild(tfoot);
  wrap.appendChild(table);
  panel.appendChild(wrap);

  // --- Wire search / filter ---
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    tbody.querySelectorAll('tr[data-habit-name]').forEach(row => {
      row.style.display = (!q || row.getAttribute('data-habit-name').includes(q)) ? '' : 'none';
    });
  });

  // --- Mood Tracker section ---
  const moodSection = _el('div', 'mood-tracker-section');
  const moodToggle  = _el('button', 'btn btn-secondary btn-sm mood-toggle-btn', '🎨 Mood Tracker');
  const moodBody    = _el('div', 'mood-body hidden');
  const moodGrid    = _el('div', 'mood-day-grid');
  for (let d = 1; d <= daysInMonth; d++) {
    const current = AppState.getMoodEntry(monthIndex, d);
    const col = _el('div', 'mood-day-col');
    col.appendChild(_el('div', 'mood-day-num', String(d)));
    const picker = _el('div', 'mood-picker');
    AppState.MOOD_EMOJIS.forEach((emoji, i) => {
      const moodVal = i + 1;
      const btn = _el('button', 'mood-btn' + (current === moodVal ? ' mood-selected' : ''), emoji);
      btn.title = ['Terrible', 'Bad', 'Okay', 'Good', 'Amazing'][i] + ' (day ' + d + ')';
      btn.addEventListener('click', () => {
        AppState.setMoodEntry(monthIndex, d, current === moodVal ? null : moodVal);
        renderDailyGrid(AppState.getState(), monthIndex);
        setTimeout(() => {
          const ms = document.querySelector('.mood-body');
          if (ms) ms.classList.remove('hidden');
        }, 50);
      });
      picker.appendChild(btn);
    });
    col.appendChild(picker);
    moodGrid.appendChild(col);
  }
  moodBody.appendChild(moodGrid);
  moodToggle.addEventListener('click', () => {
    moodBody.classList.toggle('hidden');
    moodToggle.textContent = moodBody.classList.contains('hidden') ? '🎨 Mood Tracker' : '✕ Close Mood';
  });
  moodSection.appendChild(moodToggle);
  moodSection.appendChild(moodBody);
  panel.appendChild(moodSection);

  // Popup is now click-pinned — no mouseleave cleanup needed on the grid.

  // --- Event delegation: cells, pin, delete ---
  panel.addEventListener('click', e => {
    // Close popup only if the click was NOT inside a habit-popup or on a habit-edit-btn
    if (!e.target.closest('.habit-popup') && !e.target.closest('.habit-edit-btn')) {
      document.querySelectorAll('.habit-popup').forEach(el => el.remove());
    }

    // Toggle entry
    const cell = e.target.closest('.entry-cell:not(.cell-disabled):not(.cell-archived)');
    if (cell) {
      const habitName = cell.getAttribute('data-habit');
      const day       = parseInt(cell.getAttribute('data-day'), 10);
      const curEntry  = AppState.getState().months[monthIndex].entries[habitName] &&
                        AppState.getState().months[monthIndex].entries[habitName][day];
      const isChecked = curEntry ? (typeof curEntry === 'boolean' ? curEntry : curEntry.done === true) : false;

      if (!isChecked) {
        // Marking COMPLETE — ask for time first
        const existingTs = (curEntry && typeof curEntry === 'object') ? curEntry.ts : null;
        renderTimeEntryUI(habitName, day, monthIndex, existingTs, () => {
          _playTickSound();
          // Micro-animation on the cell
          const doneCell = panel.querySelector('[data-habit="' + habitName + '"][data-day="' + day + '"]');
          if (doneCell) { doneCell.classList.add('cell-pop'); setTimeout(() => doneCell.classList.remove('cell-pop'), 400); }
          // After time confirmed, check for positive reinforcement
          const newState = AppState.getState();
          const newEntry = newState.months[monthIndex].entries[habitName] &&
                           newState.months[monthIndex].entries[habitName][day];
          if (newEntry && typeof newEntry === 'object' && newEntry.done === true && newEntry.ts) {
            const pred = getPredictedTime(newState, habitName);
            if (pred && newState.positiveReinforcement !== false) {
              if (isOnTime(newEntry.ts, pred, newState.onTimeThreshold || 15)) {
                showToast('🎯 On time! Great job with "' + habitName + '"', 'success');
              }
            }
          }
          renderDailyGrid(newState, monthIndex);
        }, () => {
          // Cancelled — do nothing
        });
      } else {
        // Marking INCOMPLETE — just toggle, no time needed
        AppState.toggleEntry(monthIndex, habitName, day);
        renderDailyGrid(AppState.getState(), monthIndex);
      }
      return;
    }
    // Pin / unpin
    const pinBtn = e.target.closest('[data-pin-habit]');
    if (pinBtn) {
      const h = pinBtn.getAttribute('data-pin-habit');
      if ((month.pinnedHabits || []).includes(h)) AppState.unpinHabit(monthIndex, h);
      else AppState.pinHabit(monthIndex, h);
      renderDailyGrid(AppState.getState(), monthIndex);
      return;
    }
    // Remove habit
    const delBtn = e.target.closest('[data-remove-habit]');
    if (delBtn) {
      AppState.removeHabit(monthIndex, delBtn.getAttribute('data-remove-habit'));
      renderDailyGrid(AppState.getState(), monthIndex);
      renderWeeklySummary(AppState.getState(), monthIndex);
      renderStatistics(AppState.getState(), monthIndex);
      return;
    }
    // Day note header click
    const dayTh = e.target.closest('[data-day-note]');
    if (dayTh) {
      const day = parseInt(dayTh.getAttribute('data-day-note'), 10);
      _showDayNotePopup(monthIndex, day, dayTh);
    }
  });

  if (archived) return;

  // --- Add-habit row ---
  const addSection = _el('div', 'add-habit-section');

  const addRow = _el('div', 'add-habit-row');
  const input  = _el('input');
  input.type   = 'text';
  input.placeholder = 'New habit name…';
  input.className   = 'form-control';
  input.id          = 'new-habit-input';

  // Tag selector
  const tagSel = document.createElement('select');
  tagSel.className = 'form-control tag-select';
  tagSel.title = 'Optional: assign a category tag';
  const blankOpt = _el('option', null, '🏷 Tag');
  blankOpt.value = '';
  tagSel.appendChild(blankOpt);
  AppState.HABIT_TAGS.forEach(t => {
    const opt = _el('option', null, t); opt.value = t; tagSel.appendChild(opt);
  });

  const addBtn = _el('button', 'btn btn-primary', '+ Add');
  addBtn.id    = 'btn-add-habit';
  const errMsg = _el('div', 'inline-error');
  errMsg.id    = 'add-habit-error';

  addRow.appendChild(input);
  addRow.appendChild(tagSel);
  addRow.appendChild(addBtn);
  addSection.appendChild(addRow);
  addSection.appendChild(errMsg);

  // --- Suggest Habits expandable ---
  const suggestToggle = _el('button', 'btn btn-secondary btn-sm suggest-toggle', '💡 Suggest Habits');
  suggestToggle.type  = 'button';
  const suggestPanel  = _el('div', 'suggest-panel hidden');

  AppState.SUGGESTED_HABITS.forEach(cat => {
    const catDiv  = _el('div', 'suggest-category');
    catDiv.appendChild(_el('div', 'suggest-cat-label', cat.category));
    const chipsDiv = _el('div', 'suggest-chips');
    cat.habits.forEach(h => {
      const chip = _el('button', 'suggest-chip', h);
      chip.type  = 'button';
      chip.title = 'Click to fill input, double-click to add directly';
      chip.addEventListener('click', () => {
        input.value = h; input.focus();
      });
      chip.addEventListener('dblclick', () => {
        const r = AppState.addHabit(monthIndex, h);
        if (r.ok) {
          renderDailyGrid(AppState.getState(), monthIndex);
          renderWeeklySummary(AppState.getState(), monthIndex);
          renderStatistics(AppState.getState(), monthIndex);
          showToast('"' + h + '" added.', 'success');
        }
      });
      chipsDiv.appendChild(chip);
    });
    catDiv.appendChild(chipsDiv);
    suggestPanel.appendChild(catDiv);
  });

  suggestToggle.addEventListener('click', () => {
    suggestPanel.classList.toggle('hidden');
    suggestToggle.textContent = suggestPanel.classList.contains('hidden') ? '💡 Suggest Habits' : '✕ Close Suggestions';
  });

  addSection.appendChild(suggestToggle);
  addSection.appendChild(suggestPanel);
  panel.appendChild(addSection);

  // Add habit events
  addBtn.addEventListener('click', () => {
    const result = AppState.addHabit(monthIndex, input.value);
    if (!result.ok) {
      errMsg.textContent = result.error;
    } else {
      errMsg.textContent = '';
      if (tagSel.value) AppState.setHabitTag(monthIndex, input.value.trim() || '', tagSel.value);
      input.value  = '';
      tagSel.value = '';
      renderDailyGrid(AppState.getState(), monthIndex);
      renderWeeklySummary(AppState.getState(), monthIndex);
      renderStatistics(AppState.getState(), monthIndex);
    }
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
}

function _showDayNotePopup(monthIndex, day, anchorEl) {
  document.querySelectorAll('.day-note-popup').forEach(p => p.remove());
  const month    = AppState.getState().months[monthIndex];
  const dayNotes = month.dayNotes || {};
  const existing = dayNotes[day] || '';

  const popup    = _el('div', 'day-note-popup');
  const label    = _el('div', 'day-note-label', '📝 Note for Day ' + day);
  const textarea = document.createElement('textarea');
  textarea.className   = 'day-note-textarea';
  textarea.placeholder = 'Add a note for this day…';
  textarea.value       = existing;
  textarea.rows        = 3;

  const saveBtn  = _el('button', 'btn btn-primary btn-sm', 'Save');
  const clearBtn = _el('button', 'btn btn-secondary btn-sm', 'Clear');
  const closeBtn = _el('button', 'btn-icon popup-close', '✕');

  const btns = _el('div', 'day-note-btns');
  btns.appendChild(saveBtn);
  btns.appendChild(clearBtn);
  popup.appendChild(closeBtn);
  popup.appendChild(label);
  popup.appendChild(textarea);
  popup.appendChild(btns);

  // Position near anchor
  const rect   = anchorEl.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top      = (rect.bottom + 6) + 'px';
  popup.style.left     = Math.min(rect.left, window.innerWidth - 260) + 'px';
  document.body.appendChild(popup);
  textarea.focus();

  function close() { popup.remove(); }
  saveBtn.addEventListener('click', () => {
    AppState.setDayNote(monthIndex, day, textarea.value);
    renderDailyGrid(AppState.getState(), monthIndex);
    close();
  });
  clearBtn.addEventListener('click', () => {
    AppState.setDayNote(monthIndex, day, '');
    renderDailyGrid(AppState.getState(), monthIndex);
    close();
  });
  closeBtn.addEventListener('click', close);
  setTimeout(() => { document.addEventListener('click', function handler(e) {
    if (!popup.contains(e.target)) { close(); document.removeEventListener('click', handler); }
  }); }, 100);
}

// ============================================================
// Task 9 — renderWeeklySummary(state, monthIndex)
// ============================================================

function renderWeeklySummary(_state, monthIndex) {
  const panel = document.getElementById('tab-weekly');
  panel.innerHTML = '';

  const partition  = AppState.weeklyPartition(monthIndex);
  const weekKeys   = ['week1', 'week2', 'week3', 'week4', 'week5'];
  const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const month      = AppState.getState().months[monthIndex];
  const habitsCount= month.habits.length;

  // Overall month average bar at top
  const overallPct = AppState.monthlyDailyAvg(monthIndex);
  const heroWrap   = _el('div', 'weekly-hero');
  const heroLeft   = _el('div', 'weekly-hero-left');
  heroLeft.appendChild(_el('div', 'weekly-hero-label', 'Monthly Average'));
  heroLeft.appendChild(_el('div', 'weekly-hero-pct', overallPct + '%'));
  heroLeft.appendChild(_el('div', 'weekly-hero-sub', habitsCount + ' habits tracked'));
  const heroRight = _el('div', 'weekly-hero-right');
  heroRight.appendChild(_progressBar(overallPct));
  heroWrap.appendChild(heroLeft);
  heroWrap.appendChild(heroRight);
  panel.appendChild(heroWrap);

  // Week cards grid
  const grid = _el('div', 'weekly-cards-grid');

  weekKeys.forEach((key, i) => {
    const days = partition[key];
    if (!days || days.length === 0) return;

    const pct        = AppState.weeklyProgress(monthIndex, key);
    const possible   = habitsCount * days.length;
    const completions= habitsCount > 0 ? Math.round((pct / 100) * possible) : 0;
    const firstDay   = days[0], lastDay = days[days.length - 1];
    const daysRange  = firstDay === lastDay ? 'Day ' + firstDay : 'Days ' + firstDay + '–' + lastDay;

    const hasData    = habitsCount > 0 && completions > 0;
    const colorCls   = !hasData ? 'week-card-neutral'
                     : pct >= 75 ? 'week-card-high'
                     : pct >= 40 ? 'week-card-mid'
                     : 'week-card-low';

    const card = _el('div', 'week-card ' + colorCls);

    const cardHeader = _el('div', 'week-card-header');
    cardHeader.appendChild(_el('span', 'week-card-label', weekLabels[i]));
    cardHeader.appendChild(_el('span', 'week-card-range', daysRange));
    card.appendChild(cardHeader);

    card.appendChild(_el('div', 'week-card-pct', pct + '%'));

    const compLine = _el('div', 'week-card-comp');
    compLine.appendChild(_el('span', null, completions + ' / ' + possible));
    compLine.appendChild(_el('span', 'week-card-comp-label', ' completions'));
    card.appendChild(compLine);

    const barWrap = _el('div', 'week-card-bar');
    barWrap.appendChild(_progressBar(pct));
    card.appendChild(barWrap);

    grid.appendChild(card);
  });

  if (!grid.children.length) {
    grid.appendChild(_el('p', 'stats-empty', 'No habit data for this month yet.'));
  }

  panel.appendChild(grid);

  // ── Weekly Review Prompts ─────────────────────────────────
  const reviewSection = _el('div', 'weekly-review-section');
  reviewSection.appendChild(_el('h3', 'weekly-review-title', '📝 Weekly Reviews'));
  reviewSection.appendChild(_el('p', 'weekly-review-sub', 'Reflect on each week to improve next time.'));

  const weeklyReviews = month.weeklyReviews || {};
  ['week1','week2','week3','week4','week5'].forEach((key, wi) => {
    const days = partition[key];
    if (!days || days.length === 0) return;
    const weekNum  = wi + 1;
    const saved    = weeklyReviews[weekNum] || {};
    const hasSaved = !!(saved.well || saved.improve || saved.goal);
    const card     = _el('div', 'review-card');

    const toggle = _el('button', 'review-toggle' + (hasSaved ? ' review-has-data' : ''),
      (hasSaved ? '✅' : '✨') + ' Week ' + weekNum +
      ' (Days ' + days[0] + '\u2013' + days[days.length - 1] + ')');
    const body = _el('div', 'review-body hidden');

    // ── generated badge ──────────────────────────────────────
    const genBar = _el('div', 'review-gen-bar');
    genBar.appendChild(_el('span', 'review-gen-label', '✨ AI-generated from your data'));
    const regenBtn = _el('button', 'btn btn-secondary btn-sm review-regen-btn', '↻ Regenerate');
    genBar.appendChild(regenBtn);
    body.appendChild(genBar);

    // ── textareas ─────────────────────────────────────────────
    const fields = [
      { key: 'well',    label: '🌟 What went well?'     },
      { key: 'improve', label: '🔧 What to improve?'    },
      { key: 'goal',    label: '🎯 Goal for next week?' }
    ];
    const textareas = {};
    fields.forEach(f => {
      body.appendChild(_el('label', 'review-field-label', f.label));
      const ta = document.createElement('textarea');
      ta.className = 'review-textarea'; ta.rows = 2;
      textareas[f.key] = ta;
      body.appendChild(ta);
    });

    function _populate(data) {
      textareas.well.value    = data.well    || '';
      textareas.improve.value = data.improve || '';
      textareas.goal.value    = data.goal    || '';
    }

    // Pre-fill: saved review first, otherwise auto-generate
    if (hasSaved) {
      _populate(saved);
    } else {
      _populate(_generateWeekReview(monthIndex, days));
    }

    regenBtn.addEventListener('click', () => {
      _populate(_generateWeekReview(monthIndex, days));
      showToast('Review regenerated from your data.', 'success');
    });

    const saveBtn = _el('button', 'btn btn-primary btn-sm', 'Save Review');
    saveBtn.addEventListener('click', () => {
      AppState.setWeeklyReview(monthIndex, weekNum, {
        well:    textareas.well.value.trim(),
        improve: textareas.improve.value.trim(),
        goal:    textareas.goal.value.trim()
      });
      showToast('Week ' + weekNum + ' review saved.', 'success');
      toggle.textContent = '✅ Week ' + weekNum + ' (Days ' + days[0] + '\u2013' + days[days.length - 1] + ')';
      toggle.classList.add('review-has-data');
      body.classList.add('hidden');
    });
    body.appendChild(saveBtn);

    toggle.addEventListener('click', () => body.classList.toggle('hidden'));
    card.appendChild(toggle);
    card.appendChild(body);
    reviewSection.appendChild(card);
  });
  panel.appendChild(reviewSection);
}

// ============================================================
// Task 10 — renderMonthlyHabits(state, monthIndex)
// ============================================================

function renderMonthlyHabits(state, monthIndex) {
  const panel    = document.getElementById('tab-monthly');
  panel.innerHTML = '';

  const month    = state.months[monthIndex];
  const archived = month.archived || false;
  const summary  = AppState.monthlySummary(monthIndex);

  // Archive banner
  if (archived) {
    const banner = _el('div', 'archive-banner');
    const msg    = _el('span', null, '🔒 This month is archived — editing is locked.');
    const unBtn  = _el('button', 'btn btn-sm btn-secondary', 'Unarchive');
    unBtn.addEventListener('click', () => {
      AppState.unarchiveMonth(monthIndex);
      renderMonthlyHabits(AppState.getState(), monthIndex);
    });
    banner.appendChild(msg); banner.appendChild(unBtn);
    panel.appendChild(banner);
  }

  // Summary stats block
  const statsBlock = _el('div', 'monthly-summary-block');
  [
    { value: summary.total,             label: 'Total' },
    { value: summary.completed,         label: 'Completed' },
    { value: summary.incomplete,        label: 'Incomplete' },
    { value: summary.percentage + '%',  label: 'Complete' }
  ].forEach(s => {
    const stat = _el('div', 'summary-stat');
    stat.appendChild(_el('span', 'summary-stat-value', String(s.value)));
    stat.appendChild(_el('span', 'summary-stat-label', s.label));
    statsBlock.appendChild(stat);
  });
  panel.appendChild(statsBlock);

  // Monthly habits list
  const list = _el('div', 'monthly-habits-list');
  month.monthlyHabits.forEach(habit => {
    const item = _el('div', 'monthly-habit-item' + (habit.completed ? ' habit-completed' : '') + (archived ? ' habit-archived' : ''));
    item.setAttribute('data-habit-id', habit.id);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = habit.completed;
    cb.disabled = archived;
    if (!archived) {
      cb.addEventListener('change', () => {
        AppState.toggleMonthlyHabit(monthIndex, habit.id);
        renderMonthlyHabits(AppState.getState(), monthIndex);
      });
    }

    const nameSpan = _el('span', 'monthly-habit-name', habit.name);

    const notesInput = document.createElement('input');
    notesInput.type = 'text';
    notesInput.className = 'monthly-habit-notes';
    notesInput.placeholder = archived ? '' : 'Notes…';
    notesInput.value = habit.notes || '';
    notesInput.disabled = archived;
    if (!archived) {
      notesInput.addEventListener('change', () => {
        AppState.setMonthlyHabitNotes(monthIndex, habit.id, notesInput.value);
      });
    }

    item.appendChild(cb);
    item.appendChild(nameSpan);
    item.appendChild(notesInput);

    if (!archived) {
      const removeBtn = _el('button', 'btn btn-icon', '×');
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', () => {
        AppState.removeMonthlyHabit(monthIndex, habit.id);
        renderMonthlyHabits(AppState.getState(), monthIndex);
      });
      item.appendChild(removeBtn);
    }

    list.appendChild(item);
  });
  panel.appendChild(list);

  // Add monthly habit row — hidden when archived
  if (!archived) {
    const addRow  = _el('div', 'add-habit-row');
    const addInput = _el('input');
    addInput.type = 'text';
    addInput.className = 'form-control';
    addInput.placeholder = 'New monthly habit…';
    const addBtn = _el('button', 'btn btn-primary', 'Add');
    const addErr = _el('div', 'inline-error');

    const doAdd = () => {
      const result = AppState.addMonthlyHabit(monthIndex, addInput.value);
      if (!result.ok) {
        addErr.textContent = result.error;
      } else {
        addErr.textContent = '';
        addInput.value = '';
        renderMonthlyHabits(AppState.getState(), monthIndex);
      }
    };
    addBtn.addEventListener('click', doAdd);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    panel.appendChild(addRow);
    panel.appendChild(addErr);
  }

  // Monthly notes
  const notesLabel = _el('label', null, 'Monthly Notes');
  notesLabel.style.cssText = 'display:block;font-weight:600;font-size:.85rem;margin:1rem 0 .25rem';
  const notesArea = document.createElement('textarea');
  notesArea.className = 'monthly-notes-area';
  notesArea.value = month.monthlyNotes || '';
  notesArea.placeholder = archived ? '' : 'Notes for this month…';
  notesArea.readOnly = archived;
  if (!archived) {
    notesArea.addEventListener('change', () => {
      AppState.setMonthlyNotes(monthIndex, notesArea.value);
    });
  }

  panel.appendChild(notesLabel);
  panel.appendChild(notesArea);
}

// ============================================================
// Task 11 — renderStatistics(state, monthIndex)
// ============================================================

function renderStatistics(state, monthIndex) {
  const panel = document.getElementById('tab-stats');
  panel.innerHTML = '';

  const month       = state.months[monthIndex];
  const daysInMonth = AppState.DAYS_IN_MONTH[monthIndex];
  const tags        = month.habitTags || {};

  // ── Sub-tab definitions ───────────────────────────────────
  const subTabs = [
    { id: 'st-overview',  label: '📊 Overview'  },
    { id: 'st-streaks',   label: '🔥 Streaks'   },
    { id: 'st-habits',    label: '📋 Habits'    },
    { id: 'st-patterns',  label: '📅 Patterns'  },
    { id: 'st-compare',   label: '⚖️ Compare'   },
    { id: 'st-insights',  label: '🔗 Insights'  },
    { id: 'st-schedule',  label: '⏱ Schedule'  }
  ];

  // Nav bar
  const nav = _el('div', 'stats-subnav');
  subTabs.forEach((t, i) => {
    const btn = _el('button', 'stats-subnav-btn' + (i === 0 ? ' active' : ''), t.label);
    btn.setAttribute('data-stab', t.id);
    nav.appendChild(btn);
  });
  panel.appendChild(nav);

  // Panels container
  const panels = _el('div', 'stats-subpanels');

  // ── Panel: Overview ───────────────────────────────────────
  const pOverview = _el('div', 'stats-subpanel');
  pOverview.id = 'st-overview';

  const rolling = _compute30DayAvg(state, monthIndex);
  const secRoll = _el('div', 'stats-section');
  secRoll.appendChild(_el('h3', null, '📈 Rolling Average'));
  const rollCards = _el('div', 'rolling-avg-row');
  [
    { label: 'Last 7 days',  value: rolling.last7 + '%'  },
    { label: 'Last 14 days', value: rolling.last14 + '%' },
    { label: 'Last 30 days', value: rolling.last30 + '%' },
    { label: 'This month',   value: rolling.thisMonth + '%' }
  ].forEach(item => {
    const card = _el('div', 'rolling-card');
    card.appendChild(_el('div', 'rolling-value', item.value));
    card.appendChild(_el('div', 'rolling-label', item.label));
    rollCards.appendChild(card);
  });
  secRoll.appendChild(rollCards);
  pOverview.appendChild(secRoll);

  let bestM = { name: '—', pct: 0 }, worstM = { name: '—', pct: 101 }, qualifiedMonths = 0;
  AppState.MONTH_NAMES.forEach((name, idx) => {
    const m = state.months[idx];
    if (!m.habits.length) return;
    const hasCompleted = m.habits.some(h =>
      Object.values(m.entries[h] || {}).some(v => v === true || (v && typeof v === 'object' && v.done === true))
    );
    if (!hasCompleted) return;
    const avg = AppState.monthlyDailyAvg(idx);
    qualifiedMonths++;
    if (avg >= bestM.pct)  bestM  = { name, pct: avg };
    if (avg <= worstM.pct) worstM = { name, pct: avg };
  });
  const hasData = qualifiedMonths >= 2;
  const secComp = _el('div', 'stats-section');
  secComp.appendChild(_el('h3', null, '🏆 Best vs Worst Month'));
  if (hasData) {
    const compRow = _el('div', 'bw-month-row');
    [{ label: '🥇 Best', data: bestM, cls: 'bw-best' }, { label: '📉 Worst', data: worstM, cls: 'bw-worst' }].forEach(item => {
      const card = _el('div', 'bw-card ' + item.cls);
      card.appendChild(_el('div', 'bw-card-label', item.label));
      card.appendChild(_el('div', 'bw-card-name', item.data.name));
      card.appendChild(_el('div', 'bw-card-pct', item.data.pct + '%'));
      card.appendChild(_progressBar(item.data.pct));
      compRow.appendChild(card);
    });
    secComp.appendChild(compRow);
  } else {
    secComp.appendChild(_el('p', 'stats-empty', 'No month data yet — start ticking habits!'));
  }
  pOverview.appendChild(secComp);

  // ── Consistency Score card ────────────────────────────────
  const hStats = AppState.perHabitStats(monthIndex);
  const avgPct  = AppState.monthlyDailyAvg(monthIndex);
  const avgComp = hStats.length > 0 ? Math.round(hStats.reduce((a,s) => a + s.percentage, 0) / hStats.length) : 0;
  const consistPct = hStats.length > 0 ? Math.round(hStats.filter(s => s.percentage >= 50).length / hStats.length * 100) : 0;
  const score = Math.min(100, Math.round(avgPct * 0.5 + avgComp * 0.3 + consistPct * 0.2));
  const scoreGrade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const scoreColor = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const secScore = _el('div', 'stats-section');
  secScore.appendChild(_el('h3', null, '🏅 Consistency Score'));
  const scoreCard = _el('div', 'score-card');
  const scoreNum = _el('div', 'score-num', String(score));
  scoreNum.style.color = scoreColor;
  const scoreGrd = _el('div', 'score-grade', scoreGrade);
  scoreGrd.style.background = scoreColor;
  scoreCard.appendChild(scoreNum);
  scoreCard.appendChild(scoreGrd);
  const scoreBreakdown = _el('div', 'score-breakdown');
  [['Completion Rate', avgPct + '%', .5], ['Habit Avg', avgComp + '%', .3], ['Consistency', consistPct + '%', .2]].forEach(([lbl, val, w]) => {
    const row = _el('div', 'score-row');
    row.appendChild(_el('span', 'score-row-lbl', lbl));
    row.appendChild(_el('span', 'score-row-val', val));
    row.appendChild(_el('span', 'score-row-wt', '×' + (w * 100).toFixed(0) + '%'));
    scoreBreakdown.appendChild(row);
  });
  scoreCard.appendChild(scoreBreakdown);
  secScore.appendChild(scoreCard);
  pOverview.appendChild(secScore);
  panels.appendChild(pOverview);

  // ── Panel: Streaks ────────────────────────────────────────
  const pStreaks = _el('div', 'stats-subpanel hidden');
  pStreaks.id = 'st-streaks';
  const secStreak = _el('div', 'stats-section');
  secStreak.appendChild(_el('h3', null, '🔥 Habit Streaks'));
  if (month.habits.length > 0) {
    const st = _el('table', 'stats-table');
    const sh = document.createElement('thead');
    const shr = document.createElement('tr');
    ['Habit', 'This Month 🔥', 'Global 🌍', 'Best', 'Total Done'].forEach(h => shr.appendChild(_el('th', null, h)));
    sh.appendChild(shr); st.appendChild(sh);
    const sb = document.createElement('tbody');
    month.habits.forEach(habit => {
      const cur    = AppState.habitStreak(monthIndex, habit);
      const global = AppState.globalHabitStreak(habit);
      const best   = AppState.bestStreak(monthIndex, habit);
      const done   = Object.values(month.entries[habit] || {}).filter(v => v === true || (v && typeof v === 'object' && v.done === true)).length;
      const tr     = document.createElement('tr');
      tr.appendChild(_el('td', null, habit));
      const tdCur = document.createElement('td');
      tdCur.appendChild(_el('span', cur > 0 ? 'streak-badge' : '', cur > 0 ? '🔥' + cur + 'd' : '—'));
      tr.appendChild(tdCur);
      const tdGlobal = document.createElement('td');
      tdGlobal.appendChild(_el('span', global > cur ? 'streak-badge streak-global' : (global > 0 ? 'streak-badge' : ''), global > 0 ? '🌍' + global + 'd' : '—'));
      tr.appendChild(tdGlobal);
      tr.appendChild(_el('td', null, best > 0 ? '⭐ ' + best + 'd' : '—'));
      tr.appendChild(_el('td', null, String(done)));
      sb.appendChild(tr);
    });
    st.appendChild(sb); secStreak.appendChild(st);
  } else {
    secStreak.appendChild(_el('p', 'stats-empty', 'No habits yet.'));
  }
  pStreaks.appendChild(secStreak);
  panels.appendChild(pStreaks);

  // ── Panel: Habits ─────────────────────────────────────────
  const pHabits = _el('div', 'stats-subpanel hidden');
  pHabits.id = 'st-habits';

  const section1 = _el('div', 'stats-section');
  section1.appendChild(_el('h3', null, 'Per-Habit Completion'));
  const table = _el('table', 'stats-table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Habit', 'Tag', 'Days Done', '%', 'Progress'].forEach(h => headRow.appendChild(_el('th', null, h)));
  thead.appendChild(headRow); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  AppState.perHabitStats(monthIndex).forEach(s => {
    const tr = document.createElement('tr');
    tr.appendChild(_el('td', null, s.name));
    const tagTd = document.createElement('td');
    if (tags[s.name]) tagTd.appendChild(_el('span', 'habit-tag-badge', tags[s.name]));
    tr.appendChild(tagTd);
    tr.appendChild(_el('td', null, String(s.daysCompleted)));
    tr.appendChild(_el('td', null, s.percentage + '%'));
    const barTd = document.createElement('td');
    barTd.style.minWidth = '100px';
    barTd.appendChild(_progressBar(s.percentage));
    tr.appendChild(barTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); section1.appendChild(table);
  pHabits.appendChild(section1);

  const section2 = _el('div', 'stats-section');
  section2.appendChild(_el('h3', null, 'Consistency Rank'));
  const rankTable = _el('table', 'stats-table');
  const rThead = document.createElement('thead');
  const rHR = document.createElement('tr');
  ['Rank', 'Habit', 'Days Done', '%'].forEach(h => rHR.appendChild(_el('th', null, h)));
  rThead.appendChild(rHR); rankTable.appendChild(rThead);
  const rTbody = document.createElement('tbody');
  AppState.consistencyRank(monthIndex).forEach((s, i) => {
    const tr = document.createElement('tr');
    const tdR = document.createElement('td');
    tdR.appendChild(_el('span', 'rank-badge', String(i + 1)));
    tr.appendChild(tdR);
    tr.appendChild(_el('td', null, s.name));
    tr.appendChild(_el('td', null, String(s.daysCompleted)));
    tr.appendChild(_el('td', null, s.percentage + '%'));
    rTbody.appendChild(tr);
  });
  rankTable.appendChild(rTbody); section2.appendChild(rankTable);
  pHabits.appendChild(section2);
  panels.appendChild(pHabits);

  // ── Panel: Insights ───────────────────────────────────────
  const pInsights = _el('div', 'stats-subpanel hidden');
  pInsights.id = 'st-insights';
  const secCorr = _el('div', 'stats-section');
  secCorr.appendChild(_el('h3', null, '🔗 Habit Correlation'));
  secCorr.appendChild(_el('p', 'stats-section-desc', 'How often do you do these habits on the same day?'));
  if (month.habits.length >= 2) {
    const corrData = _computeCorrelation(month, daysInMonth);
    if (corrData.length > 0) {
      const ct = _el('table', 'stats-table');
      const ch = document.createElement('thead');
      const chr = document.createElement('tr');
      ['Habit A', 'Habit B', 'Days Together', 'Rate'].forEach(h => chr.appendChild(_el('th', null, h)));
      ch.appendChild(chr); ct.appendChild(ch);
      const cb = document.createElement('tbody');
      corrData.slice(0, 10).forEach(row => {
        const tr = document.createElement('tr');
        tr.appendChild(_el('td', null, row.a));
        tr.appendChild(_el('td', null, row.b));
        tr.appendChild(_el('td', null, String(row.together)));
        const pctTd = document.createElement('td');
        pctTd.appendChild(_progressBar(row.rate));
        pctTd.querySelector('.progress-bar-fill') && null;
        const pctSpan = _el('span', null, ' ' + row.rate + '%');
        pctSpan.style.fontSize = '.75rem';
        pctTd.appendChild(pctSpan);
        tr.appendChild(pctTd);
        cb.appendChild(tr);
      });
      ct.appendChild(cb); secCorr.appendChild(ct);
    } else {
      secCorr.appendChild(_el('p', 'stats-empty', 'Tick more habits to see correlation data.'));
    }
  } else {
    secCorr.appendChild(_el('p', 'stats-empty', 'Add at least 2 habits to see correlation.'));
  }
  pInsights.appendChild(secCorr);
  panels.appendChild(pInsights);

  // ── Panel: Patterns (day-of-week) ─────────────────────────
  const pPatterns = _el('div', 'stats-subpanel hidden');
  pPatterns.id = 'st-patterns';
  const secDow = _el('div', 'stats-section');
  secDow.appendChild(_el('h3', null, '📅 Day-of-Week Performance'));
  secDow.appendChild(_el('p', 'stats-section-desc', 'Your average habit completion rate by day of the week this month.'));
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(AppState.getYear(), monthIndex, 1).getDay();
  const dowTotals = [0,0,0,0,0,0,0], dowCounts = [0,0,0,0,0,0,0];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (firstDay + d - 1) % 7;
    dowTotals[dow] += AppState.dailyProgress(monthIndex, d);
    dowCounts[dow]++;
  }
  const dowAvgs = DOW.map((_, i) => dowCounts[i] > 0 ? Math.round(dowTotals[i] / dowCounts[i]) : null);
  const bestDow = dowAvgs.reduce((best, v, i) => (v !== null && (best === -1 || v > dowAvgs[best]) ? i : best), -1);
  const worstDow = dowAvgs.reduce((worst, v, i) => (v !== null && (worst === -1 || v < dowAvgs[worst]) ? i : worst), -1);
  const dowGrid = _el('div', 'dow-grid');
  DOW.forEach((day, i) => {
    const avg = dowAvgs[i];
    const col = _el('div', 'dow-col' + (i === bestDow ? ' dow-best' : i === worstDow ? ' dow-worst' : ''));
    const barTrack = _el('div', 'dow-bar-track');
    const fill = _el('div', 'dow-bar-fill');
    fill.style.height = (avg !== null ? avg : 0) + '%';
    barTrack.appendChild(fill);
    col.appendChild(barTrack);
    col.appendChild(_el('div', 'dow-pct', avg !== null ? avg + '%' : '—'));
    col.appendChild(_el('div', 'dow-label', day));
    dowGrid.appendChild(col);
  });
  secDow.appendChild(dowGrid);
  if (bestDow >= 0) {
    const insight = _el('div', 'dow-insight');
    insight.innerHTML = '<strong>Best day:</strong> ' + DOW[bestDow] + ' (' + dowAvgs[bestDow] + '%) &nbsp;|&nbsp; <strong>Weakest day:</strong> ' + DOW[worstDow] + ' (' + dowAvgs[worstDow] + '%)';
    secDow.appendChild(insight);
  }
  pPatterns.appendChild(secDow);
  panels.appendChild(pPatterns);

  // ── Panel: Compare (month vs last month) ──────────────────
  const pCompare = _el('div', 'stats-subpanel hidden');
  pCompare.id = 'st-compare';
  const prevIdx = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevMonthName = AppState.MONTH_NAMES[prevIdx];
  const curMonthName  = AppState.MONTH_NAMES[monthIndex];
  const prevHStats    = AppState.perHabitStats(prevIdx);
  const prevMap       = {};
  prevHStats.forEach(s => { prevMap[s.name] = s; });
  const secCmp = _el('div', 'stats-section');
  secCmp.appendChild(_el('h3', null, '⚖️ ' + curMonthName + ' vs ' + prevMonthName));
  if (hStats.length === 0) {
    secCmp.appendChild(_el('p', 'stats-empty', 'No habits tracked this month yet.'));
  } else {
    const cmpTable = _el('table', 'stats-table cmp-table');
    const cmpH = document.createElement('thead'); const cmpHR = document.createElement('tr');
    ['Habit', prevMonthName, curMonthName, 'Change'].forEach(h => cmpHR.appendChild(_el('th', null, h)));
    cmpH.appendChild(cmpHR); cmpTable.appendChild(cmpH);
    const cmpB = document.createElement('tbody');
    hStats.forEach(s => {
      const prev = prevMap[s.name] ? prevMap[s.name].percentage : null;
      const diff = prev !== null ? s.percentage - prev : null;
      const tr = document.createElement('tr');
      tr.appendChild(_el('td', null, s.name));
      tr.appendChild(_el('td', 'cmp-prev', prev !== null ? prev + '%' : '—'));
      tr.appendChild(_el('td', 'cmp-cur', s.percentage + '%'));
      const tdDiff = document.createElement('td');
      if (diff === null) { tdDiff.textContent = 'New'; tdDiff.className = 'cmp-new'; }
      else if (diff > 0) { tdDiff.textContent = '+' + diff + '%'; tdDiff.className = 'cmp-up'; }
      else if (diff < 0) { tdDiff.textContent = diff + '%'; tdDiff.className = 'cmp-down'; }
      else { tdDiff.textContent = '±0%'; tdDiff.className = 'cmp-same'; }
      tr.appendChild(tdDiff); cmpB.appendChild(tr);
    });
    cmpTable.appendChild(cmpB); secCmp.appendChild(cmpTable);
    const curAvgCmp = AppState.monthlyDailyAvg(monthIndex);
    const prevAvgCmp = AppState.monthlyDailyAvg(prevIdx);
    const overallDiff = curAvgCmp - prevAvgCmp;
    const summary = _el('div', 'cmp-summary');
    summary.innerHTML = 'Overall: <strong>' + curMonthName + ' ' + curAvgCmp + '%</strong> vs ' + prevMonthName + ' ' + prevAvgCmp + '% &nbsp; <span class="' + (overallDiff >= 0 ? 'cmp-up' : 'cmp-down') + '">' + (overallDiff >= 0 ? '+' : '') + overallDiff + '%</span>';
    secCmp.appendChild(summary);
  }
  pCompare.appendChild(secCmp);
  panels.appendChild(pCompare);

  panel.appendChild(panels);

  // ── Panel: Schedule Accuracy ──────────────────────────────
  const pSchedule = _el('div', 'stats-subpanel hidden');
  pSchedule.id = 'st-schedule';
  renderStatsAccuracy(monthIndex, pSchedule);
  panels.appendChild(pSchedule);

  // ── Sub-tab switching ─────────────────────────────────────
  nav.addEventListener('click', e => {
    const btn = e.target.closest('.stats-subnav-btn');
    if (!btn) return;
    const target = btn.getAttribute('data-stab');
    nav.querySelectorAll('.stats-subnav-btn').forEach(b => b.classList.toggle('active', b === btn));
    panels.querySelectorAll('.stats-subpanel').forEach(p => p.classList.toggle('hidden', p.id !== target));
  });
}

function _compute30DayAvg(state, monthIndex) {
  const today     = new Date().getDate();
  const results   = { last7: 0, last14: 0, last30: 0, thisMonth: 0 };
  const daysInM   = AppState.DAYS_IN_MONTH[monthIndex];
  const month     = state.months[monthIndex];
  if (!month.habits.length) return results;

  function avgForDays(days) {
    let total = 0, checks = 0;
    days.forEach(({ mIdx, d }) => {
      const m = state.months[mIdx];
      m.habits.forEach(() => total++);
      m.habits.forEach(h => {
        const e = m.entries[h] && m.entries[h][d];
        if (e && (typeof e === 'boolean' ? e : e.done === true)) checks++;
      });
    });
    return total > 0 ? Math.round((checks / total) * 100) : 0;
  }

  // This month avg
  const thisDays = [];
  for (let d = 1; d <= Math.min(today, daysInM); d++) thisDays.push({ mIdx: monthIndex, d });
  results.thisMonth = avgForDays(thisDays);

  // Rolling windows — walk back from today
  const allDays = [];
  let d = today, mIdx = monthIndex;
  while (allDays.length < 30 && mIdx >= 0) {
    if (d < 1) { mIdx--; if (mIdx < 0) break; d = AppState.DAYS_IN_MONTH[mIdx]; continue; }
    allDays.push({ mIdx, d }); d--;
  }
  results.last7  = avgForDays(allDays.slice(0, 7));
  results.last14 = avgForDays(allDays.slice(0, 14));
  results.last30 = avgForDays(allDays.slice(0, 30));
  return results;
}

function _computeCorrelation(month, daysInMonth) {
  const habits  = month.habits;
  const pairs   = [];
  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const a = habits[i], b = habits[j];
      let together = 0, total = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const eA = month.entries[a] && month.entries[a][d];
        const eB = month.entries[b] && month.entries[b][d];
        const doneA = eA && (typeof eA === 'boolean' ? eA : eA.done === true);
        const doneB = eB && (typeof eB === 'boolean' ? eB : eB.done === true);
        if (doneA || doneB) { total++; if (doneA && doneB) together++; }
      }
      if (total > 0) pairs.push({ a, b, together, rate: Math.round((together / total) * 100) });
    }
  }
  return pairs.sort((x, y) => y.rate - x.rate || y.together - x.together);
}

// ============================================================
// Task 12 — Habit Edit Mode (wired into renderMonthView)
// ============================================================

/**
 * Render the full month view (header + tabs) for a given monthIndex.
 * Called by renderView when route.type === 'month'.
 */
function renderMonthView(state, monthIndex) {
  _showView('view-month');

  document.getElementById('month-title').textContent =
    AppState.MONTH_NAMES[monthIndex];

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      newBtn.classList.add('active');
      const target = document.getElementById('tab-' + newBtn.dataset.tab);
      if (target) target.classList.remove('hidden');
    });
  });

  // Render all tab contents
  renderDailyGrid(state, monthIndex);
  renderWeeklySummary(state, monthIndex);
  renderMonthlyHabits(state, monthIndex);
  renderStatistics(state, monthIndex);
}

// ============================================================
// Task 13 — renderGoals(state)
// ============================================================

function renderGoals(state) {
  const container = document.getElementById('view-goals');
  container.innerHTML = '';

  // Header
  const header = _el('div', 'goals-header');
  header.appendChild(_el('h1', null, 'Goal Tracker'));
  container.appendChild(header);

  // Goals grouped by life area
  AppState.LIFE_AREAS.forEach(area => {
    const areaGoals = state.goals.filter(g => g.area === area);

    const section = _el('div', 'goals-area-section');
    section.appendChild(_el('div', 'goals-area-title', area));

    const grid = _el('div', 'goals-grid');

    if (areaGoals.length === 0) {
      grid.appendChild(_el('p', null, 'No goals yet.'));
    } else {
      areaGoals.forEach(goal => {
        grid.appendChild(_buildGoalCard(goal));
      });
    }

    section.appendChild(grid);
    container.appendChild(section);
  });

  // Add goal form
  container.appendChild(_buildAddGoalForm());
}

function _buildGoalCard(goal) {
  const overdue  = AppState.isOverdue(goal);
  const today    = new Date().toISOString().slice(0, 10);
  const msLeft   = goal.deadline ? (new Date(goal.deadline) - new Date(today)) : null;
  const daysLeft = msLeft !== null ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null;
  const dueSoon  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && goal.status !== 'Achieved';

  const card = _el('div', 'goal-card' + (overdue ? ' overdue' : '') + (dueSoon && !overdue ? ' due-soon' : ''));
  card.setAttribute('data-goal-id', goal.id);

  // Title + badge row
  const titleRow = _el('div', 'goal-title-row');
  titleRow.appendChild(_el('div', 'goal-card-title', goal.description));

  let badgeClass = 'badge badge-not-started';
  let badgeText  = goal.status;
  if (goal.status === 'Achieved')   { badgeClass = 'badge badge-achieved'; }
  else if (overdue)                 { badgeClass = 'badge badge-overdue'; badgeText = 'Overdue'; }
  else if (dueSoon)                 { badgeClass = 'badge badge-due-soon'; badgeText = daysLeft === 0 ? 'Due today!' : daysLeft + 'd left'; }
  titleRow.appendChild(_el('span', badgeClass, badgeText));
  card.appendChild(titleRow);

  card.appendChild(_el('div', 'goal-card-reward', '🎁 ' + goal.reward));

  const deadlineRow = _el('div', 'goal-deadline-row');
  deadlineRow.appendChild(_el('span', 'goal-card-deadline', '📅 ' + goal.deadline));
  if (dueSoon && daysLeft > 0)   deadlineRow.appendChild(_el('span', 'deadline-warn', '⚠️ ' + daysLeft + ' days left'));
  if (daysLeft === 0)            deadlineRow.appendChild(_el('span', 'deadline-warn', '⚠️ Due today'));
  card.appendChild(deadlineRow);

  // Progress bar
  const pct = AppState.goalProgress(goal);
  card.appendChild(_el('div', 'goal-progress-label', 'Progress: ' + pct + '%'));
  card.appendChild(_progressBar(pct));

  // Steps
  if (goal.steps.length > 0) {
    const stepsList = _el('div', 'goal-steps');
    goal.steps.forEach(step => {
      const stepEl = _el('div', 'goal-step' + (step.completed ? ' completed' : ''));
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = step.completed;
      cb.addEventListener('change', () => { AppState.toggleStep(goal.id, step.id); renderGoals(AppState.getState()); });
      stepEl.appendChild(cb);
      stepEl.appendChild(_el('span', null, step.description));
      stepsList.appendChild(stepEl);
    });
    card.appendChild(stepsList);
  }

  // Linked habits
  const linked = (goal.linkedHabits || []);
  if (linked.length > 0) {
    const lDiv = _el('div', 'linked-habits');
    lDiv.appendChild(_el('div', 'linked-habits-label', '🔗 Linked habits:'));
    const chips = _el('div', 'linked-chips');
    linked.forEach(key => {
      const [mIdx, ...nameParts] = key.split(':');
      const mName = AppState.MONTH_NAMES[parseInt(mIdx, 10)] || '?';
      const chip  = _el('span', 'linked-chip', nameParts.join(':') + ' (' + mName + ')');
      const x     = _el('button', 'chip-remove', '×');
      x.title     = 'Unlink';
      x.addEventListener('click', () => {
        AppState.unlinkHabitFromGoal(goal.id, parseInt(mIdx, 10), nameParts.join(':'));
        renderGoals(AppState.getState());
      });
      chip.appendChild(x);
      chips.appendChild(chip);
    });
    lDiv.appendChild(chips);
    card.appendChild(lDiv);
  }

  // Footer actions
  const footer = _el('div', 'goal-card-footer');
  const removeBtn = _el('button', 'btn btn-danger btn-sm', 'Remove');
  removeBtn.addEventListener('click', () => { AppState.removeGoal(goal.id); renderGoals(AppState.getState()); });

  // Link habit to this goal dropdown
  const linkSel = document.createElement('select');
  linkSel.className = 'form-control link-habit-sel';
  linkSel.title = 'Link a habit to this goal';
  const defOpt = _el('option', null, '🔗 Link a habit…'); defOpt.value = ''; linkSel.appendChild(defOpt);
  const state = AppState.getState();
  state.months.forEach((m, mIdx) => {
    m.habits.forEach(h => {
      const key = mIdx + ':' + h;
      if (!linked.includes(key)) {
        const opt = _el('option', null, AppState.MONTH_NAMES[mIdx] + ' › ' + h);
        opt.value = key; linkSel.appendChild(opt);
      }
    });
  });
  linkSel.addEventListener('change', () => {
    if (!linkSel.value) return;
    const [mIdx, ...nameParts] = linkSel.value.split(':');
    AppState.linkHabitToGoal(goal.id, parseInt(mIdx, 10), nameParts.join(':'));
    renderGoals(AppState.getState());
  });

  footer.appendChild(linkSel);
  footer.appendChild(removeBtn);
  card.appendChild(footer);

  return card;
}

function _buildAddGoalForm() {
  const form = _el('div', 'add-goal-form');
  form.appendChild(_el('h3', null, 'Add New Goal'));

  // Area select
  const areaGroup = _el('div', 'form-group');
  const areaLabel = _el('label', null, 'Life Area *');
  const areaSelect = document.createElement('select');
  areaSelect.className = 'form-control';
  areaSelect.id = 'goal-area';
  const defaultOpt = _el('option', null, '— Select area —');
  defaultOpt.value = '';
  areaSelect.appendChild(defaultOpt);
  AppState.LIFE_AREAS.forEach(a => {
    const opt = _el('option', null, a);
    opt.value = a;
    areaSelect.appendChild(opt);
  });
  areaGroup.appendChild(areaLabel);
  areaGroup.appendChild(areaSelect);
  form.appendChild(areaGroup);

  // Description
  form.appendChild(_formTextGroup('goal-description', 'Description *', 'text', 'What do you want to achieve?'));
  // Reward
  form.appendChild(_formTextGroup('goal-reward', 'Reward *', 'text', 'What will you reward yourself with?'));
  // Deadline
  form.appendChild(_formTextGroup('goal-deadline', 'Deadline *', 'date', ''));

  // Steps
  const stepsGroup = _el('div', 'form-group');
  stepsGroup.appendChild(_el('label', null, 'Steps (at least 1, max 8) *'));
  const stepsList = _el('div', 'steps-list');
  stepsList.id = 'goal-steps-list';

  // Start with one step input
  stepsList.appendChild(_buildStepInputRow(0));
  stepsGroup.appendChild(stepsList);

  const addStepBtn = _el('button', 'btn btn-secondary', '+ Add Step');
  addStepBtn.type = 'button';
  addStepBtn.id = 'btn-add-step';
  addStepBtn.addEventListener('click', () => {
    const rows = stepsList.querySelectorAll('.step-input-row');
    if (rows.length >= 8) return;
    stepsList.appendChild(_buildStepInputRow(rows.length));
    if (stepsList.querySelectorAll('.step-input-row').length >= 8) {
      addStepBtn.disabled = true;
    }
    _updateGoalSubmitBtn();
  });
  stepsGroup.appendChild(addStepBtn);
  form.appendChild(stepsGroup);

  // Error message
  const formErr = _el('div', 'inline-error');
  formErr.id = 'goal-form-error';
  form.appendChild(formErr);

  // Submit
  const submitBtn = _el('button', 'btn btn-primary', 'Add Goal');
  submitBtn.id = 'btn-submit-goal';
  submitBtn.disabled = true;
  submitBtn.addEventListener('click', () => {
    const area = document.getElementById('goal-area').value;
    const description = document.getElementById('goal-description').value.trim();
    const reward = document.getElementById('goal-reward').value.trim();
    const deadline = document.getElementById('goal-deadline').value;
    const stepInputs = document.querySelectorAll('#goal-steps-list .step-input-row input');
    const steps = Array.from(stepInputs).map(i => i.value.trim()).filter(Boolean);

    const result = AppState.addGoal({ area, description, reward, deadline, steps });
    if (!result.ok) {
      document.getElementById('goal-form-error').textContent = result.error;
    } else {
      document.getElementById('goal-form-error').textContent = '';
      renderGoals(AppState.getState());
    }
  });
  form.appendChild(submitBtn);

  // Wire live validation
  ['goal-area', 'goal-description', 'goal-reward', 'goal-deadline'].forEach(id => {
    const el = form.querySelector('#' + id) || document.getElementById(id);
    if (el) el.addEventListener('input', _updateGoalSubmitBtn);
    if (el) el.addEventListener('change', _updateGoalSubmitBtn);
  });

  return form;
}

function _formTextGroup(id, labelText, type, placeholder) {
  const group = _el('div', 'form-group');
  const label = _el('label', null, labelText);
  label.htmlFor = id;
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.className = 'form-control';
  input.placeholder = placeholder;
  input.addEventListener('input', _updateGoalSubmitBtn);
  group.appendChild(label);
  group.appendChild(input);
  return group;
}

function _buildStepInputRow(index) {
  const row = _el('div', 'step-input-row');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control';
  input.placeholder = 'Step ' + (index + 1) + '…';
  input.addEventListener('input', _updateGoalSubmitBtn);
  row.appendChild(input);
  return row;
}

function _updateGoalSubmitBtn() {
  const submitBtn = document.getElementById('btn-submit-goal');
  if (!submitBtn) return;
  const area = (document.getElementById('goal-area') || {}).value || '';
  const description = ((document.getElementById('goal-description') || {}).value || '').trim();
  const reward = ((document.getElementById('goal-reward') || {}).value || '').trim();
  const deadline = (document.getElementById('goal-deadline') || {}).value || '';
  const stepInputs = document.querySelectorAll('#goal-steps-list .step-input-row input');
  const hasStep = Array.from(stepInputs).some(i => i.value.trim() !== '');
  submitBtn.disabled = !(area && description && reward && deadline && hasStep);
}

// ============================================================
// renderView(route) — main dispatch entry point
// ============================================================

function renderView(route) {
  const state = AppState.getState();

  if (route.type === 'dashboard') {
    _showView('view-dashboard');
    renderDashboard(state);
  } else if (route.type === 'year') {
    _showView('view-year');
    renderYearOverview(state);
  } else if (route.type === 'month') {
    renderMonthView(state, route.monthIndex);
  } else if (route.type === 'goals') {
    _showView('view-goals');
    renderGoals(state);
  } else if (route.type === 'schedule') {
    _showView('view-schedule');
    renderScheduleView(state);
  } else {
    _showView('view-dashboard');
    renderDashboard(state);
  }

  // Refresh year display in sidebar
  const yearEl = document.getElementById('year-display');
  if (yearEl) yearEl.textContent = AppState.getYear();

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkRoute = link.getAttribute('data-route');
    let isActive = false;
    if (route.type === 'dashboard' && linkRoute === 'dashboard') isActive = true;
    if (route.type === 'year'      && linkRoute === 'year')      isActive = true;
    if (route.type === 'goals'     && linkRoute === 'goals')     isActive = true;
    if (route.type === 'schedule'  && linkRoute === 'schedule')  isActive = true;
    if (route.type === 'month' && linkRoute === 'month/' + route.monthIndex) isActive = true;
    link.classList.toggle('active', isActive);
  });
}

// ============================================================
// Task 4 — renderScheduleView(state)
// ============================================================

/**
 * Render the Schedule View — today's predicted habit schedule,
 * settings controls, and optimization suggestions.
 * @param {object} state  Full AppState
 */
function renderScheduleView(state) {
  const container = document.getElementById('view-schedule');
  container.innerHTML = '';

  const today      = new Date();
  const curMIdx    = today.getMonth();
  const curDay     = today.getDate();
  const curMonth   = state.months[curMIdx];
  const habits     = curMonth ? curMonth.habits : [];

  // ── Header ────────────────────────────────────────────────
  const hdr = _el('div', 'sched-header');
  hdr.appendChild(_el('h1', 'sched-title', '🕐 Today\'s Schedule'));
  hdr.appendChild(_el('p', 'sched-date',
    today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })));
  container.appendChild(hdr);

  // ── Settings row ──────────────────────────────────────────
  const settingsRow = _el('div', 'sched-settings-row');

  // Prediction window
  const pwLabel = _el('label', 'sched-setting-label', 'Prediction window: ');
  pwLabel.htmlFor = 'sched-pw-select';
  const pwSel = document.createElement('select');
  pwSel.id = 'sched-pw-select';
  pwSel.className = 'sched-setting-select';
  pwSel.setAttribute('aria-label', 'Prediction window in days');
  [3, 4, 5].forEach(n => {
    const opt = _el('option', null, n + ' days');
    opt.value = n;
    if (n === (state.predictionWindow || 5)) opt.selected = true;
    pwSel.appendChild(opt);
  });
  pwSel.addEventListener('change', () => {
    AppState.setPredictionWindow(parseInt(pwSel.value, 10));
    renderScheduleView(AppState.getState());
  });
  pwLabel.appendChild(pwSel);
  settingsRow.appendChild(pwLabel);

  // On-time threshold (read-only display)
  const threshLabel = _el('label', 'sched-setting-label',
    '⏱ On-time window: ±' + (state.onTimeThreshold || 15) + ' min');
  settingsRow.appendChild(threshLabel);

  // Positive reinforcement toggle
  const prWrap = _el('label', 'sched-setting-label sched-toggle-label');
  prWrap.htmlFor = 'sched-pr-toggle';
  const prCheck = document.createElement('input');
  prCheck.type = 'checkbox';
  prCheck.id = 'sched-pr-toggle';
  prCheck.checked = state.positiveReinforcement !== false;
  prCheck.setAttribute('aria-label', 'Enable positive reinforcement toasts');
  prCheck.addEventListener('change', () => {
    AppState.setPositiveReinforcement(prCheck.checked);
  });
  prWrap.appendChild(prCheck);
  prWrap.appendChild(document.createTextNode(' Positive reinforcement'));
  settingsRow.appendChild(prWrap);

  container.appendChild(settingsRow);

  // ── Pomodoro / Focus Timer ────────────────────────────────
  const pomSection  = _el('div', 'pom-section');
  const pomHeadRow  = _el('div', 'pom-head-row');
  pomHeadRow.appendChild(_el('span', 'pom-title', '\ud83c\udf45 Focus Timer'));
  const pomShowBtn  = _el('button', 'btn btn-secondary btn-sm', 'Show Timer');
  pomHeadRow.appendChild(pomShowBtn);
  pomSection.appendChild(pomHeadRow);
  const pomBody = _el('div', 'pom-body hidden');
  let _pomInterval = null;
  let _pomRemaining = 25 * 60;
  let _pomRunning   = false;
  let _pomMode      = 'work';
  const _pomModes   = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const _pomLabels  = { work: '\ud83c\udf45 Focus', short: '\u2615 Short Break', long: '\ud83d\udecc Long Break' };
  function _fmtPom(sec) { return String(Math.floor(sec / 60)).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0'); }
  const pomModeBtns = _el('div', 'pom-mode-row');
  [['work','\ud83c\udf45 25m'],['short','\u2615 5m'],['long','\ud83d\udecc 15m']].forEach(([mode, lbl]) => {
    const b = _el('button', 'btn btn-sm pom-mode-btn' + (mode === 'work' ? ' active' : ''), lbl);
    b.addEventListener('click', () => {
      if (_pomInterval) { clearInterval(_pomInterval); _pomInterval = null; _pomRunning = false; }
      _pomMode = mode; _pomRemaining = _pomModes[mode];
      pomDisplay.textContent = _fmtPom(_pomRemaining);
      pomStatus.textContent  = _pomLabels[mode];
      startBtn.textContent   = '\u25b6 Start';
      pomModeBtns.querySelectorAll('.pom-mode-btn').forEach(x => x.classList.toggle('active', x === b));
    });
    pomModeBtns.appendChild(b);
  });
  pomBody.appendChild(pomModeBtns);
  const pomDisplay = _el('div', 'pom-display', '25:00');
  const pomStatus  = _el('div', 'pom-status', '\ud83c\udf45 Focus \u2014 25 min');
  pomBody.appendChild(pomDisplay);
  pomBody.appendChild(pomStatus);
  const pomBtnRow = _el('div', 'pom-btn-row');
  const startBtn  = _el('button', 'btn btn-primary', '\u25b6 Start');
  const resetBtn  = _el('button', 'btn btn-secondary', '\u21ba Reset');
  startBtn.addEventListener('click', () => {
    if (_pomRunning) {
      clearInterval(_pomInterval); _pomInterval = null; _pomRunning = false;
      startBtn.textContent = '\u25b6 Resume';
    } else {
      _pomRunning = true; startBtn.textContent = '\u23f8 Pause';
      _pomInterval = setInterval(() => {
        _pomRemaining--;
        pomDisplay.textContent = _fmtPom(_pomRemaining);
        if (_pomRemaining <= 0) {
          clearInterval(_pomInterval); _pomInterval = null; _pomRunning = false;
          startBtn.textContent = '\u25b6 Start';
          try {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.3, 0.6].forEach(t => {
              const o = ac.createOscillator(); const g = ac.createGain();
              o.connect(g); g.connect(ac.destination); o.frequency.value = 880;
              g.gain.setValueAtTime(0.2, ac.currentTime + t);
              g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.4);
              o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.5);
            });
          } catch(e2) {}
          showToast(_pomLabels[_pomMode] + ' complete! \ud83c\udf89', 'success');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Daily Habit Portal', { body: _pomLabels[_pomMode] + ' done!' });
          }
        }
      }, 1000);
    }
  });
  resetBtn.addEventListener('click', () => {
    clearInterval(_pomInterval); _pomInterval = null; _pomRunning = false;
    _pomRemaining = _pomModes[_pomMode];
    pomDisplay.textContent = _fmtPom(_pomRemaining);
    startBtn.textContent   = '\u25b6 Start';
  });
  pomBtnRow.appendChild(startBtn); pomBtnRow.appendChild(resetBtn);
  pomBody.appendChild(pomBtnRow);
  pomSection.appendChild(pomBody);
  pomShowBtn.addEventListener('click', () => {
    pomBody.classList.toggle('hidden');
    pomShowBtn.textContent = pomBody.classList.contains('hidden') ? 'Show Timer' : 'Hide Timer';
  });
  container.appendChild(pomSection);

  // ── Info banner if no predictions exist yet ───────────────
  const hasPredictions = habits.some(h => getPredictedTime(state, h) !== null);
  if (!hasPredictions && habits.length > 0) {
    const info = _el('div', 'sched-info-banner');
    info.innerHTML = '💡 <strong>How predictions work:</strong> Complete habits using the clock 🕐 button to log your time. After 3 days of logged times, a predicted schedule will appear here automatically.';
    container.appendChild(info);
  }

  // ── Build habit rows with predictions ─────────────────────
  const habitRows = habits.map(habitName => {
    const predicted = getPredictedTime(state, habitName);
    const needed    = predicted === null ? getPredictionProgress(state, habitName) : 0;
    const entry     = curMonth.entries[habitName] && curMonth.entries[habitName][curDay];
    const done      = entry ? (typeof entry === 'boolean' ? entry : entry.done === true) : false;
    const ts        = (entry && typeof entry === 'object') ? entry.ts : null;
    const category  = AppState.getHabitCategory(curMIdx, habitName);
    return { habitName, predicted, needed, done, ts, category };
  });

  // Sort: non-null predicted times ascending, nulls last
  habitRows.sort((a, b) => {
    if (a.predicted === null && b.predicted === null) return 0;
    if (a.predicted === null) return 1;
    if (b.predicted === null) return -1;
    return timeToMinutes(a.predicted) - timeToMinutes(b.predicted);
  });

  // ── Habit list ────────────────────────────────────────────
  const listSection = _el('div', 'sched-habit-list');
  const listHead = _el('div', 'sched-list-head');
  listHead.appendChild(_el('span', 'sched-col-habit', 'Habit'));
  listHead.appendChild(_el('span', 'sched-col-pred', 'Predicted'));
  listHead.appendChild(_el('span', 'sched-col-status', 'Done'));
  listHead.appendChild(_el('span', 'sched-col-time', 'Log Time'));
  listSection.appendChild(listHead);

  habitRows.forEach(({ habitName, predicted, needed, done, ts, category }) => {
    const row = _el('div', 'sched-habit-row' + (done ? ' sched-row-done' : ''));

    // Name + category badge
    const nameWrap = _el('div', 'sched-col-habit');
    nameWrap.appendChild(_el('span', 'sched-habit-name', habitName));
    if (category && category !== 'anytime') {
      nameWrap.appendChild(_el('span', 'category-badge cat-' + category, category));
    }
    row.appendChild(nameWrap);

    // Predicted time
    const predEl = _el('div', 'sched-col-pred');
    if (predicted) {
      predEl.appendChild(_el('span', 'sched-pred-time', predicted));
    } else if (needed > 0) {
      predEl.appendChild(_el('span', 'sched-no-pred', 'Need ' + needed + ' more day' + (needed > 1 ? 's' : '')));
    } else {
      predEl.appendChild(_el('span', 'sched-no-pred', 'No prediction yet'));
    }
    row.appendChild(predEl);

    // Completion checkbox
    const doneWrap = _el('div', 'sched-col-status');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = done;
    cb.setAttribute('aria-label', 'Mark ' + habitName + ' complete');
    cb.addEventListener('change', () => {
      AppState.toggleEntry(curMIdx, habitName, curDay);
      const newState = AppState.getState();
      // Positive reinforcement check
      if (cb.checked) {
        const newEntry = newState.months[curMIdx].entries[habitName] &&
                         newState.months[curMIdx].entries[habitName][curDay];
        const newTs = newEntry && typeof newEntry === 'object' ? newEntry.ts : null;
        const pred  = getPredictedTime(newState, habitName);
        if (pred && newTs && newState.positiveReinforcement !== false) {
          if (isOnTime(newTs, pred, newState.onTimeThreshold || 15)) {
            showToast('🎯 On time! Great job with "' + habitName + '"', 'success');
          }
        }
      }
      renderScheduleView(newState);
    });
    doneWrap.appendChild(cb);
    if (ts) doneWrap.appendChild(_el('span', 'sched-ts-badge', ts.slice(11, 16)));
    row.appendChild(doneWrap);

    // Clock / manual time button
    const timeWrap = _el('div', 'sched-col-time');
    const clockBtn = _el('button', 'btn btn-secondary btn-sm sched-clock-btn', '🕐');
    clockBtn.setAttribute('aria-label', 'Set time for ' + habitName);
    clockBtn.title = 'Log or correct completion time';
    clockBtn.addEventListener('click', () => {
      renderTimeEntryUI(habitName, curDay, curMIdx, ts, () => {
        renderScheduleView(AppState.getState());
      }, () => {});
    });
    timeWrap.appendChild(clockBtn);
    row.appendChild(timeWrap);

    listSection.appendChild(row);
  });

  if (habits.length === 0) {
    listSection.appendChild(_el('p', 'sched-empty', 'No habits configured for this month yet.'));
  }

  container.appendChild(listSection);

  // ── Suggestions section ───────────────────────────────────
  const suggestions = [];
  habits.forEach(habitName => {
    const category = AppState.getHabitCategory(curMIdx, habitName);
    const dismissed = curMonth.dismissedSuggestions && curMonth.dismissedSuggestions[habitName];
    const timestamps = getRecentTimestamps(state, habitName, 10);
    if (shouldSuggest(timestamps, category, dismissed)) {
      const avgTime = computeRollingAverage(timestamps, Math.min(timestamps.length, 5));
      const [winStart, winEnd] = categoryWindow(category);
      suggestions.push({ habitName, category, avgTime, winStart, winEnd });
    }
  });

  if (suggestions.length > 0) {
    const sugSection = _el('div', 'suggestions-section');
    sugSection.setAttribute('role', 'region');
    sugSection.setAttribute('aria-label', 'Optimization Suggestions');
    sugSection.appendChild(_el('h3', 'sug-title', '⚡ Optimization Suggestions'));
    sugSection.appendChild(_el('p', 'sug-sub', 'These habits are consistently done outside their ideal time window.'));

    suggestions.forEach(({ habitName, category, avgTime, winStart, winEnd }) => {
      const row = _el('div', 'suggestion-row');
      const msg = _el('div', 'sug-msg');
      msg.innerHTML = '<strong>' + habitName + '</strong> — avg completion <strong>' +
        (avgTime || '?') + '</strong>, recommended window: <strong>' +
        minutesToTime(winStart) + '–' + minutesToTime(winEnd) + '</strong> (' + category + ')';
      row.appendChild(msg);

      const dismissBtn = _el('button', 'btn btn-secondary btn-sm sug-dismiss-btn', 'Dismiss');
      dismissBtn.addEventListener('click', () => {
        const avgMins = avgTime ? timeToMinutes(avgTime) : 0;
        AppState.dismissSuggestion(curMIdx, habitName, avgMins);
        renderScheduleView(AppState.getState());
      });
      row.appendChild(dismissBtn);
      sugSection.appendChild(row);
    });

    container.appendChild(sugSection);
  }
}

// ============================================================
// Task 5 — renderTimeEntryUI
// ============================================================

/**
 * Render the time entry modal overlay for manual timestamp logging.
 * @param {string}   habitName   Habit being logged
 * @param {number}   day         1-based day number
 * @param {number}   monthIndex  0-based month index
 * @param {string}   currentTs   Existing ISO timestamp (or null)
 * @param {function} onConfirm   Called after successful save
 * @param {function} onCancel    Called when user cancels
 */
function renderTimeEntryUI(habitName, day, monthIndex, currentTs, onConfirm, onCancel) {
  // Remove any existing modal
  document.querySelectorAll('.time-entry-backdrop').forEach(el => el.remove());

  const backdrop = _el('div', 'time-entry-backdrop');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Set completion time for ' + habitName);

  const modal = _el('div', 'time-entry-modal');

  // Heading
  const heading = _el('h3', 'time-entry-heading', '🕐 Log time for "' + habitName + '"');
  modal.appendChild(heading);

  // Pre-fill from existing timestamp
  let initHour = new Date().getHours();
  let initMin  = Math.floor(new Date().getMinutes() / 5) * 5; // round to nearest 5
  if (currentTs && currentTs.length >= 16) {
    const parts = currentTs.slice(11, 16).split(':');
    initHour = parseInt(parts[0], 10) || 0;
    initMin  = parseInt(parts[1], 10) || 0;
  }

  // ── Scroll-wheel picker ───────────────────────────────────
  const pickerRow = _el('div', 'time-picker-row');

  const hourLabel = _el('label', 'time-picker-label', 'Hour');
  hourLabel.htmlFor = 'te-hour-sel';
  const hourSel = document.createElement('select');
  hourSel.id = 'te-hour-sel';
  hourSel.className = 'time-picker-select';
  for (let h = 0; h <= 23; h++) {
    const opt = _el('option', null, String(h).padStart(2, '0'));
    opt.value = h;
    if (h === initHour) opt.selected = true;
    hourSel.appendChild(opt);
  }

  const minLabel = _el('label', 'time-picker-label', 'Minute');
  minLabel.htmlFor = 'te-min-sel';
  const minSel = document.createElement('select');
  minSel.id = 'te-min-sel';
  minSel.className = 'time-picker-select';
  for (let m = 0; m <= 59; m++) {
    const opt = _el('option', null, String(m).padStart(2, '0'));
    opt.value = m;
    if (m === initMin) opt.selected = true;
    minSel.appendChild(opt);
  }

  const hourWrap = _el('div', 'time-picker-col');
  hourWrap.appendChild(hourLabel);
  hourWrap.appendChild(hourSel);
  const minWrap = _el('div', 'time-picker-col');
  minWrap.appendChild(minLabel);
  minWrap.appendChild(minSel);
  const colonEl = _el('div', 'time-picker-colon', ':');

  pickerRow.appendChild(hourWrap);
  pickerRow.appendChild(colonEl);
  pickerRow.appendChild(minWrap);
  modal.appendChild(pickerRow);

  // ── Quick-select grid (05:00–23:00 every 30 min = 37 buttons) ──
  const quickLabel = _el('div', 'quick-select-label', 'Quick select:');
  modal.appendChild(quickLabel);

  const quickGrid = _el('div', 'quick-select-grid');
  for (let totalMin = 5 * 60; totalMin <= 23 * 60; totalMin += 30) {
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    const label = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    const btn = _el('button', 'quick-select-btn', label);
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Set time to ' + label);
    btn.addEventListener('click', () => {
      // Pre-fill selects
      hourSel.value = hh;
      minSel.value  = mm;
      // Immediately confirm (1 interaction)
      _confirmTime();
    });
    quickGrid.appendChild(btn);
  }
  modal.appendChild(quickGrid);

  // ── Confirm / Cancel buttons ──────────────────────────────
  const btnRow = _el('div', 'time-entry-btn-row');

  const confirmBtn = _el('button', 'btn btn-primary', 'Confirm');
  confirmBtn.addEventListener('click', _confirmTime);

  const cancelBtn = _el('button', 'btn btn-secondary', 'Cancel');
  cancelBtn.addEventListener('click', () => {
    backdrop.remove();
    if (typeof onCancel === 'function') onCancel();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  modal.appendChild(btnRow);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Close on backdrop click
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) {
      backdrop.remove();
      if (typeof onCancel === 'function') onCancel();
    }
  });

  // Focus confirm button for keyboard accessibility
  setTimeout(() => confirmBtn.focus(), 50);

  function _confirmTime() {
    const h  = parseInt(hourSel.value, 10);
    const m  = parseInt(minSel.value, 10);
    const now = new Date();
    // Build ISO timestamp using the selected time but today's date
    const ts = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':00';

    const result = AppState.setManualTimestamp(monthIndex, habitName, day, ts);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    backdrop.remove();
    if (typeof onConfirm === 'function') onConfirm();
  }
}

// ============================================================
// Task 6 — renderStatsAccuracy(monthIndex, container)
// ============================================================

/**
 * Render the Schedule Accuracy section and append it to the given container.
 * @param {number}      monthIndex
 * @param {HTMLElement} container   The stats tab panel element
 */
function renderStatsAccuracy(monthIndex, container) {
  const state      = AppState.getState();
  const monthData  = state.months[monthIndex];
  const threshold  = state.onTimeThreshold || 15;

  const perHabit   = computeScheduleAccuracy(monthData, state, threshold);
  const overall    = computeOverallAccuracy(perHabit);

  const section = _el('div', 'stats-section');
  section.appendChild(_el('h3', null, '⏱ Schedule Accuracy'));
  section.appendChild(_el('p', 'stats-section-desc',
    'Percentage of days each habit was completed within ±' + threshold + ' min of its predicted time.'));

  if (perHabit.length === 0) {
    section.appendChild(_el('p', 'stats-empty', 'No habits tracked this month yet.'));
    container.appendChild(section);
    return;
  }

  // Check if any habit has enough data for accuracy
  const anyData = perHabit.some(h => h.total > 0);
  const anyPrediction = perHabit.some(h => getPredictedTime(state, h.name) !== null);

  if (!anyPrediction) {
    const noDataMsg = _el('div', 'sched-info-banner');
    noDataMsg.innerHTML = '💡 <strong>No predictions yet.</strong> Log completion times for at least 3 days using the 🕐 clock button in the Daily Grid or Schedule view. Once predictions are available, accuracy will be calculated here.';
    section.appendChild(noDataMsg);
    container.appendChild(section);
    return;
  }

  const table = _el('table', 'stats-table schedule-accuracy-table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Habit', 'Predicted', 'On-Time', 'Total', 'Accuracy'].forEach(h => {
    headRow.appendChild(_el('th', null, h));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  perHabit.forEach(({ name, accuracy, onTime, total }) => {
    const predicted = getPredictedTime(state, name);
    const tr = document.createElement('tr');
    tr.appendChild(_el('td', null, name));
    // Predicted time column
    const predTd = document.createElement('td');
    if (predicted) {
      predTd.appendChild(_el('span', 'sched-pred-time', predicted));
    } else {
      const needed = getPredictionProgress(state, name);
      predTd.appendChild(_el('span', 'stats-insufficient', needed + ' more day' + (needed !== 1 ? 's' : '') + ' needed'));
    }
    tr.appendChild(predTd);
    tr.appendChild(_el('td', null, String(onTime)));
    tr.appendChild(_el('td', null, String(total)));
    const accTd = document.createElement('td');
    if (accuracy === null) {
      if (!predicted) {
        accTd.appendChild(_el('span', 'stats-insufficient', 'No prediction'));
      } else if (total < 3) {
        accTd.appendChild(_el('span', 'stats-insufficient', 'Need ' + (3 - total) + ' more day' + (3 - total !== 1 ? 's' : '')));
      } else {
        accTd.appendChild(_el('span', 'stats-insufficient', 'Insufficient data'));
      }
    } else {
      const wrap = _el('div', 'acc-cell');
      wrap.appendChild(_el('span', 'acc-pct', accuracy + '%'));
      wrap.appendChild(_progressBar(accuracy));
      accTd.appendChild(wrap);
    }
    tr.appendChild(accTd);
    tbody.appendChild(tr);
  });

  // Overall row
  const overallTr = document.createElement('tr');
  overallTr.className = 'acc-overall-row';
  overallTr.appendChild(_el('td', 'acc-overall-label', 'Overall'));
  overallTr.appendChild(_el('td', null, ''));
  overallTr.appendChild(_el('td', null, ''));
  overallTr.appendChild(_el('td', null, ''));
  const overallTd = document.createElement('td');
  if (overall === null) {
    overallTd.appendChild(_el('span', 'stats-insufficient', 'Not enough data yet'));
  } else {
    overallTd.appendChild(_el('strong', null, overall + '%'));
  }
  overallTr.appendChild(overallTd);
  tbody.appendChild(overallTr);

  table.appendChild(tbody);
  section.appendChild(table);
  container.appendChild(section);
}
