/**
 * state.js — AppState singleton, seed data, and computed getters.
 *
 * This module is the single source of truth for all application data.
 * It exposes:
 *   - DAYS_IN_MONTH constant
 *   - AppState singleton (window.AppState)
 *   - Mutation methods: addHabit, removeHabit, toggleEntry, etc.
 *   - Computed getters: dailyProgress, dailySummary, weeklyPartition,
 *     weeklyProgress, monthlySummary, perHabitStats, consistencyRank,
 *     monthlyDailyAvg, yearToDateAvg, goalProgress, isOverdue
 */

'use strict';

// ============================================================
// Constants
// ============================================================

/** Days in each month (index 0 = January). Feb fixed at 28 — no leap year. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LIFE_AREAS = [
  'Finances',
  'Career',
  'Personal Growth',
  'Health & Wellness',
  'Relationships'
];

const HABIT_TAGS = ['Health', 'Fitness', 'Mind', 'Work', 'Sleep', 'Diet', 'Social', 'Finance'];

/** Time-sensitivity categories for habits. */
const HABIT_CATEGORIES = ['anytime', 'morning', 'afternoon', 'evening', 'peak-focus'];

/**
 * Optimal time windows for each category, expressed as [startMin, endMin]
 * where values are minutes since midnight.
 */
const CATEGORY_WINDOWS = {
  morning:      [5 * 60,  11 * 60 + 59],   // 05:00–11:59
  afternoon:    [12 * 60, 16 * 60 + 59],   // 12:00–16:59
  evening:      [17 * 60, 21 * 60 + 59],   // 17:00–21:59
  'peak-focus': [6 * 60,  10 * 60],        // 06:00–10:00
  anytime:      [0,       23 * 60 + 59]    // entire day
};

const SUGGESTED_HABITS = [
  { category: '🌅 Morning',  habits: ['Wake up at 5:00 am','Wake up at 6:00 am','Make the bed','Morning meditation 10 min','Cold shower','Journaling 5 min','Read 20 pages'] },
  { category: '💪 Fitness',  habits: ['GYM','Walk 10000 Steps','Run 30 min','Yoga 20 min','Push-ups 50','Stretching 10 min','Cycling 30 min'] },
  { category: '🥗 Diet',     habits: ['Drink water 3-4 Litre','Eat Clean Food (no outside food)','No sugar today','Green Tea Before Lunch','Green Tea after lunch','Breakfast','Healthy dinner'] },
  { category: '🧠 Mind',     habits: ['Study 1 Hour','Read 30 min','Learn new skill 20 min','Practice gratitude','No social media after 9pm','Meditation 15 min'] },
  { category: '😴 Sleep',    habits: ['Sleep by 10 PM','Got to Bed at 11 AM','No screen 1hr before bed','Sleep 7+ hours','Take Bath before 12 PM'] },
  { category: '💼 Work',     habits: ['Plan the day (to-do list)','Deep work 2 hours','Review goals','Weekly review','No meetings before 10am'] },
  { category: '🤝 Social',   habits: ['Call family','Spend time with friends','Random act of kindness','Write a thank you note'] }
];

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😊', '🤩'];

const BADGE_DEFS = [
  { id: 'first-habit',    name: 'First Step',      icon: '🌱', desc: 'Add your first habit' },
  { id: 'streak-7',       name: 'Week Warrior',    icon: '🔥', desc: '7-day streak on any habit' },
  { id: 'streak-30',      name: 'Month Master',    icon: '💪', desc: '30-day streak on any habit' },
  { id: 'perfect-day',    name: 'Perfect Day',     icon: '⭐', desc: '100% habits done in one day' },
  { id: 'first-goal',     name: 'Goal Getter',     icon: '🎯', desc: 'Add your first goal' },
  { id: 'goal-achieved',  name: 'Achiever',        icon: '🏅', desc: 'Achieve any goal' },
  { id: 'habit-10',       name: 'Habit Hoarder',   icon: '📋', desc: 'Track 10+ habits in one month' },
  { id: 'early-bird',     name: 'Early Bird',      icon: '🌅', desc: 'Complete a habit before 7 AM' },
  { id: 'consistency-90', name: 'Consistency Pro', icon: '💎', desc: 'Month average above 90%' },
  { id: 'perfect-week',   name: 'Perfect Week',    icon: '🏆', desc: '7-day streak on ALL habits simultaneously' },
];

// ============================================================
// Seed data helpers
// ============================================================

const JAN_HABITS = [
  'Wake up at 6:00 am',
  'Make the bed',
  'Breakfast',
  'Green Tea Before Lunch',
  'Study 1 Hour',
  'Green Tea after lunch',
  'Drink water 3-4 Litre',
  'Eat Clean Food (no outside food)',
  'Walk 10000 Steps',
  'Got to Bed at 12 AM',
  'Take Bath before 12 PM',
  'GYM'
];

const DEFAULT_HABITS = [
  'Wake up at 6:00 am',
  'Make the bed',
  'Move body for 30 minutes'
];

/**
 * Build a fresh MonthData object for the given monthIndex.
 * @param {number} monthIndex - 0-based month index
 * @returns {MonthData}
 */
