# Requirements Document

## Introduction

Smart Time Tracking and Predictive Habit Scheduling extends the Daily Habit Portal with the ability to record the exact time a habit is completed, derive a rolling-average predicted schedule from recent history, surface positive reinforcement when habits are completed on time, and recommend healthier time slots when a habit is consistently completed at a suboptimal time.

The feature integrates with the existing `AppState` singleton, the Google Sheets persistence layer, and the vanilla-JS render pipeline. No new framework or build step is introduced.

---

## Glossary

- **Portal**: The Daily Habit Portal web application.
- **Habit**: A recurring daily activity tracked in the Portal.
- **Completion_Timestamp**: An ISO 8601 date-time string (e.g. `"2025-07-14T06:03:00"`) recording the local date and time at which a habit was marked complete.
- **Time_Log**: The ordered list of `Completion_Timestamp` values stored for a single habit on a single day (normally one entry, but allows manual correction).
- **Predicted_Time**: A suggested completion time for a habit on a given day, derived from the Rolling_Average of recent `Completion_Timestamp` values.
- **Rolling_Average**: The mean completion time calculated from the most recent 3–5 days on which the habit was completed, expressed as a time-of-day (HH:MM).
- **Prediction_Window**: The configurable number of past days used to compute the Rolling_Average; default is 5, minimum is 3.
- **On_Time_Threshold**: The tolerance window (±15 minutes by default) within which a completion is considered "on time" relative to the Predicted_Time.
- **Positive_Reinforcement**: A brief in-app acknowledgement shown when a habit is completed within the On_Time_Threshold.
- **Manual_Override**: A user-initiated action to record or correct the completion time for a habit on a specific day.
- **Time_Entry_UI**: The frictionless UI component (scroll-wheel or quick-select buttons) used for Manual_Override.
- **Habit_Category**: A metadata tag attached to a habit that classifies its time-sensitivity (e.g. `"anytime"`, `"morning"`, `"evening"`, `"peak-focus"`).
- **Optimization_Suggestion**: A system-generated recommendation to move a habit to a healthier time slot, based on its Habit_Category and observed completion pattern.
- **Tracker**: The Smart Time Tracking subsystem of the Portal.
- **Schedule_View**: The UI panel that displays today's Predicted_Time for each habit alongside its completion status.

---

## Requirements

### Requirement 1: Completion Timestamp Logging

**User Story:** As a user, I want the Portal to automatically record the exact time I mark a habit complete, so that I have an accurate history of when I actually perform each habit.

#### Acceptance Criteria

1. WHEN the user marks a habit as complete, THE Tracker SHALL record a `Completion_Timestamp` for that habit and day using the device's local date and time at the moment of the toggle.
2. THE Tracker SHALL store the `Completion_Timestamp` as an ISO 8601 local date-time string (format `YYYY-MM-DDTHH:MM:SS`) within the existing `MonthData.entries` structure, keyed by habit name and day number.
3. WHEN the user un-marks a habit (toggles it back to incomplete), THE Tracker SHALL remove the `Completion_Timestamp` for that habit and day while preserving the boolean completion state as `false`.
4. THE Tracker SHALL persist `Completion_Timestamp` values through the existing Google Sheets save mechanism without requiring a separate save action.
5. WHEN a habit is marked complete for a day that already has a `Completion_Timestamp`, THE Tracker SHALL overwrite the existing timestamp with the new one.

---

### Requirement 2: Rolling Average Prediction

**User Story:** As a user, I want the Portal to predict a personalized schedule for tomorrow based on my recent completion times, so that I have a realistic plan that reflects my actual habits rather than a single outlier day.

#### Acceptance Criteria

1. THE Tracker SHALL compute a `Predicted_Time` for each habit by calculating the Rolling_Average of `Completion_Timestamp` values from the most recent N days on which the habit was completed, where N is the Prediction_Window (default 5, minimum 3).
2. WHEN fewer than 3 days of `Completion_Timestamp` data exist for a habit, THE Tracker SHALL not display a Predicted_Time for that habit.
3. THE Tracker SHALL compute the Rolling_Average by converting each recorded time to minutes-since-midnight, averaging those values, and converting the result back to HH:MM.
4. WHEN computing the Rolling_Average, THE Tracker SHALL exclude days on which the habit was not completed (i.e. only completed days contribute to the average).
5. THE Tracker SHALL recalculate the Predicted_Time for all habits whenever the Schedule_View is opened or a new Completion_Timestamp is saved.
6. WHERE the user has configured a custom Prediction_Window (3–5 days), THE Tracker SHALL use that value instead of the default.

