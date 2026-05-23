# Implementation Plan: Smart Time Tracking
# Implementation Plan: Smart Time Tracking

## Overview

Extend the Daily Habit Portal with completion-time recording, rolling-average schedule prediction, a Schedule View, positive reinforcement toasts, manual time override, habit category metadata, optimization suggestions, and schedule accuracy statistics. All changes are additive and backward-compatible with the existing vanilla JS / no-build-step architecture.

Implementation follows the dependency order: data model first, then the pure prediction engine, then HTML/routing scaffolding, then render functions, then CSS, and finally backward-compatibility fixes across existing render code.

## Tasks

- [x] 1. Extend state.js — data model, constants, and new mutations
  - [x] 1.1 Add `HABIT_CATEGORIES` and `CATEGORY_WINDOWS` constants after the existing `HABIT_TAGS` constant
    - `HABIT_CATEGORIES = ['anytime', 'morning', 'afternoon', 'evening', 'peak-focus']`
    - `CATEGORY_WINDOWS` maps each category to `[startMin, endMin]` per the design
    - _Requirements: 6.1_

  - [x] 1.2 Add `_entryDone(entry)` helper inside the `AppState` IIFE (private, not exported)
    - Returns `false` for `null`/`undefined`
    - Returns the boolean directly for legacy boolean entries
    - Returns `entry.done === true` for new object entries
    - _Requirements: 9.5_

  - [ ]* 1.3 Write property test for `_entryDone` backward compatibility (Property 10)
    - **Property 10: Backward compatibility — legacy boolean entries load without error**
    - **Validates: Requirements 9.5**
    - Use `fc.boolean()` for legacy entries and `fc.record({done: fc.boolean()})` for new entries
    - Assert `_entryDone` returns the correct boolean for both shapes

  - [x] 1.4 Extend `createMonthData` to include new fields with defaults
    - Add `habitCategories: {}` — `{ [habitName]: string }`
    - Add `dismissedSuggestions: {}` — `{ [habitName]: { dismissedAt, avgAtDismissal } }`
    - _Requirements: 6.3, 7.5, 9.2_

  - [x] 1.5 Add root-level defaults to `createSeedState`
    - `predictionWindow: 5`
    - `onTimeThreshold: 15`
    - `positiveReinforcement: true`
    - _Requirements: 2.1, 4.1, 8.2_

  - [x] 1.6 Extend `setState` migration guard for new fields
    - For each month: initialize `habitCategories` and `dismissedSuggestions` if absent
    - For root state: initialize `predictionWindow`, `onTimeThreshold`, `positiveReinforcement` if absent
    - Migrate legacy boolean entries: if `typeof entry === 'boolean'`, convert to `{ done: entry }`
    - _Requirements: 9.5_

  - [x] 1.7 Extend `toggleEntry` to store `{ done, ts }` objects
    - When toggling to complete: store `{ done: true, ts: new Date().toISOString().slice(0,19) }`
    - When toggling to incomplete: store `{ done: false }` (no `ts` field)
    - Use `_entryDone` to read the current state before toggling
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.8 Write property test for `toggleEntry` timestamp recording (Properties 1 and 2)
    - **Property 1: Toggle-complete records a valid ISO 8601 timestamp**
    - **Property 2: Toggle-incomplete removes the timestamp**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Assert `entry.ts` matches `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/` after toggle-on
    - Assert `entry.ts` is absent after toggle-off

  - [x] 1.9 Add `setManualTimestamp(monthIndex, habitName, day, isoTimestamp)` mutation
    - Validate `isoTimestamp` against `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/`; return `{ ok: false, error }` if invalid
    - Store `{ done: true, ts: isoTimestamp }` and call `_save()`
    - _Requirements: 5.4, 5.5_

  - [ ]* 1.10 Write property test for `setManualTimestamp` (Property 14)
    - **Property 14: Manual override stores the selected time and marks complete**
    - **Validates: Requirements 5.4, 5.5**
    - Use `fc.string()` matching the ISO pattern; assert `done === true` and `ts === T`

  - [x] 1.11 Add `setHabitCategory(monthIndex, habitName, category)` mutation
    - Validate `category` is in `HABIT_CATEGORIES`; return `{ ok: false, error }` if not
    - Store in `month.habitCategories[habitName]` and call `_save()`
    - _Requirements: 6.2, 6.4_

  - [x] 1.12 Add `getHabitCategory(monthIndex, habitName)` getter
    - Return `month.habitCategories[habitName]` if set, otherwise `"anytime"`
    - _Requirements: 6.3_

  - [ ]* 1.13 Write property test for `getHabitCategory` default (Property 13)
    - **Property 13: Habit category default**
    - **Validates: Requirements 6.3**
    - Use `fc.string()` for habit names not present in `habitCategories`; assert return value is `"anytime"`

  - [x] 1.14 Add `setPredictionWindow(n)` mutation
    - Validate `n` is in `{3, 4, 5}`; return `{ ok: false, error: 'Prediction window must be 3, 4, or 5 days.' }` otherwise
    - Store in `_state.predictionWindow` and call `_save()`
    - _Requirements: 8.1, 8.5_

  - [ ]* 1.15 Write property test for `setPredictionWindow` validation (Property 9)
    - **Property 9: Prediction window validation**
    - **Validates: Requirements 8.1, 8.5**
    - Use `fc.integer({min: -100, max: 100})`; assert `ok: true` iff `n ∈ {3,4,5}`, state unchanged otherwise

  - [x] 1.16 Add `setOnTimeThreshold(minutes)` and `setPositiveReinforcement(enabled)` mutations
    - `setOnTimeThreshold`: store positive number in `_state.onTimeThreshold`, call `_save()`
    - `setPositiveReinforcement`: store boolean in `_state.positiveReinforcement`, call `_save()`
    - _Requirements: 4.5, 8.1_

  - [x] 1.17 Add `dismissSuggestion(monthIndex, habitName, rollingAvgMinutes)` mutation
    - Store `{ dismissedAt: new Date().toISOString(), avgAtDismissal: rollingAvgMinutes }` in `month.dismissedSuggestions[habitName]`
    - Call `_save()`
    - _Requirements: 7.5_

  - [x] 1.18 Export all new public methods from the `AppState` return object
    - Add: `setManualTimestamp`, `setHabitCategory`, `getHabitCategory`, `setPredictionWindow`, `setOnTimeThreshold`, `setPositiveReinforcement`, `dismissSuggestion`
    - Add: `HABIT_CATEGORIES`, `CATEGORY_WINDOWS` to exposed constants
    - _Requirements: all state-related_

