/**
 * profiles.js — Multi-profile management (localStorage-based).
 * Each profile stores its own state in a dedicated localStorage key.
 * The "default" profile uses the existing Google Sheets sync.
 * Additional profiles are localStorage-only.
 */
'use strict';

const PROFILES_KEY         = 'habit-portal-profiles';
const CURRENT_PROFILE_KEY  = 'habit-portal-current-profile';
const DEFAULT_PROFILE_ID   = 'default';

const ProfileManager = (() => {

  function _load() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _save(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  /** Return all non-default profiles. */
  function getProfiles() {
    return _load();
  }

  /** Return the active profile ID (defaults to 'default'). */
  function getCurrentId() {
    return localStorage.getItem(CURRENT_PROFILE_KEY) || DEFAULT_PROFILE_ID;
  }

  /** Switch the active profile (does not load state — caller must do that). */
  function setCurrentId(id) {
    localStorage.setItem(CURRENT_PROFILE_KEY, id);
  }

  /** Return display name of current profile. */
  function getCurrentName() {
    const id = getCurrentId();
    if (id === DEFAULT_PROFILE_ID) return 'Default';
    const p = _load().find(p => p.id === id);
    return p ? p.name : 'Unknown';
  }

  /** Create a new profile. Returns the new profile's ID. */
  function create(name) {
    const profiles = _load();
    const id = 'profile-' + Date.now();
    profiles.push({ id, name: name.trim() || 'Profile', createdAt: new Date().toISOString() });
    _save(profiles);
    return id;
  }

  /** Delete a profile and its saved state. Cannot delete 'default'. */
  function remove(id) {
    if (id === DEFAULT_PROFILE_ID) return false;
    _save(_load().filter(p => p.id !== id));
    localStorage.removeItem('habit-portal-state-' + id);
    if (getCurrentId() === id) setCurrentId(DEFAULT_PROFILE_ID);
    return true;
  }

  /** Rename a profile. */
  function rename(id, newName) {
    const profiles = _load();
    const p = profiles.find(p => p.id === id);
    if (p) { p.name = newName.trim() || p.name; _save(profiles); }
  }

  /**
   * Save state for a non-default profile into localStorage.
   * Called automatically by AppState._save() hook when profile ≠ default.
   */
  function saveState(id, stateObj) {
    if (id === DEFAULT_PROFILE_ID) return;
    localStorage.setItem('habit-portal-state-' + id, JSON.stringify(stateObj));
  }

  /**
   * Load state for a non-default profile from localStorage.
   * Returns null if no saved state exists.
   */
  function loadState(id) {
    if (id === DEFAULT_PROFILE_ID) return null;
    try {
      const raw = localStorage.getItem('habit-portal-state-' + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isDefault() {
    return getCurrentId() === DEFAULT_PROFILE_ID;
  }

  return {
    DEFAULT_PROFILE_ID,
    getProfiles,
    getCurrentId,
    setCurrentId,
    getCurrentName,
    create,
    remove,
    rename,
    saveState,
    loadState,
    isDefault
  };
})();