---

### Requirement 3: Schedule View

**User Story:** As a user, I want to see a daily schedule panel showing the predicted completion time for each of today's habits, so that I can plan my day proactively.

#### Acceptance Criteria

1. THE Portal SHALL provide a Schedule_View accessible from the main navigation.
2. WHEN the Schedule_View is rendered, THE Portal SHALL display each habit for the current day alongside its Predicted_Time (if available) and its current completion status.
3. WHILE a habit has no Predicted_Time (fewer than 3 days of data), THE Portal SHALL display "No prediction yet" in place of the time.
4. THE Portal SHALL sort habits in the Schedule_View by Predicted_Time ascending, with habits that have no prediction listed last.
5. WHEN a habit is marked complete from the Schedule_View, THE Portal SHALL update the completion status and Completion_Timestamp in real time without a full page reload.

---

### Requirement 4: Positive Reinforcement

**User Story:** As a user, I want the Portal to acknowledge when I complete a habit close to its predicted time, so that I receive encouragement for staying on schedule.

#### Acceptance Criteria

1. WHEN a habit is marked complete and a Predicted_Time exists for that habit, THE Tracker SHALL compare the completion time to the Predicted_Time.
2. IF the completion time falls within the On_Time_Threshold (±15 minutes of the Predicted_Time), THEN THE Portal SHALL display a Positive_Reinforcement message for that habit.
3. THE Positive_Reinforcement message SHALL be non-blocking (e.g. a toast notification) and SHALL dismiss automatically after 3 seconds.
4. IF the completion time falls outside the On_Time_Threshold, THEN THE Portal SHALL record the completion normally without displaying a Positive_Reinforcement message.
5. WHERE the user has disabled Positive_Reinforcement in settings, THE Portal SHALL suppress all Positive_Reinforcement messages.

---

### Requirement 5: Manual Override

**User Story:** As a user, I want to manually log or correct the completion time for a habit, so that I can accurately record habits I completed but forgot to check off at the time.

#### Acceptance Criteria

1. THE Portal SHALL provide a Manual_Override action for every habit entry in the daily grid and in the Schedule_View.
2. WHEN the user triggers a Manual_Override, THE Portal SHALL present the Time_Entry_UI allowing the user to select an hour and minute.
3. THE Time_Entry_UI SHALL offer both a scroll-wheel time picker and quick-select buttons for common times (e.g. every 30 minutes from 05:00 to 23:00) so that entry requires no more than 2 interactions.
4. WHEN the user confirms a Manual_Override time, THE Tracker SHALL store the selected time as the `Completion_Timestamp` for that habit and day, overwriting any previously auto-recorded timestamp.
5. WHEN the user confirms a Manual_Override time for a habit that was not yet marked complete, THE Tracker SHALL also mark the habit as complete.
6. IF the user cancels the Time_Entry_UI without confirming, THEN THE Tracker SHALL leave the existing completion state and timestamp unchanged.

---

### Requirement 6: Habit Category Metadata

**User Story:** As a user, I want to assign a time-sensitivity category to each habit, so that the system can evaluate whether I am completing it at an appropriate time of day.

#### Acceptance Criteria

1. THE Portal SHALL support the following Habit_Category values: `"anytime"`, `"morning"` (05:00–11:59), `"afternoon"` (12:00–16:59), `"evening"` (17:00–21:59), and `"peak-focus"` (06:00–10:00).
2. WHEN the user edits a habit, THE Portal SHALL allow the user to assign or change the Habit_Category for that habit.
3. THE Portal SHALL default the Habit_Category to `"anytime"` for all habits that have not been explicitly categorized.
4. THE Portal SHALL persist the Habit_Category for each habit within the existing `MonthData.habitTags` structure (reusing the existing tag field or extending it as needed).
5. WHEN a Habit_Category is changed, THE Portal SHALL immediately re-evaluate any pending Optimization_Suggestions for that habit.

