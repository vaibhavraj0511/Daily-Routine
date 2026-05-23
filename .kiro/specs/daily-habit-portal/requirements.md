# Requirements Document

## Introduction

The Daily Habit Portal is a web application that replicates and enhances the functionality of an existing habit tracker spreadsheet. The portal allows a user to track daily habits, weekly habits, monthly habits, and life goals across a full year. It provides progress visualization, consistency rankings, and goal management — all in a single, interactive web interface.

## Glossary

- **Portal**: The Daily Habit Portal web application
- **Habit**: A recurring activity the user wants to track (daily, weekly, or monthly)
- **Daily_Habit**: A habit that is tracked once per calendar day
- **Weekly_Habit**: A habit that is tracked once per calendar week
- **Monthly_Habit**: A habit or goal that is tracked once per calendar month
- **Habit_Entry**: A single checkbox record indicating whether a habit was completed on a given day
- **Daily_Progress**: The percentage of daily habits completed on a given day
- **Habit_Set**: The collection of habits configured for a given month
- **Goal**: A life goal with an area, reward, status, steps, deadline, and progress percentage
- **Goal_Tracker**: The section of the portal dedicated to managing life goals
- **Consistency_Rank**: A ranking of habits by the number of days they were completed in a month
- **Weekly_Summary**: Aggregated stats for habits completed within a calendar week
- **Monthly_Summary**: Aggregated stats for all habits completed within a calendar month
- **Daily_Summary**: Per-day stats showing completed count, incomplete count, and daily goal status

---

## Requirements

### Requirement 1: Daily Habit Configuration

**User Story:** As a user, I want to configure a list of daily habits for each month, so that I can track different habits across different months of the year.

#### Acceptance Criteria

1. THE Portal SHALL support up to 31 days per month for daily habit tracking.
2. THE Portal SHALL allow the user to define a custom list of daily habits per month.
3. WHEN the user adds a habit to a month, THE Portal SHALL display the habit in the daily tracking grid for that month.
4. WHEN the user removes a habit from a month, THE Portal SHALL remove the habit and all its Habit_Entry records for that month.
5. THE Portal SHALL persist the Habit_Set for each month independently, so that January may have 12 habits while February has 3.

---

### Requirement 2: Daily Habit Check-In

**User Story:** As a user, I want to mark each daily habit as complete or incomplete for each day, so that I can record my progress day by day.

#### Acceptance Criteria

1. WHEN the user views a month, THE Portal SHALL display a grid with habits as rows and days (1–31) as columns.
2. WHEN the user clicks a cell in the grid, THE Portal SHALL toggle the Habit_Entry for that habit and day between completed and incomplete.
3. WHILE a day has no habits marked complete, THE Portal SHALL display a Daily_Progress of 0% for that day.
4. WHEN at least one habit is marked complete for a day, THE Portal SHALL recalculate and display the Daily_Progress as (completed habits / total habits) × 100, rounded to the nearest whole number.
5. IF a month has fewer than 31 days, THEN THE Portal SHALL disable input cells for days that do not exist in that month.

---

### Requirement 3: Daily Summary

**User Story:** As a user, I want to see a per-day summary of my habit completion, so that I can quickly assess how well I did on any given day.

#### Acceptance Criteria

1. THE Portal SHALL display a Daily_Summary for each day showing: percentage completed, count of completed habits, count of incomplete habits, and whether the daily goal was met.
2. WHEN the Daily_Progress for a day reaches 100%, THE Portal SHALL mark the daily goal as met for that day.
3. WHEN the Daily_Progress for a day is below 100%, THE Portal SHALL mark the daily goal as not met for that day.

---

### Requirement 4: Weekly Habit Tracking

**User Story:** As a user, I want to track habits organized by week within a month, so that I can see my weekly patterns.

#### Acceptance Criteria