- [x] 2. Create js/schedule.js — pure prediction engine
  - [x] 2.1 Implement time conversion utilities: `timeToMinutes`, `minutesToTime`, `extractTime`
    - `timeToMinutes(timeStr)`: parse `HH:MM` or `HH:MM:SS` → integer minutes; return `NaN` on malformed input
    - `minutesToTime(minutes)`: integer minutes → `"HH:MM"` zero-padded string
    - `extractTime(isoStr)`: return the `HH:MM:SS` portion of an ISO 8601 string
    - _Requirements: 2.3_

  - [x] 2.2 Implement `computeRollingAverage(timestamps, window)`
    - Use only the last `window` entries from the array
    - Convert each to minutes via `timeToMinutes(extractTime(ts))`, skip `NaN` values
    - Return `null` if fewer than 3 valid values remain; otherwise return `minutesToTime(Math.round(mean))`
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 2.3 Write property test for `computeRollingAverage` formula (Property 3)
    - **Property 3: Rolling average formula correctness**
    - **Validates: Requirements 2.1, 2.3**
    - Generate arrays of 3–5 integers in `[0, 1439]`, convert to `HH:MM` strings
    - Assert result equals `minutesToTime(Math.round(mean(inputs)))`

  - [x] 2.4 Implement `getRecentTimestamps(state, habitName, window)`
    - Scan all months in `state.months` in reverse chronological order (month 11 → 0)
    - Collect entries where `_entryDone(entry) === true` and `entry.ts` is a non-empty string
    - Stop once `window` timestamps are collected; return oldest-first
    - _Requirements: 2.1, 2.4_

  - [x] 2.5 Implement `getPredictedTime(state, habitName)`
    - Call `getRecentTimestamps(state, habitName, state.predictionWindow)`
    - Return `computeRollingAverage(timestamps, state.predictionWindow)` (null if insufficient data)
    - _Requirements: 2.1, 2.2, 2.6_

  - [ ]* 2.6 Write property test for `getPredictedTime` window control (Property 4)
    - **Property 4: Prediction window controls which timestamps are used**
    - **Validates: Requirements 2.1, 2.2, 2.6**
    - For habits with > 5 days of data and window W ∈ {3,4,5}, assert result equals `computeRollingAverage` on exactly the W most recent timestamps
    - Assert `null` when fewer than 3 timestamps exist

  - [x] 2.7 Implement `isOnTime(completionTs, predictedTime, thresholdMins)`
    - Convert both to minutes; return `Math.abs(completionMins - predictedMins) <= thresholdMins`
    - Handle midnight-crossing: also check `Math.abs((completionMins + 1440) - predictedMins)` and `Math.abs(completionMins - (predictedMins + 1440))`
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 2.8 Write property test for `isOnTime` symmetry (Property 5)
    - **Property 5: On-time detection is symmetric around the threshold**
    - **Validates: Requirements 4.1, 4.2, 4.4**
    - Use `fc.integer({min:0, max:1439})` for predicted time and offset within/outside threshold
    - Assert `isOnTime` returns `true` iff `|C - P| <= threshold` (accounting for midnight wrap)

  - [x] 2.9 Implement `categoryWindow(category)` and `shouldSuggest(timestamps, category, dismissedSuggestions)`
    - `categoryWindow`: look up `CATEGORY_WINDOWS[category]`; return `[0, 1439]` for unknown categories
    - `shouldSuggest`: return `false` if category is `"anytime"` or fewer than 5 timestamps
    - Check if `dismissedSuggestions` entry exists and current rolling avg is within 30 min of `avgAtDismissal`; if so return `false`
    - Count how many of the last 5 timestamps fall outside `categoryWindow`; return `true` if ≥ 3
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [ ]* 2.10 Write property test for `shouldSuggest` trigger logic (Property 7)
    - **Property 7: Suggestion trigger logic**
    - **Validates: Requirements 7.1, 7.2, 7.6**
    - Use `fc.array(fc.integer({min:0, max:1439}), {minLength:5, maxLength:20})` + category
    - Assert `shouldSuggest` returns `true` iff category ≠ `"anytime"` and ≥ 3 of last 5 fall outside window

  - [x] 2.11 Implement `computeScheduleAccuracy(monthData, state, thresholdMins)` and `computeOverallAccuracy(perHabitAccuracy)`
    - For each habit in `monthData.habits`, collect days where both `entry.ts` and a predicted time exist
    - Count on-time days; return `null` if fewer than 3 qualifying days, otherwise `Math.round((onTime / total) * 100)`
    - `computeOverallAccuracy`: mean of non-null accuracy values; return `null` if none
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 2.12 Write property test for `computeScheduleAccuracy` formula (Property 12)
    - **Property 12: Schedule accuracy computation**
    - **Validates: Requirements 10.1, 10.2**
    - Use `fc.array(fc.record({onTime: fc.boolean()}), {minLength:0, maxLength:30})`
    - Assert result equals `Math.round((K / (K+M)) * 100)` when K+M ≥ 3, else `null`

  - [x] 2.13 Checkpoint — verify schedule.js pure functions
    - Ensure all functions are exported as globals on `window` (or accessible without module system)
    - Ensure all functions handle edge cases (empty arrays, null inputs) without throwing
    - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Wire up index.html and router.js
  - [x] 3.1 Add `<div id="view-schedule" class="view hidden"></div>` inside `<main id="app">` in `index.html`
    - Place it after the existing `#view-goals` div
    - _Requirements: 3.1_

  - [x] 3.2 Add the Schedule nav link in the sidebar in `index.html`
    - Insert after the Goals nav link, inside the "Tracker" nav section
    - `<a href="#schedule" class="nav-link" data-route="schedule"><span class="nav-icon">🕐</span><span class="nav-text">Schedule</span></a>`
    - _Requirements: 3.1_

  - [x] 3.3 Add `<script src="js/schedule.js"></script>` to `index.html` between `router.js` and `render.js`
    - _Requirements: architecture_

  - [x] 3.4 Add `'schedule'` route to `_parseHash` in `router.js`
    - Add `if (hash === 'schedule') return { type: 'schedule' };` before the month match
    - _Requirements: 3.1_