function createMonthData(monthIndex) {
  const habits = monthIndex === 0 ? [...JAN_HABITS] : [...DEFAULT_HABITS];
  return {
    monthIndex,
    habits,
    entries:        {},   // { [habitName]: { [day]: boolean } }
    pinnedHabits:   [],   // [habitName, ...] — shown at top
    habitTags:      {},   // { [habitName]: string }
    habitFrequency: {},   // { [habitName]: 'daily'|'weekdays'|'3x'|'5x' }
    dayNotes:       {},   // { [day]: string }
    archived:       false,
    weeklyHabits:   [],
    monthlyHabits:  [],
    monthlyNotes:   '',
    weeklyReviews:  {},    // { [weekNum]: { well, improve, goal } }
    habitCategories:      {},   // { [habitName]: 'anytime'|'morning'|'afternoon'|'evening'|'peak-focus' }
    dismissedSuggestions: {},   // { [habitName]: { dismissedAt, avgAtDismissal } }
    habitColors:          {},   // { [habitName]: string } CSS color
    moodLog:              {},   // { [day]: number } 1–5
    numericTargets:       {},   // { [habitName]: number } daily goal
    numericEntries:       {},   // { [habitName]: { [day]: number } }
    habitReminders:       {}    // { [habitName]: 'HH:MM' }
  };
}

/**
 * Build the initial seed state (12 months + empty goals).
 * @returns {AppStateSchema}
 */
function createSeedState() {
  return {
    version: 1,
    year: new Date().getFullYear(),
    months: Array.from({ length: 12 }, (_, i) => createMonthData(i)),
    goals: [],
    templates: [],   // [{ name, habits, tags }]
    predictionWindow:      5,    // days used for rolling average (3–5)
    onTimeThreshold:       15,   // minutes tolerance for on-time detection
    positiveReinforcement: true,  // show toast when habit completed on time
    earnedBadges: []             // [{ id, earnedAt }]
  };
}

// ============================================================
// Simple UUID helper (no crypto dependency)
// ============================================================
function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

// ============================================================
// AppState singleton
// ============================================================

