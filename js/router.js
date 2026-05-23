/**
 * router.js — Hash-based navigation.
 *
 * Routes:
 *   #year          → { type: 'year' }
 *   #month/0–11    → { type: 'month', monthIndex: N }
 *   #goals         → { type: 'goals' }
 *
 * Globals: navigate(route), onRouteChange(callback), getCurrentRoute()
 */
'use strict';

const _callbacks = [];

/**
 * Parse the raw hash string (without leading '#') into a route object.
 * Falls back to { type: 'year' } for unrecognised hashes.
 * @param {string} hash
 * @returns {{ type: 'year'|'month'|'goals', monthIndex?: number }}
 */
function _parseHash(hash) {
  if (!hash || hash === 'year') {
    return { type: 'year' };
  }
  if (hash === 'dashboard') {
    return { type: 'dashboard' };
  }
  if (hash === 'goals') {
    return { type: 'goals' };
  }
  if (hash === 'schedule') {
    return { type: 'schedule' };
  }
  const monthMatch = hash.match(/^month\/(\d+)$/);
  if (monthMatch) {
    const monthIndex = parseInt(monthMatch[1], 10);
    if (monthIndex >= 0 && monthIndex <= 11) {
      return { type: 'month', monthIndex };
    }
  }
  // Unknown hash — default to year
  return { type: 'year' };
}

/**
 * Return the current route object derived from window.location.hash.
 * @returns {{ type: 'year'|'month'|'goals', monthIndex?: number }}
 */
function getCurrentRoute() {
  return _parseHash(window.location.hash.slice(1));
}

/**
 * Navigate to a route by setting the hash.
 * @param {string} route  e.g. 'year', 'month/3', 'goals'
 */
function navigate(route) {
  window.location.hash = route;
}

/**
 * Register a callback that fires whenever the route changes.
 * The callback receives the parsed route object.
 * @param {function} callback
 */
function onRouteChange(callback) {
  _callbacks.push(callback);
}

function _dispatchRoute() {
  const route = getCurrentRoute();
  _callbacks.forEach(cb => cb(route));
}

window.addEventListener('hashchange', _dispatchRoute);

// On load: default to #dashboard if no hash is present, then dispatch.
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = 'dashboard';
    // hashchange will fire and dispatch; nothing more needed here.
  } else {
    _dispatchRoute();
  }
});