- [x] 4. Implement `renderScheduleView` in render.js
  - [x] 4.1 Add `'view-schedule'` to the `_showView` helper's view list
    - _Requirements: 3.1_

  - [x] 4.2 Implement the header and settings row of `renderScheduleView(state)`
    - Header: "Today's Schedule" + formatted current date
    - Settings row: `<select>` for prediction window (options 3/4/5, wired to `setPredictionWindow`), on-time threshold display (read-only label showing current value), positive reinforcement toggle checkbox wired to `setPositiveReinforcement`
    - Each settings control must have an associated `<label>` for accessibility
    - _Requirements: 3.2, 8.1, 8.3, 4.5_

  - [x] 4.3 Implement the habit list section of `renderScheduleView`
    - Fetch predicted time for each habit via `getPredictedTime(state, habitName)`
    - Sort habits: non-null predicted times ascending by `timeToMinutes`, nulls last
    - Each row: habit name + category badge (from `getHabitCategory`) + predicted time or "No prediction yet" + completion checkbox wired to `toggleEntry` + clock icon button (opens `renderTimeEntryUI`)
    - Clock icon button must have `aria-label="Set time for [habitName]"`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.1_

  - [ ]* 4.4 Write property test for schedule sort order (Property 6)
    - **Property 6: Schedule sort order — predicted times ascending, nulls last**
    - **Validates: Requirements 3.4**
    - Use `fc.array(fc.option(fc.string()))` of predicted times
    - Assert all non-null times appear before nulls and non-null entries are ordered ascending by `timeToMinutes`

  - [x] 4.5 Implement the Suggestions section of `renderScheduleView`
    - Only render the section when at least one habit returns `shouldSuggest(...) === true`
    - Section uses `role="region"` and `aria-label="Optimization Suggestions"`
    - Each suggestion row: habit name, observed average time, recommended category window, Dismiss button wired to `dismissSuggestion`
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 4.6 Wire `renderView` in render.js to call `renderScheduleView` for the `'schedule'` route
    - Add `case 'schedule': renderScheduleView(AppState.getState()); break;` to the `renderView` switch
    - _Requirements: 3.1_