const AppState = (() => {
  /** @type {AppStateSchema} */
  let _state = createSeedState();

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  /**
   * Read the completion boolean from an entry, supporting both legacy
   * boolean entries and new { done, ts? } object entries.
   * @param {boolean|{done:boolean,ts?:string}|null|undefined} entry
   * @returns {boolean}
   */
  function _entryDone(entry) {
    if (entry === null || entry === undefined) return false;
    if (typeof entry === 'boolean') return entry;   // legacy format
    return entry.done === true;
  }

  function _month(monthIndex) {
    if (monthIndex < 0 || monthIndex > 11) throw new RangeError('monthIndex must be 0–11');
    return _state.months[monthIndex];
  }

  function _ensureEntries(month, habitName) {
    if (!month.entries[habitName]) month.entries[habitName] = {};
  }

  function _save() {
    // Delegate to storage.js if available (loaded after state.js)
    if (typeof saveState === 'function') saveState(_state);
  }

  // ----------------------------------------------------------
  // State access
  // ----------------------------------------------------------

  /** Return a shallow reference to the raw state (read-only intent). */
  function getState() { return _state; }

  /** Replace the entire state (used by import / loadState). */
  function setState(newState) {
    _state = newState;
    if (!_state.year)      _state.year      = new Date().getFullYear();
    if (!_state.templates) _state.templates = [];
    // Time-tracking root defaults
    if (!_state.predictionWindow)                    _state.predictionWindow       = 5;
    if (!_state.onTimeThreshold)                     _state.onTimeThreshold        = 15;
    if (_state.positiveReinforcement === undefined)  _state.positiveReinforcement  = true;
    _state.months.forEach(m => {
      if (!m.pinnedHabits)          m.pinnedHabits          = [];
      if (!m.habitTags)             m.habitTags             = {};
      if (!m.habitFrequency)        m.habitFrequency        = {};
      if (!m.dayNotes)              m.dayNotes              = {};
      if (!m.weeklyReviews)         m.weeklyReviews         = {};
      if (m.archived === undefined) m.archived              = false;
      // Time-tracking month defaults
      if (!m.habitCategories)       m.habitCategories       = {};
      if (!m.dismissedSuggestions)  m.dismissedSuggestions  = {};
      if (!m.habitColors)           m.habitColors           = {};
      if (!m.moodLog)               m.moodLog               = {};
      if (!m.numericTargets)        m.numericTargets        = {};
      if (!m.numericEntries)        m.numericEntries        = {};
      if (!m.habitReminders)        m.habitReminders        = {};
      // Migrate legacy boolean entries → { done, ts? } objects
      Object.keys(m.entries).forEach(habitName => {
        const habitEntries = m.entries[habitName];
        if (habitEntries && typeof habitEntries === 'object') {
          Object.keys(habitEntries).forEach(day => {
            const val = habitEntries[day];
            if (typeof val === 'boolean') {
              habitEntries[day] = { done: val };
            }
          });
        }
      });
    });
    _state.goals.forEach(g => {
      if (!g.linkedHabits) g.linkedHabits = [];
    });
    if (!_state.earnedBadges) _state.earnedBadges = [];
  }

  /** Return the currently tracked year. */
  function getYear() {
    return _state.year || new Date().getFullYear();
  }

  /**
   * Change to a different year.
   * Clears all tick data (entries + monthly completions) but keeps habit names.
   * @param {number} newYear
   */
  function changeYear(newYear) {
    _state.year = newYear;
    _state.months.forEach(month => {
      month.entries = {};
      month.monthlyHabits.forEach(h => { h.completed = false; });
    });
    _save();
  }

  // ----------------------------------------------------------
  // Habit mutations
  // ----------------------------------------------------------

  /**
   * Add a daily habit to a month.
   * @param {number} monthIndex
   * @param {string} name
   * @returns {{ ok: boolean, error?: string }}
   */
  function addHabit(monthIndex, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { ok: false, error: 'Habit name cannot be empty.' };

    const month = _month(monthIndex);
    if (month.habits.includes(trimmed)) {
      return { ok: false, error: 'A habit with this name already exists for this month.' };
    }

    month.habits.push(trimmed);
    _save();
    return { ok: true };
  }

  /**
   * Remove a daily habit and all its entries from a month.
   * @param {number} monthIndex
   * @param {string} name
   */
  function removeHabit(monthIndex, name) {
    const month = _month(monthIndex);
    month.habits        = month.habits.filter(h => h !== name);
    month.pinnedHabits  = (month.pinnedHabits || []).filter(h => h !== name);
    delete month.entries[name];
    delete (month.habitTags || {})[name];
    _save();
  }

  /**
   * Move a habit to the position currently occupied by another habit.
   * @param {number} monthIndex
   * @param {string} fromName  Habit being dragged
   * @param {string} toName    Habit being dropped onto
   */
  function reorderHabit(monthIndex, fromName, toName) {
    const month  = _month(monthIndex);
    const habits = month.habits;
    const fromIdx = habits.indexOf(fromName);
    const toIdx   = habits.indexOf(toName);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    habits.splice(fromIdx, 1);
    habits.splice(toIdx, 0, fromName);
    _save();
  }

  // ----------------------------------------------------------
  // Template mutations
  // ----------------------------------------------------------

  function saveTemplate(name, monthIndex) {
    const month = _month(monthIndex);
    if (!_state.templates) _state.templates = [];
    const existing = _state.templates.findIndex(t => t.name === name);
    const tmpl = { name, habits: [...month.habits], tags: { ...(month.habitTags || {}) } };
    if (existing >= 0) _state.templates[existing] = tmpl;
    else _state.templates.push(tmpl);
    _save();
  }

  function getTemplates() {
    return _state.templates || [];
  }

  function applyTemplate(monthIndex, templateName) {
    if (!_state.templates) return 0;
    const tmpl = _state.templates.find(t => t.name === templateName);
    if (!tmpl) return 0;
    const month = _month(monthIndex);
    let added = 0;
    tmpl.habits.forEach(h => {
      if (!month.habits.includes(h)) { month.habits.push(h); added++; }
    });
    if (added) _save();
    return added;
  }

  function deleteTemplate(templateName) {
    if (!_state.templates) return;
    _state.templates = _state.templates.filter(t => t.name !== templateName);
    _save();
  }

  // ----------------------------------------------------------
  // Habit frequency mutations
  // ----------------------------------------------------------

  function setHabitFrequency(monthIndex, habitName, freq) {
    const month = _month(monthIndex);
    if (!month.habitFrequency) month.habitFrequency = {};
    if (freq === 'daily') delete month.habitFrequency[habitName];
    else month.habitFrequency[habitName] = freq;
    _save();
  }

  // ----------------------------------------------------------
  // Weekly review mutations
  // ----------------------------------------------------------

  function setWeeklyReview(monthIndex, weekNum, data) {
    const month = _month(monthIndex);
    if (!month.weeklyReviews) month.weeklyReviews = {};
    month.weeklyReviews[weekNum] = { ...data, updatedAt: new Date().toISOString() };
    _save();
  }

  function copyHabitsFromMonth(targetIdx, sourceIdx) {
    const src  = _month(sourceIdx);
    const dest = _month(targetIdx);
    let added  = 0;
    src.habits.forEach(h => {
      if (!dest.habits.includes(h)) { dest.habits.push(h); added++; }
      // Copy tag if source has one and dest doesn't already have one for this habit
      if (src.habitTags && src.habitTags[h]) {
        if (!dest.habitTags) dest.habitTags = {};
        if (!dest.habitTags[h]) dest.habitTags[h] = src.habitTags[h];
      }
      // Copy frequency if source has one and dest doesn't already have one for this habit
      if (src.habitFrequency && src.habitFrequency[h]) {
        if (!dest.habitFrequency) dest.habitFrequency = {};
        if (!dest.habitFrequency[h]) dest.habitFrequency[h] = src.habitFrequency[h];
      }
    });
    if (added) _save();
    return added;
  }

  function pinHabit(monthIndex, habitName) {
    const month = _month(monthIndex);
    if (!month.pinnedHabits) month.pinnedHabits = [];
    if (!month.pinnedHabits.includes(habitName)) {
      month.pinnedHabits.push(habitName);
      _save();
    }
  }

  function unpinHabit(monthIndex, habitName) {
    const month = _month(monthIndex);
    month.pinnedHabits = (month.pinnedHabits || []).filter(h => h !== habitName);
    _save();
  }

  function setHabitTag(monthIndex, habitName, tag) {
    const month = _month(monthIndex);
    if (!month.habitTags) month.habitTags = {};
    month.habitTags[habitName] = tag;
    _save();
  }

  function setDayNote(monthIndex, day, note) {
    const month = _month(monthIndex);
    if (!month.dayNotes) month.dayNotes = {};
    if (note && note.trim()) {
      month.dayNotes[day] = note.trim();
    } else {
      delete month.dayNotes[day];
    }
    _save();
  }

  function archiveMonth(monthIndex) {
    _month(monthIndex).archived = true;
    _save();
  }

  function unarchiveMonth(monthIndex) {
    _month(monthIndex).archived = false;
    _save();
  }

  function habitStreak(monthIndex, habitName) {
    const month       = _month(monthIndex);
    const daysInMonth = DAYS_IN_MONTH[monthIndex];
    const entries     = (month.entries[habitName]) || {};

    const now = new Date();
    const isCurrentMonth = monthIndex === now.getMonth() && _state.year === now.getFullYear();
    let startDay = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    // If today isn't checked yet, allow counting from yesterday
    if (isCurrentMonth && !_entryDone(entries[startDay]) && startDay > 1) {
      startDay = startDay - 1;
    }

    let streak = 0;
    for (let d = startDay; d >= 1; d--) {
      if (_entryDone(entries[d])) streak++;
      else break;
    }
    return streak;
  }

  function bestStreak(monthIndex, habitName) {
    const month       = _month(monthIndex);
    const daysInMonth = DAYS_IN_MONTH[monthIndex];
    const entries     = (month.entries[habitName]) || {};
    let best = 0, current = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (_entryDone(entries[d])) { current++; if (current > best) best = current; }
      else current = 0;
    }
    return best;
  }

  function linkHabitToGoal(goalId, monthIndex, habitName) {
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal) return;
    if (!goal.linkedHabits) goal.linkedHabits = [];
    const key = monthIndex + ':' + habitName;
    if (!goal.linkedHabits.includes(key)) { goal.linkedHabits.push(key); _save(); }
  }

  function unlinkHabitFromGoal(goalId, monthIndex, habitName) {
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal || !goal.linkedHabits) return;
    const key = monthIndex + ':' + habitName;
    goal.linkedHabits = goal.linkedHabits.filter(k => k !== key);
    _save();
  }

  /**
   * Toggle a habit entry for a specific day.
   * Stores { done, ts? } objects; ts is set to local ISO datetime when marking complete.
   * @param {number} monthIndex
   * @param {string} habitName
   * @param {number} day - 1-based day number
   */
  function toggleEntry(monthIndex, habitName, day) {
    const month = _month(monthIndex);
    _ensureEntries(month, habitName);
    const current = _entryDone(month.entries[habitName][day]);
    if (!current) {
      // Marking complete — record timestamp
      const now = new Date();
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');
      month.entries[habitName][day] = { done: true, ts };
    } else {
      // Marking incomplete — remove timestamp
      month.entries[habitName][day] = { done: false };
    }
    _save();
  }

  // ----------------------------------------------------------
  // Time-tracking mutations
  // ----------------------------------------------------------

  const _TS_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  /**
   * Manually set the completion timestamp for a habit entry (also marks complete).
   * @param {number} monthIndex
   * @param {string} habitName
   * @param {number} day - 1-based
   * @param {string} isoTimestamp - format YYYY-MM-DDTHH:MM:SS
   * @returns {{ ok: boolean, error?: string }}
   */
  function setManualTimestamp(monthIndex, habitName, day, isoTimestamp) {
    if (!_TS_REGEX.test(isoTimestamp)) {
      return { ok: false, error: 'Invalid timestamp format. Expected YYYY-MM-DDTHH:MM:SS.' };
    }
    const month = _month(monthIndex);
    _ensureEntries(month, habitName);
    month.entries[habitName][day] = { done: true, ts: isoTimestamp };
    _save();
    return { ok: true };
  }

  /**
   * Set the time-sensitivity category for a habit in a month.
   * @param {number} monthIndex
   * @param {string} habitName
   * @param {string} category
   * @returns {{ ok: boolean, error?: string }}
   */
  function setHabitCategory(monthIndex, habitName, category) {
    if (!HABIT_CATEGORIES.includes(category)) {
      return { ok: false, error: 'Invalid category. Must be one of: ' + HABIT_CATEGORIES.join(', ') };
    }
    const month = _month(monthIndex);
    if (!month.habitCategories) month.habitCategories = {};
    month.habitCategories[habitName] = category;
    _save();
    return { ok: true };
  }

  /**
   * Get the time-sensitivity category for a habit (defaults to "anytime").
   * @param {number} monthIndex
   * @param {string} habitName
   * @returns {string}
   */
  function getHabitCategory(monthIndex, habitName) {
    const month = _month(monthIndex);
    return (month.habitCategories && month.habitCategories[habitName]) || 'anytime';
  }

  /**
   * Set the prediction window (3–5 days).
   * @param {number} n
   * @returns {{ ok: boolean, error?: string }}
   */
  function setPredictionWindow(n) {
    if (n !== 3 && n !== 4 && n !== 5) {
      return { ok: false, error: 'Prediction window must be 3, 4, or 5 days.' };
    }
    _state.predictionWindow = n;
    _save();
    return { ok: true };
  }

  /**
   * Set the on-time threshold in minutes (must be positive).
   * @param {number} minutes
   */
  function setOnTimeThreshold(minutes) {
    if (typeof minutes === 'number' && minutes > 0) {
      _state.onTimeThreshold = minutes;
      _save();
    }
  }

  /**
   * Enable or disable positive reinforcement toasts.
   * @param {boolean} enabled
   */
  function setPositiveReinforcement(enabled) {
    _state.positiveReinforcement = !!enabled;
    _save();
  }

  /**
   * Dismiss an optimization suggestion for a habit.
   * Records the rolling average at dismissal to suppress re-display
   * until the average shifts by more than 30 minutes.
   * @param {number} monthIndex
   * @param {string} habitName
   * @param {number} rollingAvgMinutes
   */
  function dismissSuggestion(monthIndex, habitName, rollingAvgMinutes) {
    const month = _month(monthIndex);
    if (!month.dismissedSuggestions) month.dismissedSuggestions = {};
    month.dismissedSuggestions[habitName] = {
      dismissedAt: new Date().toISOString(),
      avgAtDismissal: rollingAvgMinutes
    };
    _save();
  }

  // ----------------------------------------------------------
  // Monthly habit mutations
  // ----------------------------------------------------------

  /**
   * Add a monthly habit.
   * @param {number} monthIndex
   * @param {string} name
   * @returns {{ ok: boolean, error?: string }}
   */
  function addMonthlyHabit(monthIndex, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { ok: false, error: 'Habit name cannot be empty.' };

    const month = _month(monthIndex);
    month.monthlyHabits.push({
      id: generateId(),
      name: trimmed,
      completed: false,
      notes: ''
    });
    _save();
    return { ok: true };
  }

  /**
   * Remove a monthly habit by id.
   * @param {number} monthIndex
   * @param {string} id
   */
  function removeMonthlyHabit(monthIndex, id) {
    const month = _month(monthIndex);
    month.monthlyHabits = month.monthlyHabits.filter(h => h.id !== id);
    _save();
  }

  /**
   * Toggle a monthly habit's completed state.
   * @param {number} monthIndex
   * @param {string} id
   */
  function toggleMonthlyHabit(monthIndex, id) {
    const month = _month(monthIndex);
    const habit = month.monthlyHabits.find(h => h.id === id);
    if (habit) { habit.completed = !habit.completed; _save(); }
  }

  /**
   * Update notes for a monthly habit.
   * @param {number} monthIndex
   * @param {string} id
   * @param {string} notes
   */
  function setMonthlyHabitNotes(monthIndex, id, notes) {
    const month = _month(monthIndex);
    const habit = month.monthlyHabits.find(h => h.id === id);
    if (habit) { habit.notes = notes; _save(); }
  }

  /**
   * Set the free-text monthly notes for a month.
   * @param {number} monthIndex
   * @param {string} notes
   */
  function setMonthlyNotes(monthIndex, notes) {
    _month(monthIndex).monthlyNotes = notes;
    _save();
  }

  // ----------------------------------------------------------
  // Goal mutations
  // ----------------------------------------------------------

  /**
   * Add a new goal.
   * @param {{ area, description, reward, deadline, steps: string[] }} goalData
   * @returns {{ ok: boolean, error?: string }}
   */
  function addGoal(goalData) {
    const { area, description, reward, deadline, steps } = goalData || {};

    if (!area)        return { ok: false, error: 'Area is required.' };
    if (!description) return { ok: false, error: 'Description is required.' };
    if (!reward)      return { ok: false, error: 'Reward is required.' };
    if (!deadline)    return { ok: false, error: 'Deadline is required.' };
    if (!steps || steps.length === 0) return { ok: false, error: 'At least one step is required.' };

    const stepObjects = steps.map(desc => ({
      id: generateId(),
      description: desc,
      completed: false
    }));

    _state.goals.push({
      id: generateId(),
      area,
      description,
      reward,
      deadline,
      status: 'Not Started',
      steps: stepObjects
    });

    _save();
    return { ok: true };
  }

  /**
   * Remove a goal by id.
   * @param {string} id
   */
  function removeGoal(id) {
    _state.goals = _state.goals.filter(g => g.id !== id);
    _save();
  }

  /**
   * Toggle a step's completed state; auto-achieve goal when all steps done.
   * @param {string} goalId
   * @param {string} stepId
   */
  function toggleStep(goalId, stepId) {
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const step = goal.steps.find(s => s.id === stepId);
    if (!step) return;

    step.completed = !step.completed;

    // Auto-achieve when all steps complete
    if (goal.steps.length > 0 && goal.steps.every(s => s.completed)) {
      goal.status = 'Achieved';
    }

    _save();
  }

  /**
   * Update a goal's status manually.
   * @param {string} goalId
   * @param {'Not Started'|'Achieved'} status
   * @returns {{ ok: boolean, error?: string }}
   */
  function updateGoalStatus(goalId, status) {
    if (status !== 'Not Started' && status !== 'Achieved') {
      return { ok: false, error: 'Status must be "Not Started" or "Achieved".' };
    }
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal) return { ok: false, error: 'Goal not found.' };
    goal.status = status;
    _save();
    return { ok: true };
  }

  /**
   * Add a step to an existing goal (max 8 steps).
   * @param {string} goalId
   * @param {string} description
   * @returns {{ ok: boolean, error?: string }}
   */
  function addStep(goalId, description) {
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal) return { ok: false, error: 'Goal not found.' };
    if (goal.steps.length >= 8) return { ok: false, error: 'A goal can have at most 8 steps.' };

    goal.steps.push({ id: generateId(), description, completed: false });
    _save();
    return { ok: true };
  }

  /**
   * Remove a step from a goal.
   * @param {string} goalId
   * @param {string} stepId
   */
  function removeStep(goalId, stepId) {
    const goal = _state.goals.find(g => g.id === goalId);
    if (!goal) return;
    goal.steps = goal.steps.filter(s => s.id !== stepId);
    _save();
  }

  // ----------------------------------------------------------
  // Computed getters
  // ----------------------------------------------------------

  /**
   * Daily progress percentage for a given month and day.
   * @param {number} monthIndex
   * @param {number} day - 1-based
   * @returns {number} 0–100
   */
  function dailyProgress(monthIndex, day) {
    const month = _month(monthIndex);
    const total = month.habits.length;
    if (total === 0) return 0;

    let completed = 0;
    for (const habit of month.habits) {
      if (month.entries[habit] && _entryDone(month.entries[habit][day])) completed++;
    }
    return Math.round((completed / total) * 100);
  }

  /**
   * Daily summary object for a given month and day.
   * @param {number} monthIndex
   * @param {number} day - 1-based
   * @returns {{ percentComplete: number, completedCount: number, incompleteCount: number, goalMet: boolean }}
   */
  function dailySummary(monthIndex, day) {
    const month = _month(monthIndex);
    const total = month.habits.length;
    let completedCount = 0;

    for (const habit of month.habits) {
      if (month.entries[habit] && _entryDone(month.entries[habit][day])) completedCount++;
    }

    const incompleteCount = total - completedCount;
    const percentComplete = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    const goalMet = percentComplete === 100;

    return { percentComplete, completedCount, incompleteCount, goalMet };
  }

  /**
   * Partition days of a month into week buckets.
   * Week 1 = days 1–7, Week 2 = 8–14, Week 3 = 15–21, Week 4 = 22–28, Week 5 = 29+
   * @param {number} monthIndex
   * @returns {{ week1: number[], week2: number[], week3: number[], week4: number[], week5: number[] }}
   */
  function weeklyPartition(monthIndex) {
    const daysInMonth = DAYS_IN_MONTH[monthIndex];
    const partition = { week1: [], week2: [], week3: [], week4: [], week5: [] };

    for (let d = 1; d <= daysInMonth; d++) {
      if (d <= 7)       partition.week1.push(d);
      else if (d <= 14) partition.week2.push(d);
      else if (d <= 21) partition.week3.push(d);
      else if (d <= 28) partition.week4.push(d);
      else              partition.week5.push(d);
    }

    return partition;
  }

  /**
   * Weekly progress percentage for a given week bucket.
   * @param {number} monthIndex
   * @param {string} weekKey - 'week1'|'week2'|'week3'|'week4'|'week5'
   * @returns {number} 0–100
   */
  function weeklyProgress(monthIndex, weekKey) {
    const month = _month(monthIndex);
    const partition = weeklyPartition(monthIndex);
    const days = partition[weekKey] || [];
    const habitsCount = month.habits.length;

    if (habitsCount === 0 || days.length === 0) return 0;

    let totalCompletions = 0;
    for (const habit of month.habits) {
      for (const day of days) {
        if (month.entries[habit] && _entryDone(month.entries[habit][day])) totalCompletions++;
      }
    }

    const possible = habitsCount * days.length;
    return Math.round((totalCompletions / possible) * 100);
  }

  /**
   * Monthly summary derived from monthlyHabits array.
   * @param {number} monthIndex
   * @returns {{ total: number, completed: number, incomplete: number, percentage: number }}
   */
  function monthlySummary(monthIndex) {
    const month = _month(monthIndex);
    const total = month.monthlyHabits.length;
    const completed = month.monthlyHabits.filter(h => h.completed).length;
    const incomplete = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, incomplete, percentage };
  }

  /**
   * Per-habit completion stats for a month.
   * @param {number} monthIndex
   * @returns {Array<{ name: string, daysCompleted: number, percentage: number }>}
   */
  function perHabitStats(monthIndex) {
    const month = _month(monthIndex);
    const daysInMonth = DAYS_IN_MONTH[monthIndex];

    return month.habits.map(habit => {
      let daysCompleted = 0;
      if (month.entries[habit]) {
        for (let d = 1; d <= daysInMonth; d++) {
          if (_entryDone(month.entries[habit][d])) daysCompleted++;
        }
      }
      const percentage = Math.round((daysCompleted / daysInMonth) * 100);
      return { name: habit, daysCompleted, percentage };
    });
  }

  /**
   * Top-10 habits sorted by daysCompleted desc, then name asc.
   * @param {number} monthIndex
   * @returns {Array<{ name: string, daysCompleted: number, percentage: number }>}
   */
  function consistencyRank(monthIndex) {
    const stats = perHabitStats(monthIndex);
    return stats
      .sort((a, b) => {
        if (b.daysCompleted !== a.daysCompleted) return b.daysCompleted - a.daysCompleted;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }

  /**
   * Mean of dailyProgress for days that have at least one entry in the month.
   * @param {number} monthIndex
   * @returns {number} 0–100, or 0 if no data
   */
  function monthlyDailyAvg(monthIndex) {
    const month = _month(monthIndex);
    const daysInMonth = DAYS_IN_MONTH[monthIndex];

    const progressValues = [];
    for (let d = 1; d <= daysInMonth; d++) {
      // Check if any habit has an entry for this day
      const hasEntry = month.habits.some(
        h => month.entries[h] && month.entries[h][d] !== undefined
      );
      if (hasEntry) {
        progressValues.push(dailyProgress(monthIndex, d));
      }
    }

    if (progressValues.length === 0) return 0;
    const sum = progressValues.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / progressValues.length);
  }

  /**
   * Mean of monthlyDailyAvg across all months that have data.
   * @returns {number} 0–100, or 0 if no data
   */
  function yearToDateAvg() {
    const avgs = [];
    for (let i = 0; i < 12; i++) {
      const month = _state.months[i];
      // A month "has data" if any entry exists
      const hasData = month.habits.some(h => {
        const e = month.entries[h];
        return e && Object.keys(e).length > 0;
      });
      if (hasData) avgs.push(monthlyDailyAvg(i));
    }
    if (avgs.length === 0) return 0;
    return Math.round(avgs.reduce((a, v) => a + v, 0) / avgs.length);
  }

  /**
   * Goal progress percentage.
   * @param {Goal} goal
   * @returns {number} 0–100
   */
  function goalProgress(goal) {
    if (!goal || goal.steps.length === 0) return 0;
    const completed = goal.steps.filter(s => s.completed).length;
    return Math.round((completed / goal.steps.length) * 100);
  }

  /**
   * Whether a goal is overdue (deadline passed and status is Not Started).
   * @param {Goal} goal
   * @returns {boolean}
   */
  function isOverdue(goal) {
    if (!goal || goal.status !== 'Not Started') return false;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return goal.deadline < today;
  }

  // ----------------------------------------------------------
  // Habit color mutations
  // ----------------------------------------------------------

  function setHabitColor(monthIndex, habitName, color) {
    const month = _month(monthIndex);
    if (!month.habitColors) month.habitColors = {};
    if (color) month.habitColors[habitName] = color;
    else delete month.habitColors[habitName];
    _save();
  }

  function getHabitColor(monthIndex, habitName) {
    const month = _month(monthIndex);
    return (month.habitColors && month.habitColors[habitName]) || null;
  }

  // ----------------------------------------------------------
  // Mood tracker mutations
  // ----------------------------------------------------------

  function setMoodEntry(monthIndex, day, mood) {
    const month = _month(monthIndex);
    if (!month.moodLog) month.moodLog = {};
    if (mood >= 1 && mood <= 5) month.moodLog[String(day)] = mood;
    else delete month.moodLog[String(day)];
    _save();
  }

  function getMoodEntry(monthIndex, day) {
    const month = _month(monthIndex);
    return (month.moodLog && (month.moodLog[String(day)] || month.moodLog[day])) || null;
  }

  // ----------------------------------------------------------
  // Numeric habit mutations
  // ----------------------------------------------------------

  function setNumericTarget(monthIndex, habitName, target) {
    const month = _month(monthIndex);
    if (!month.numericTargets) month.numericTargets = {};
    if (target > 0) month.numericTargets[habitName] = target;
    else delete month.numericTargets[habitName];
    _save();
  }

  function getNumericTarget(monthIndex, habitName) {
    const month = _month(monthIndex);
    return (month.numericTargets && month.numericTargets[habitName]) || null;
  }

  function setNumericEntry(monthIndex, habitName, day, value) {
    const month = _month(monthIndex);
    if (!month.numericEntries) month.numericEntries = {};
    if (!month.numericEntries[habitName]) month.numericEntries[habitName] = {};
    month.numericEntries[habitName][String(day)] = value;
    const target = getNumericTarget(monthIndex, habitName);
    if (target !== null) {
      _ensureEntries(month, habitName);
      const done = value >= target;
      const existing = month.entries[habitName][day];
      const ts = (existing && typeof existing === 'object' && existing.ts) ? existing.ts :
        (new Date().toISOString().slice(0, 19));
      month.entries[habitName][day] = { done, ts: done ? ts : undefined };
    }
    _save();
  }

  function getNumericEntry(monthIndex, habitName, day) {
    const month = _month(monthIndex);
    const val = month.numericEntries && month.numericEntries[habitName] &&
      (month.numericEntries[habitName][String(day)] !== undefined
        ? month.numericEntries[habitName][String(day)]
        : month.numericEntries[habitName][day]);
    return val !== undefined ? val : 0;
  }

  // ----------------------------------------------------------
  // Habit reminder mutations
  // ----------------------------------------------------------

  function setHabitReminder(monthIndex, habitName, time) {
    const month = _month(monthIndex);
    if (!month.habitReminders) month.habitReminders = {};
    if (time) month.habitReminders[habitName] = time;
    else delete month.habitReminders[habitName];
    _save();
  }

  function getHabitReminder(monthIndex, habitName) {
    const month = _month(monthIndex);
    return (month.habitReminders && month.habitReminders[habitName]) || null;
  }

  // ----------------------------------------------------------
  // Cross-month global streak
  // ----------------------------------------------------------

  /**
   * Compute the current consecutive-day streak for a habit across all months.
   * @param {string} habitName
   * @returns {number}
   */
  function globalHabitStreak(habitName) {
    const now = new Date();
    const isCurrentYear = _state.year === now.getFullYear();
    let mIdx = isCurrentYear ? now.getMonth() : 11;
    let streak = 0;
    let firstPass = true;

    while (mIdx >= 0) {
      const month = _state.months[mIdx];
      const daysInM = DAYS_IN_MONTH[mIdx];
      const entries = month.entries[habitName] || {};
      let startDay = firstPass
        ? (isCurrentYear && mIdx === now.getMonth() ? Math.min(now.getDate(), daysInM) : daysInM)
        : daysInM;

      if (firstPass && !_entryDone(entries[startDay]) && startDay > 1) {
        startDay--;
      }
      firstPass = false;

      let broke = false;
      for (let d = startDay; d >= 1; d--) {
        const e = entries[d] !== undefined ? entries[d] : entries[String(d)];
        if (_entryDone(e)) streak++;
        else { broke = true; break; }
      }
      if (broke) break;
      mIdx--;
    }
    return streak;
  }

  // ----------------------------------------------------------
  // Gamification badges
  // ----------------------------------------------------------

  /**
   * Check all badge conditions and award any newly-earned badges.
   * @returns {Array} Newly awarded badge objects (may be empty)
   */
  function checkAndAwardBadges() {
    if (!_state.earnedBadges) _state.earnedBadges = [];
    const awardedIds = new Set(_state.earnedBadges.map(b => b.id));
    const newBadges = [];
    const now = new Date().toISOString();

    function award(id) {
      if (!awardedIds.has(id)) {
        newBadges.push({ id, earnedAt: now });
        awardedIds.add(id);
      }
    }

    if (_state.months.some(m => m.habits.length > 0)) award('first-habit');
    if (_state.goals.length > 0) award('first-goal');
    if (_state.goals.some(g => g.status === 'Achieved')) award('goal-achieved');
    if (_state.months.some(m => m.habits.length >= 10)) award('habit-10');

    _state.months.forEach((m, mIdx) => {
      const daysInM = DAYS_IN_MONTH[mIdx];
      m.habits.forEach(h => {
        const gs = globalHabitStreak(h);
        if (gs >= 7)  award('streak-7');
        if (gs >= 30) award('streak-30');
        for (let d = 1; d <= daysInM; d++) {
          const e = m.entries[h] && (m.entries[h][d] !== undefined ? m.entries[h][d] : m.entries[h][String(d)]);
          if (e && typeof e === 'object' && e.done && e.ts) {
            const hour = parseInt(e.ts.slice(11, 13), 10);
            if (hour < 7) award('early-bird');
          }
        }
      });
      for (let d = 1; d <= daysInM; d++) {
        if (!m.habits.length) continue;
        const allDone = m.habits.every(h => {
          const e = m.entries[h] && (m.entries[h][d] !== undefined ? m.entries[h][d] : m.entries[h][String(d)]);
          return _entryDone(e);
        });
        if (allDone) { award('perfect-day'); break; }
      }
      const avg = monthlyDailyAvg(mIdx);
      if (avg >= 90 && m.habits.length > 0) award('consistency-90');
    });

    // perfect-week: all habits done for 7 consecutive days
    _state.months.forEach((m, mIdx) => {
      if (!m.habits.length) return;
      const daysInM = DAYS_IN_MONTH[mIdx];
      let run = 0;
      for (let d = 1; d <= daysInM; d++) {
        const allDone = m.habits.every(h => {
          const e = m.entries[h] && (m.entries[h][d] !== undefined ? m.entries[h][d] : m.entries[h][String(d)]);
          return _entryDone(e);
        });
        if (allDone) { run++; if (run >= 7) { award('perfect-week'); break; } }
        else run = 0;
      }
    });

    if (newBadges.length > 0) {
      _state.earnedBadges = [..._state.earnedBadges, ...newBadges];
      _save();
    }
    return newBadges;
  }

  function getEarnedBadges() {
    return _state.earnedBadges || [];
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  return {
    // State access
    getState,
    setState,
    getYear,
    changeYear,

    // Habit mutations
    addHabit,
    removeHabit,
    reorderHabit,
    toggleEntry,
    copyHabitsFromMonth,
    pinHabit,
    unpinHabit,
    setHabitTag,
    setHabitFrequency,
    setDayNote,
    archiveMonth,
    unarchiveMonth,
    habitStreak,
    bestStreak,
    linkHabitToGoal,
    unlinkHabitFromGoal,

    // Templates
    saveTemplate,
    getTemplates,
    applyTemplate,
    deleteTemplate,

    // Weekly reviews
    setWeeklyReview,

    // Monthly habit mutations
    addMonthlyHabit,
    removeMonthlyHabit,
    toggleMonthlyHabit,
    setMonthlyHabitNotes,
    setMonthlyNotes,

    // Goal mutations
    addGoal,
    removeGoal,
    toggleStep,
    updateGoalStatus,
    addStep,
    removeStep,

    // Time-tracking mutations
    setManualTimestamp,
    setHabitCategory,
    getHabitCategory,
    setPredictionWindow,
    setOnTimeThreshold,
    setPositiveReinforcement,
    dismissSuggestion,

    // Computed getters
    dailyProgress,
    dailySummary,
    weeklyPartition,
    weeklyProgress,
    monthlySummary,
    perHabitStats,
    consistencyRank,
    monthlyDailyAvg,
    yearToDateAvg,
    goalProgress,
    isOverdue,

    // Color
    setHabitColor,
    getHabitColor,

    // Mood
    setMoodEntry,
    getMoodEntry,

    // Numeric habits
    setNumericTarget,
    getNumericTarget,
    setNumericEntry,
    getNumericEntry,

    // Reminders
    setHabitReminder,
    getHabitReminder,

    // Cross-month streak
    globalHabitStreak,

    // Badges
    checkAndAwardBadges,
    getEarnedBadges,

    // Exposed constants
    DAYS_IN_MONTH,
    MONTH_NAMES,
    LIFE_AREAS,
    HABIT_TAGS,
    HABIT_CATEGORIES,
    CATEGORY_WINDOWS,
    SUGGESTED_HABITS,
    MOOD_EMOJIS,
    BADGE_DEFS,
    generateId,
    createSeedState
  };
})();
