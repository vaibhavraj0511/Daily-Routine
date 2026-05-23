/**
 * schedule.js — Pure prediction engine for Smart Time Tracking.
 *
 * All functions are stateless and have no DOM or AppState dependencies.
 * They take plain data arguments and return plain values, making them
 * straightforward to test in isolation.
 *
 * Load order: after router.js, before render.js.
 */
'use strict';

// ============================================================
// Time conversion utilities
// ============================================================

/**
 * Convert an "HH:MM" or "HH:MM:SS" string to integer minutes since midnight.
 * Returns NaN for malformed input.
 * @param {string} timeStr
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return NaN;
  const parts = timeStr.split(':');
  if (parts.length < 2) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * Convert integer minutes since midnight to a zero-padded "HH:MM" string.
 * Wraps around midnight (e.g. 1500 → "01:00" after mod 1440).
 * @param {number} minutes
 * @returns {string}
 */
function minutesToTime(minutes) {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/**
 * Extract the "HH:MM:SS" time portion from an ISO 8601 local datetime string.
 * e.g. "2025-07-14T06:03:00" → "06:03:00"
 * Returns empty string for malformed input.
 * @param {string} isoStr
 * @returns {string}
 */
function extractTime(isoStr) {
  if (typeof isoStr !== 'string') return '';
  const tIdx = isoStr.indexOf('T');
  if (tIdx === -1) return '';
  return isoStr.slice(tIdx + 1);
}

// ============================================================
// Rolling average prediction
// ============================================================

/**
 * Compute the rolling average predicted time from an array of ISO 8601 timestamps.
 * Uses only the last `window` entries. Returns null if fewer than 3 valid values.
 *
 * @param {string[]} timestamps  ISO 8601 timestamps, oldest-first.
 * @param {number}   window      How many recent entries to use (3–5).
 * @returns {string|null}        "HH:MM" predicted time, or null.
 */
function computeRollingAverage(timestamps, window) {
  if (!Array.isArray(timestamps) || timestamps.length === 0) return null;

  // Take only the most recent `window` entries
  const recent = timestamps.slice(-window);

  // Convert to minutes, skip NaN
  const minuteValues = recent
    .map(ts => timeToMinutes(extractTime(ts)))
    .filter(m => !isNaN(m));

  if (minuteValues.length < 3) return null;

  const mean = minuteValues.reduce((sum, v) => sum + v, 0) / minuteValues.length;
  return minutesToTime(Math.round(mean));
}

/**
 * Collect the N most recent completion timestamps for a habit across all months,
 * scanning in reverse chronological order (Dec → Jan). Returns oldest-first.
 *
 * Reads entries using the _entryDone-compatible shape: entry.ts for new format,
 * skips legacy boolean entries (no timestamp available).
 *
 * @param {object} state       Full AppState object
 * @param {string} habitName
 * @param {number} window      Max number of timestamps to collect (3–5)
 * @returns {string[]}         Array of ISO 8601 timestamp strings, oldest-first
 */
function getRecentTimestamps(state, habitName, window) {
  const collected = [];

  // Scan months newest → oldest
  for (let mIdx = 11; mIdx >= 0 && collected.length < window; mIdx--) {
    const month = state.months[mIdx];
    if (!month || !month.entries || !month.entries[habitName]) continue;

    const habitEntries = month.entries[habitName];
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mIdx];

    // Scan days newest → oldest within the month
    // Use String(d) because JSON serialization converts numeric keys to strings
    for (let d = daysInMonth; d >= 1 && collected.length < window; d--) {
      // Try both numeric key and string key (JSON round-trip converts to string)
      const entry = habitEntries[d] !== undefined ? habitEntries[d] : habitEntries[String(d)];
      if (!entry || typeof entry === 'boolean') continue; // legacy or missing
      if (entry.done === true && typeof entry.ts === 'string' && entry.ts.length > 0) {
        collected.push(entry.ts);
      }
    }
  }

  // Reverse so result is oldest-first
  return collected.reverse();
}

/**
 * Return the predicted completion time for a habit, or null if insufficient data.
 * Uses state.predictionWindow (default 5).
 *
 * @param {object} state       Full AppState object
 * @param {string} habitName
 * @returns {string|null}      "HH:MM" or null
 */
function getPredictedTime(state, habitName) {
  const window = (state && state.predictionWindow) || 5;
  const timestamps = getRecentTimestamps(state, habitName, window);
  return computeRollingAverage(timestamps, window);
}

/**
 * Return how many more timestamps are needed before a prediction is available.
 * Returns 0 if prediction is already available.
 * @param {object} state
 * @param {string} habitName
 * @returns {number} 0–3
 */
function getPredictionProgress(state, habitName) {
  const window = (state && state.predictionWindow) || 5;
  const timestamps = getRecentTimestamps(state, habitName, window);
  if (timestamps.length >= 3) return 0;
  return 3 - timestamps.length;
}

// ============================================================
// On-time detection
// ============================================================

/**
 * Determine whether a completion timestamp falls within ±thresholdMins of
 * the predicted time. Handles midnight-crossing correctly.
 *
 * @param {string} completionTs   ISO 8601 timestamp  e.g. "2025-07-14T06:03:00"
 * @param {string} predictedTime  "HH:MM"
 * @param {number} thresholdMins  Tolerance in minutes (default 15)
 * @returns {boolean}
 */
