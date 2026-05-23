# Implementation Plan: Daily Habit Portal

## Overview

Vanilla HTML/CSS/JS SPA with no build step. Modules: `state.js`, `storage.js`, `render.js`, `router.js`, `export.js`, `import.js`, `main.js`. All state persisted to `localStorage`. Views: Year Overview, Monthly Detail (4 tabs), Goal Tracker.

## Tasks

- [x] 1. Project scaffold and data models
  - Create `index.html` with nav bar, view containers, and `<script>` imports for all modules
  - Create `css/styles.css` with base layout, grid styles, tab styles, and badge/status styles
  - Create `js/state.js` defining the `AppState` singleton with the full schema (version, months, goals) and seed data (January with 12 habits, Feb–Dec with 3 habits)
  - Define `DAYS_IN_MONTH` constant and all computed getters: `dailyProgress`, `weeklyProgress`, `monthlyDailyAvg`, `goalProgress`, `yearToDateAvg`, `consistencyRank`, `dailySummary`, `weeklyPartition`, `monthlySummary`
  - _Requirements: 1.1, 1.5, 2.3, 2.4, 3.1, 4.1, 5.3, 6.1, 6.2, 8.3_

- [x] 2. Persistence layer
  - [x] 2.1 Implement `js/storage.js` with `loadState()` and `saveState(appState)` using `localStorage`, including schema version check and error handling (toast on quota exceeded)
    - `loadState` returns parsed state or `null` if absent/corrupt
    - `saveState` wraps `JSON.stringify` in try/catch and emits a toast on failure
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 2.2 Write property test for state serialization round-trip
    - **Property 18: State serialization round-trip**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ]* 2.3 Write unit tests for `storage.js`
    - Test `loadState` with missing key, corrupt JSON, and valid data
    - Test `saveState` error path (mock `localStorage.setItem` to throw)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 3. AppState mutation methods and computed values
  - [x] 3.1 Implement habit management mutations in `state.js`: `addHabit(monthIndex, name)`, `removeHabit(monthIndex, name)`, `toggleEntry(monthIndex, habitName, day)`
    - `addHabit` rejects empty/whitespace names and duplicates within the month (inline error)
    - `removeHabit` deletes the habit name and all its `entries` keys
    - `toggleEntry` flips the boolean and calls `saveState`
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 9.1_

  - [ ]* 3.2 Write property test for habit addition round-trip
    - **Property 1: Habit addition round-trip**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 3.3 Write property test for habit removal clears all entries
    - **Property 2: Habit removal clears all entries**
    - **Validates: Requirements 1.4**

  - [ ]* 3.4 Write property test for month habit isolation
    - **Property 3: Month habit isolation**
    - **Validates: Requirements 1.5**

  - [x] 3.5 Implement computed getters: `dailyProgress(monthIndex, day)`, `dailySummary(monthIndex, day)`, `weeklyPartition(monthIndex)`, `weeklyProgress(monthIndex, weekKey)`
    - `dailyProgress` returns `Math.round(completed / total * 100)`, 0 when no habits
    - `dailySummary` returns `{ percentComplete, completedCount, incompleteCount, goalMet }`
    - `weeklyPartition` maps days 1–7→week1, 8–14→week2, 15–21→week3, 22–28→week4, 29+→week5
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2_

  - [ ]* 3.6 Write property test for daily progress formula
    - **Property 4: Daily progress formula**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.7 Write property test for daily summary completeness and goal-met invariant
    - **Property 6: Daily summary completeness and goal-met invariant**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 3.8 Write property test for weekly partition covers all days
    - **Property 7: Weekly partition covers all days**
    - **Validates: Requirements 4.1**

  - [ ]* 3.9 Write property test for weekly summary formula consistency
    - **Property 8: Weekly summary formula consistency**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 3.10 Implement remaining computed getters: `monthlySummary(monthIndex)`, `perHabitStats(monthIndex)`, `consistencyRank(monthIndex)`, `monthlyDailyAvg(monthIndex)`, `yearToDateAvg()`
    - `monthlySummary` returns `{ total, completed, incomplete, percentage }` from `monthlyHabits`
    - `consistencyRank` sorts by `daysCompleted` desc then name asc, returns top 10
    - `yearToDateAvg` is mean of `monthlyDailyAvg` across months with data
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 8.3_

  - [ ]* 3.11 Write property test for monthly summary formula consistency
    - **Property 9: Monthly summary formula consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 3.12 Write property test for per-habit statistics formula
    - **Property 11: Per-habit statistics formula**
    - **Validates: Requirements 6.1**

  - [ ]* 3.13 Write property test for consistency rank ordering
    - **Property 12: Consistency rank ordering**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 3.14 Write property test for year overview aggregation
    - **Property 17: Year overview aggregation**
    - **Validates: Requirements 8.1, 8.3**

  - [ ]* 3.15 Write unit tests for `state.js` computed values
    - Test `dailyProgress` with 0 habits, partial, and full completion
    - Test `consistencyRank` tie-breaking with alphabetical sort
    - Test `weeklyPartition` for February (28 days) — no days 29–31
    - _Requirements: 2.3, 2.4, 6.2, 6.3, 1.1_

