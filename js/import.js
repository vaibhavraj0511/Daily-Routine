/**
 * import.js — JSON validation and state replacement.
 * Implemented in task 15.2.
 */
'use strict';

/**
 * Import app state from a JSON File object.
 * Validates structure before replacing state.
 * @param {File} file
 */
function importData(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    let parsed;

    // 1. Parse JSON
    try {
      parsed = JSON.parse(e.target.result);
    } catch (_) {
      showToast('Invalid file: not valid JSON.', 'error');
      return;
    }

    // 2. Validate required fields
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      !('months' in parsed) ||
      !('goals' in parsed)
    ) {
      showToast('Invalid file: missing required fields (version, months, goals).', 'error');
      return;
    }

    // 3. Validate version
    if (parsed.version !== 1) {
      showToast('Incompatible data version. Expected version 1.', 'error');
      return;
    }

    // 4. Replace state and re-render
    AppState.setState(parsed);
    saveState(parsed);
    renderView(getCurrentRoute());
    showToast('Data imported successfully.', 'success');
  };

  reader.readAsText(file);
}