---

### Requirement 7: Optimization Suggestions

**User Story:** As a user, I want the Portal to recommend a better time slot when I am consistently completing a habit outside its ideal window, so that I can adjust my schedule for better outcomes.

#### Acceptance Criteria

1. WHEN a habit has at least 5 days of `Completion_Timestamp` data and its Habit_Category is not `"anytime"`, THE Tracker SHALL evaluate whether the Rolling_Average falls within the category's defined time window.
2. IF the Rolling_Average falls outside the Habit_Category's time window for 3 or more of the last 5 recorded days, THEN THE Tracker SHALL generate an Optimization_Suggestion for that habit.
3. THE Optimization_Suggestion SHALL state the habit name, the observed average completion time, and the recommended time window for the habit's category.
4. THE Portal SHALL display Optimization_Suggestions in the Schedule_View in a dedicated "Suggestions" section, separate from the habit list.
5. WHEN the user dismisses an Optimization_Suggestion, THE Portal SHALL not re-display that suggestion for the same habit until the Rolling_Average changes by more than 30 minutes.
6. THE Tracker SHALL NOT generate Optimization_Suggestions for habits with a Habit_Category of `"anytime"`.

---

### Requirement 8: Prediction Window Configuration

**User Story:** As a user, I want to configure how many past days are used to compute my predicted schedule, so that I can balance responsiveness to recent changes against stability.

#### Acceptance Criteria

1. THE Portal SHALL provide a setting to configure the Prediction_Window with allowed values of 3, 4, or 5 days.
2. THE Portal SHALL default the Prediction_Window to 5 days.
3. WHEN the user changes the Prediction_Window, THE Tracker SHALL immediately recompute all Predicted_Times using the new window size.
4. THE Portal SHALL persist the Prediction_Window setting across sessions via the existing Google Sheets save mechanism.
5. IF the user sets the Prediction_Window to a value outside the range 3–5, THEN THE Portal SHALL reject the input and display an inline validation message.

---

### Requirement 9: Time Tracking Data Persistence

**User Story:** As a user, I want all time-tracking data to be saved and restored automatically, so that my completion history and predictions survive page reloads and device changes.

#### Acceptance Criteria

1. THE Tracker SHALL store all `Completion_Timestamp` values within the existing `AppState` structure so that they are included in every Google Sheets auto-save.
2. WHEN the Portal loads, THE Tracker SHALL restore all `Completion_Timestamp` values, Habit_Category assignments, Prediction_Window setting, and dismissed Optimization_Suggestions from the persisted state.
3. THE Tracker SHALL include all time-tracking fields in the existing JSON export so that a full export/import round-trip preserves all timestamp data.
4. WHEN a JSON file containing time-tracking data is imported, THE Portal SHALL validate the timestamp format and reject any entry whose `Completion_Timestamp` does not conform to the `YYYY-MM-DDTHH:MM:SS` format.
5. THE Tracker SHALL remain backward-compatible: existing state objects that lack `Completion_Timestamp` fields SHALL be loaded without error, treating missing timestamps as absent.

---

### Requirement 10: Schedule Accuracy Feedback

**User Story:** As a user, I want to see how accurately I am following my predicted schedule over time, so that I can understand whether the predictions are useful and adjust my behavior accordingly.

#### Acceptance Criteria

1. THE Portal SHALL display a per-habit "schedule accuracy" metric in the Statistics tab, defined as the percentage of completed days on which the habit was finished within the On_Time_Threshold of its Predicted_Time.
2. WHEN a habit has fewer than 3 completed days with both a `Completion_Timestamp` and a Predicted_Time, THE Portal SHALL display "Insufficient data" for that habit's schedule accuracy.
3. THE Portal SHALL display an overall schedule accuracy score for the month, calculated as the mean of all per-habit schedule accuracy values for habits that have sufficient data.
4. WHEN the On_Time_Threshold is changed in settings, THE Portal SHALL recalculate all schedule accuracy metrics immediately.