- [ ] 4. Checkpoint — Ensure all state and storage tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Goal management mutations and computed values
  - [x] 5.1 Implement goal mutations in `state.js`: `addGoal(goalData)`, `removeGoal(id)`, `toggleStep(goalId, stepId)`, `updateGoalStatus(goalId, status)`
    - `addGoal` validates required fields (area, description, reward, deadline, ≥1 step); rejects if any missing
    - `toggleStep` auto-sets status to `"Achieved"` when all steps become complete
    - `addStep` rejects when goal already has 8 steps
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.2 Implement `goalProgress(goal)` computed getter and `isOverdue(goal)` view-model flag
    - `goalProgress` returns `Math.round(completedSteps / totalSteps * 100)`
    - `isOverdue` returns `true` when `deadline < today` and `status === "Not Started"`
    - _Requirements: 7.5, 7.7_

  - [ ]* 5.3 Write property test for goal validation rejects invalid inputs
    - **Property 13: Goal validation rejects invalid inputs**
    - **Validates: Requirements 7.2**

  - [ ]* 5.4 Write property test for goal step count bounded at 8
    - **Property 14: Goal step count bounded**
    - **Validates: Requirements 7.3**

  - [ ]* 5.5 Write property test for goal status and progress invariants
    - **Property 15: Goal status and progress invariants**
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [ ]* 5.6 Write property test for overdue goal flag
    - **Property 16: Overdue goal flag**
    - **Validates: Requirements 7.7**

  - [ ]* 5.7 Write unit tests for goal mutations
    - Test auto-achieve when last step toggled complete
    - Test rejection of 9th step
    - Test `isOverdue` boundary (deadline = today is not overdue)
    - _Requirements: 7.3, 7.6, 7.7_

- [x] 6. Hash router
  - Implement `js/router.js` with `navigate(route)` and `onRouteChange(callback)`
  - Routes: `#year`, `#month/{0-11}`, `#goals`; default to `#year` on load
  - _Requirements: 8.2_

- [x] 7. Render — Year Overview
  - Implement `renderYearOverview(state)` in `js/render.js`
  - Render 12 month cards with month name and `monthlyDailyAvg` percentage
  - Render year-to-date average at top
  - Wire card clicks to `navigate('#month/{index}')`
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.1 Write property test for grid column count bounded by month length
    - **Property 5: Grid column count bounded by month length**
    - **Validates: Requirements 1.1, 2.5**

- [x] 8. Render — Monthly Detail: Daily Grid tab
  - Implement `renderDailyGrid(state, monthIndex)` in `render.js`
  - Render table: habit rows × day columns 1–31; disable cells beyond `DAYS_IN_MONTH[monthIndex]`
  - Render footer row with `dailyProgress` per column
  - Wire cell clicks to `toggleEntry` → re-render grid + footer
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 9.1_

- [x] 9. Render — Monthly Detail: Weekly Summary tab
  - Implement `renderWeeklySummary(state, monthIndex)` in `render.js`
  - Render per-week rows using `weeklyPartition` and `weeklyProgress`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Render — Monthly Detail: Monthly Habits tab
  - Implement `renderMonthlyHabits(state, monthIndex)` in `render.js`
  - Render monthly habit list with checkbox, name, and notes input per habit
  - Render add/remove controls; wire to `addMonthlyHabit` / `removeMonthlyHabit` mutations
  - Render monthly notes textarea wired to `setMonthlyNotes`
  - Render `monthlySummary` stats block
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.1 Write property test for monthly notes round-trip
    - **Property 10: Monthly notes round-trip**
    - **Validates: Requirements 5.4**

- [x] 11. Render — Monthly Detail: Statistics tab
  - Implement `renderStatistics(state, monthIndex)` in `render.js`
  - Render per-habit rows with name, days completed, and completion %
  - Render consistency rank top-10 list
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Render — Habit Edit Mode
  - Add "Edit Habits" toggle button to the monthly detail view
  - In edit mode: show add-habit input + button, show × remove button per habit row
  - Wire to `addHabit` / `removeHabit` mutations → re-render grid
  - Show inline error messages for empty name and duplicate name
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 13. Render — Goal Tracker view
  - Implement `renderGoals(state)` in `render.js`
  - Render goals grouped by life area with card layout
  - Each card: description, reward, deadline, status badge, progress bar, steps list with checkboxes
  - Flag overdue + not-started goals with visual indicator (e.g., red border)
  - Render add-goal form with area select, description, reward, deadline, steps (up to 8); disable submit until required fields filled; disable "Add step" at 8 steps
  - Wire all interactions to goal mutations → re-render
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 14. Checkpoint — Ensure all render paths work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Export and Import modules
  - [x] 15.1 Implement `js/export.js`: serialize `AppState` to JSON and trigger a file download
    - Use `Blob` + `URL.createObjectURL` + `<a>` click pattern
    - _Requirements: 10.1_

  - [x] 15.2 Implement `js/import.js`: read a JSON file, validate schema (version, months, goals keys present, version === 1), replace state on success, show descriptive error on failure
    - Leave existing state unchanged on any validation failure
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ]* 15.3 Write property test for export/import round-trip
    - **Property 19: Export/import round-trip**
    - **Validates: Requirements 10.1, 10.4**

  - [ ]* 15.4 Write property test for import validation rejects bad data
    - **Property 20: Import validation rejects bad data**
    - **Validates: Requirements 10.2, 10.3**

  - [ ]* 15.5 Write unit tests for `import.js`
    - Test rejection of non-JSON string
    - Test rejection of JSON missing `version`, `months`, or `goals`
    - Test rejection of wrong schema version
    - _Requirements: 10.2, 10.3_

- [x] 16. Bootstrap — `main.js` wiring
  - Implement `js/main.js`: call `loadState()` (or seed if null), bind router, render initial view, wire nav bar clicks, wire export/import buttons
  - _Requirements: 8.2, 9.2, 10.1, 10.4_

- [x] 17. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** and live in `tests/property/`; unit tests live in `tests/unit/`
- Each property test maps 1:1 to a property in the design document
- Checkpoints ensure incremental validation before moving to the next phase