- [x] 5. Implement `renderTimeEntryUI` in render.js
  - [x] 5.1 Build the modal overlay structure for `renderTimeEntryUI(habitName, day, monthIndex, currentTs, onConfirm, onCancel)`
    - Create a full-screen backdrop `div` with class `time-entry-backdrop`
    - Inner modal `div` with heading showing the habit name
    - _Requirements: 5.2_

  - [x] 5.2 Implement the scroll-wheel picker (hour and minute `<select>` elements)
    - Hour `<select>`: options 00–23; minute `<select>`: options 00–59 (zero-padded)
    - Each `<select>` must have an associated `<label>` (`"Hour"` / `"Minute"`)
    - Pre-fill from `currentTs` if provided
    - _Requirements: 5.2, 5.3_

  - [x] 5.3 Implement the quick-select grid (37 buttons, 05:00–23:00 every 30 min)
    - Generate buttons programmatically: start at 05:00, step +30 min, end at 23:00
    - Clicking a quick-select button pre-fills the scroll-wheel selects AND immediately calls `onConfirm` with the selected ISO timestamp (1 interaction)
    - _Requirements: 5.3_

  - [x] 5.4 Add Confirm and Cancel buttons; wire to `onConfirm` / `onCancel` callbacks
    - Confirm: build ISO timestamp from current select values, call `setManualTimestamp`, then `onConfirm`
    - Cancel: call `onCancel`, remove modal from DOM
    - _Requirements: 5.4, 5.5, 5.6_

  - [x] 5.5 Wire the clock icon in the daily grid (`renderDailyGrid`) to open `renderTimeEntryUI`
    - Add a clock icon button to each habit-day cell (or the habit row hover overlay)
    - On click: open `renderTimeEntryUI` for that habit/day/monthIndex; on confirm re-render the view
    - _Requirements: 5.1_

- [x] 6. Implement `renderStatsAccuracy` in render.js
  - [x] 6.1 Build the per-habit accuracy table
    - Columns: habit name | on-time days | total days | accuracy %
    - Call `computeScheduleAccuracy(monthData, state, state.onTimeThreshold)` for data
    - Show "Insufficient data" for habits where accuracy is `null`
    - _Requirements: 10.1, 10.2_

  - [x] 6.2 Add the overall accuracy row and section heading
    - Section heading: "⏱ Schedule Accuracy"
    - Overall row: call `computeOverallAccuracy(perHabitAccuracy)`; show "Insufficient data" if `null`
    - _Requirements: 10.3_

  - [x] 6.3 Append `renderStatsAccuracy` to the Statistics tab panel in `renderMonthView`
    - Call `renderStatsAccuracy(monthIndex, tabStatsEl)` after existing stats content is rendered
    - _Requirements: 10.1_