function isOnTime(completionTs, predictedTime, thresholdMins) {
  if (typeof thresholdMins !== 'number') thresholdMins = 15;
  const completionMins = timeToMinutes(extractTime(completionTs));
  const predictedMins  = timeToMinutes(predictedTime);
  if (isNaN(completionMins) || isNaN(predictedMins)) return false;

  // Check direct difference and both midnight-crossing directions
  const diff1 = Math.abs(completionMins - predictedMins);
  const diff2 = Math.abs((completionMins + 1440) - predictedMins);
  const diff3 = Math.abs(completionMins - (predictedMins + 1440));
  return Math.min(diff1, diff2, diff3) <= thresholdMins;
}

// ============================================================
// Optimization suggestions
// ============================================================

/**
 * Return the [startMin, endMin] window for a given habit category.
 * Falls back to [0, 1439] (entire day) for unknown categories.
 *
 * @param {string} category
 * @returns {[number, number]}
 */
function categoryWindow(category) {
  // Mirror of CATEGORY_WINDOWS in state.js — kept here so schedule.js is self-contained
  const windows = {
    morning:      [5 * 60,  11 * 60 + 59],
    afternoon:    [12 * 60, 16 * 60 + 59],
    evening:      [17 * 60, 21 * 60 + 59],
    'peak-focus': [6 * 60,  10 * 60],
    anytime:      [0,       23 * 60 + 59]
  };
  return windows[category] || [0, 1439];
}

/**
 * Evaluate whether an optimization suggestion should be shown for a habit.
 *
 * Returns true when ALL of:
 *   - category is not "anytime"
 *   - at least 5 timestamps are provided
 *   - 3 or more of the last 5 timestamps fall outside the category window
 *   - the suggestion has not been dismissed (or the rolling avg has shifted >30 min)
 *
 * @param {string[]} timestamps          Recent timestamps, oldest-first
 * @param {string}   category            Habit_Category value
 * @param {object}   [dismissedEntry]    dismissedSuggestions[habitName] or undefined
 * @returns {boolean}
 */
function shouldSuggest(timestamps, category, dismissedEntry) {
  if (category === 'anytime') return false;
  if (!Array.isArray(timestamps) || timestamps.length < 5) return false;

  // Check dismissal suppression
  if (dismissedEntry && typeof dismissedEntry.avgAtDismissal === 'number') {
    const currentAvgTs = computeRollingAverage(timestamps, Math.min(timestamps.length, 5));
    if (currentAvgTs !== null) {
      const currentMins = timeToMinutes(currentAvgTs);
      if (!isNaN(currentMins)) {
        const shift = Math.abs(currentMins - dismissedEntry.avgAtDismissal);
        // Also check midnight-crossing shift
        const shiftWrap = Math.abs(currentMins + 1440 - dismissedEntry.avgAtDismissal);
        if (Math.min(shift, shiftWrap) <= 30) return false;
      }
    }
  }

  const [winStart, winEnd] = categoryWindow(category);
  const last5 = timestamps.slice(-5);
  let outsideCount = 0;

  for (const ts of last5) {
    const mins = timeToMinutes(extractTime(ts));
    if (isNaN(mins)) continue;
    if (mins < winStart || mins > winEnd) outsideCount++;
  }

  return outsideCount >= 3;
}

// ============================================================
// Schedule accuracy
// ============================================================

/**
 * Compute per-habit schedule accuracy for a month.
 * For each habit, counts days where both a completion timestamp and a
 * predicted time exist, then calculates the on-time percentage.
 *
 * @param {object} monthData     MonthData object
 * @param {object} state         Full AppState (used to compute predictions)
 * @param {number} thresholdMins On_Time_Threshold in minutes
 * @returns {Array<{ name: string, accuracy: number|null, onTime: number, total: number }>}
 */
function computeScheduleAccuracy(monthData, state, thresholdMins) {
  if (!monthData || !monthData.habits) return [];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthData.monthIndex] || 31;

  return monthData.habits.map(habitName => {
    const predictedTime = getPredictedTime(state, habitName);
    if (!predictedTime) return { name: habitName, accuracy: null, onTime: 0, total: 0 };

    const habitEntries = (monthData.entries && monthData.entries[habitName]) || {};
    let onTime = 0;
    let total  = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      // Handle both numeric and string keys (JSON round-trip converts to string)
      const entry = habitEntries[d] !== undefined ? habitEntries[d] : habitEntries[String(d)];
      if (!entry || typeof entry === 'boolean') continue;
      if (entry.done !== true || typeof entry.ts !== 'string') continue;
      total++;
      if (isOnTime(entry.ts, predictedTime, thresholdMins)) onTime++;
    }

    const accuracy = total >= 3 ? Math.round((onTime / total) * 100) : null;
    return { name: habitName, accuracy, onTime, total };
  });
}

/**
 * Compute the overall (mean) schedule accuracy for a month.
 * Only habits with accuracy !== null are included.
 * Returns null if no habits have sufficient data.
 *
 * @param {Array<{ accuracy: number|null }>} perHabitAccuracy
 * @returns {number|null}
 */
function computeOverallAccuracy(perHabitAccuracy) {
  if (!Array.isArray(perHabitAccuracy)) return null;
  const valid = perHabitAccuracy.filter(h => h.accuracy !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, h) => acc + h.accuracy, 0);
  return Math.round(sum / valid.length);
}