1. THE Portal SHALL organize days within a month into weeks (Week 1 through Week 5, plus remaining days as "Others").
2. THE Portal SHALL display per-week stats showing the number of habits completed and the completion percentage for each week.
3. WHEN the user marks or unmarks a Habit_Entry, THE Portal SHALL update the Weekly_Summary for the week containing that day.

---

### Requirement 5: Monthly Habit Tracking

**User Story:** As a user, I want to track monthly habits and goals separate from daily habits, so that I can record things I aim to do once per month.

#### Acceptance Criteria

1. THE Portal SHALL support a list of Monthly_Habits per month, each with a checkbox and a notes field.
2. WHEN the user checks a Monthly_Habit, THE Portal SHALL record it as completed for that month.
3. THE Portal SHALL display a Monthly_Summary showing: total monthly habits, count completed, count incomplete, and overall percentage completed.
4. THE Portal SHALL provide a free-text notes field for each month.

---

### Requirement 6: Monthly Progress Statistics

**User Story:** As a user, I want to see aggregated monthly statistics for each habit, so that I can understand my consistency over the month.

#### Acceptance Criteria

1. THE Portal SHALL display a per-habit progress section for each month showing: the habit name, total days completed, and completion percentage across all days in the month.
2. THE Portal SHALL display a Consistency_Rank listing the top 10 most consistently completed habits for the month, ordered by completion count descending.
3. WHEN two habits have the same completion count, THE Portal SHALL order them alphabetically by habit name.

---

### Requirement 7: Goal Tracker

**User Story:** As a user, I want to manage life goals across multiple areas of my life, so that I can track progress toward meaningful long-term objectives.

#### Acceptance Criteria

1. THE Goal_Tracker SHALL support goals in the following areas of life: Finances, Career, Personal Growth, Health & Wellness, and Relationships.
2. WHEN the user creates a goal, THE Portal SHALL require: area of life, goal description, reward, deadline, and at least one step.
3. THE Portal SHALL support up to 8 steps per goal.
4. WHEN the user updates the status of a goal, THE Portal SHALL accept one of two values: "Not Started" or "Achieved".
5. THE Portal SHALL display a progress percentage per goal, calculated as (completed steps / total steps) × 100, rounded to the nearest whole number.
6. WHEN all steps of a goal are marked complete, THE Portal SHALL automatically set the goal status to "Achieved".
7. IF a goal's deadline has passed and the status is "Not Started", THEN THE Portal SHALL visually distinguish that goal from goals with future deadlines.

---

### Requirement 8: Year Overview

**User Story:** As a user, I want a high-level view of my habit completion across all 12 months, so that I can see my overall consistency for the year.

#### Acceptance Criteria

1. THE Portal SHALL display a year overview showing each month's overall Daily_Progress percentage.
2. WHEN the user selects a month from the year overview, THE Portal SHALL navigate to the detailed monthly view for that month.
3. THE Portal SHALL calculate the year-to-date average Daily_Progress as the mean of all daily completion percentages recorded so far.

---

### Requirement 9: Data Persistence

**User Story:** As a user, I want my habit data to be saved automatically, so that I do not lose my progress when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN the user toggles a Habit_Entry, THE Portal SHALL persist the change without requiring a manual save action.
2. WHEN the user reopens the Portal, THE Portal SHALL restore all previously recorded Habit_Entry records, Monthly_Habits, and Goals.
3. THE Portal SHALL store all data in the browser's local storage as the default persistence mechanism.

---

### Requirement 10: Data Import and Export

**User Story:** As a user, I want to export and import my habit data, so that I can back up my progress or migrate to a new device.

#### Acceptance Criteria

1. WHEN the user triggers an export, THE Portal SHALL generate a JSON file containing all Habit_Entry records, Habit_Sets, Monthly_Habits, and Goals.
2. WHEN the user imports a JSON file, THE Portal SHALL validate the file structure before applying the data.
3. IF the imported JSON file fails validation, THEN THE Portal SHALL display a descriptive error message and leave the existing data unchanged.
4. WHEN a valid JSON file is imported, THE Portal SHALL replace the current data with the imported data and refresh the view.