- [x] 7. Add habit category selector to the daily grid
  - [x] 7.1 Add a category `<select>` to the habit-meta hover overlay in `renderDailyGrid`
    - Populate options from `HABIT_CATEGORIES`
    - Set current value from `getHabitCategory(monthIndex, habitName)`
    - Wire `change` event to `setHabitCategory(monthIndex, habitName, value)` then re-render
    - Add `<label>` for accessibility
    - _Requirements: 6.2, 6.4_

- [x] 8. Implement positive reinforcement toast in the toggleEntry flow
  - [x] 8.1 After `toggleEntry` marks a habit complete, check for on-time completion
    - In the click handler that calls `toggleEntry` (in `renderDailyGrid` and `renderScheduleView`), after the call:
    - Get `predictedTime = getPredictedTime(state, habitName)`
    - Get the new entry's `ts` from `state.months[monthIndex].entries[habitName][day]`
    - If `predictedTime` exists and `state.positiveReinforcement === true`, call `isOnTime(ts, predictedTime, state.onTimeThreshold)`
    - If on-time, call `showToast('🎯 On time! Great job with ' + habitName)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Add CSS to css/styles.css
  - [x] 9.1 Add Schedule view layout styles
    - `.view-schedule-header`, `.schedule-settings-row`, `.schedule-habit-list`, `.schedule-habit-row`
    - Category badge styles: `.category-badge` with color variants per category (`morning`, `afternoon`, `evening`, `peak-focus`, `anytime`)
    - _Requirements: 3.1, 6.1_

  - [x] 9.2 Add time entry modal styles
    - `.time-entry-backdrop` (full-screen overlay, semi-transparent)
    - `.time-entry-modal` (centered card)
    - `.time-picker-row` (flex row for hour/minute selects styled as drum-roll via `scroll-snap`)
    - `.quick-select-grid` (CSS grid, wrapping buttons)
    - `.quick-select-btn` (compact button style)
    - _Requirements: 5.2, 5.3_

  - [x] 9.3 Add suggestions section styles and schedule accuracy table styles
    - `.suggestions-section` (distinct background, border)
    - `.suggestion-row` (flex row with dismiss button)
    - `.schedule-accuracy-table` (matches existing stats table style)
    - _Requirements: 7.4, 10.1_

- [x] 10. Backward compatibility — update existing render functions
  - [x] 10.1 Audit all places in render.js that read `month.entries[h][d]` directly
    - Replace every direct boolean comparison (`=== true`, `!== true`, `=== false`) with `_entryDone(month.entries[h][d])`
    - Affected functions include: `renderDailyGrid`, `dailyProgress`, `dailySummary`, `perHabitStats`, `weeklyProgress`, `habitStreak`, `bestStreak`, and any other computed getters in state.js that read entries
    - _Requirements: 9.5_

  - [x] 10.2 Update `habitStreak` and `bestStreak` in state.js to use `_entryDone`
    - Replace `entries[d] === true` with `_entryDone(entries[d])` in both functions
    - _Requirements: 9.5_

  - [x] 10.3 Update `dailyProgress`, `dailySummary`, `perHabitStats`, `weeklyProgress` in state.js to use `_entryDone`
    - Replace all `month.entries[habit][day] === true` checks with `_entryDone(month.entries[habit][day])`
    - _Requirements: 9.5_

  - [ ]* 10.4 Write property test for export/import round-trip (Property 11)
    - **Property 11: Export/import round-trip preserves all time-tracking data**
    - **Validates: Requirements 9.3, 9.2**
    - Use `fc.record(...)` with timestamp arrays; serialize to JSON and back via `JSON.stringify`/`JSON.parse` + `setState`
    - Assert every timestamp, category, window value, and dismissal record is identical after round-trip

- [x] 11. Final checkpoint — integration and wiring
  - [x] 11.1 Verify the full feature is wired end-to-end
    - Navigate to `#schedule` and confirm `view-schedule` is visible and `view-dashboard` is hidden
    - Toggle a habit complete in the daily grid; confirm `entry.ts` is set in state
    - Open the time entry modal; confirm 37 quick-select buttons are present (05:00–23:00 every 30 min)
    - Confirm the Statistics tab shows the "⏱ Schedule Accuracy" section
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Properties 1–14 from the design document are covered by the `*` sub-tasks
- The `_entryDone` helper is the single point of backward compatibility — all entry reads must go through it
- `schedule.js` functions are pure and have no DOM or state dependencies, making them independently testable
- The quick-select grid (37 buttons) satisfies the "no more than 2 interactions" requirement for Manual_Override
