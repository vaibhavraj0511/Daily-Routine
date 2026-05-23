/**
 * auth.js — Client-side authentication manager.
 *
 * Password is hashed with SHA-256 (Web Crypto API) and stored in localStorage.
 * The hash is used as an auth token sent with every Google Sheets request so
 * the Apps Script backend can validate it via Script Properties.
 *
 * Session (logged-in state) lives in sessionStorage — expires when the tab is closed.
 */
'use strict';

const AuthManager = (() => {
  const HASH_KEY      = 'habit-portal-pw-hash';
  const RECOVERY_KEY  = 'habit-portal-recovery-hash';
  const SESSION_KEY   = 'habit-portal-auth';

  /** SHA-256 hash of a string → hex string */
  async function _sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** True if a password has been set on this device */
  function isSetup() {
    return !!localStorage.getItem(HASH_KEY);
  }

  /** True if a recovery code hash is stored locally */
  function isRecoverySetup() {
    return !!localStorage.getItem(RECOVERY_KEY);
  }

  /** Persist a recovery code hash locally */
  function storeRecoveryHash(hash) {
    localStorage.setItem(RECOVERY_KEY, hash);
  }

  /**
   * Verify a plain-text recovery code against the locally stored hash.
   * @param {string} code  Plain-text recovery code (will be uppercased + trimmed)
   * @returns {Promise<boolean>}
   */
  async function verifyRecovery(code) {
    const stored = localStorage.getItem(RECOVERY_KEY);
    if (!stored) return false;
    const hash = await _sha256(code.trim().toUpperCase());
    return hash === stored;
  }

  /** True if the user is authenticated in this browser session */
  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  /** The stored password hash used as a request token */
  function getToken() {
    return localStorage.getItem(HASH_KEY) || '';
  }

  /**
   * Attempt login with plain-text password.
   * @returns {{ ok: boolean, error?: string }}
   */
  async function login(password) {
    if (!password) return { ok: false, error: 'Please enter your password.' };
    const hash   = await _sha256(password);
    const stored = localStorage.getItem(HASH_KEY);
    if (hash === stored) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect password. Try again.' };
  }

  /**
   * First-time setup: hash and store the password, mark session as active.
   * @returns {string} The computed hash (token) to register with Apps Script.
   */
  async function setupPassword(password) {
    const hash = await _sha256(password);
    localStorage.setItem(HASH_KEY, hash);
    sessionStorage.setItem(SESSION_KEY, '1');
    return hash;
  }

  /** Clear session (logout). Does NOT remove the stored password hash. */
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /** Replace stored password hash (used after a password change). */
  function updateStoredHash(newHash) {
    localStorage.setItem(HASH_KEY, newHash);
  }

  /**
   * Store a pre-computed hash and mark session as active.
   * Used by the reset-password flow after the server confirms the recovery code.
   * @param {string} hash
   */
  function storeHash(hash) {
    localStorage.setItem(HASH_KEY, hash);
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  /**
   * Public SHA-256 helper — returns hex string.
   * @param {string} str
   * @returns {Promise<string>}
   */
  async function hashString(str) {
    return _sha256(str);
  }

  /**
   * Generate a random 12-character uppercase alphanumeric recovery code.
   * @returns {string}
   */
  function generateRecoveryCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
  }

  return {
    isSetup, isLoggedIn, getToken,
    login, setupPassword, logout, updateStoredHash,
    storeHash, hashString, generateRecoveryCode,
    isRecoverySetup, storeRecoveryHash, verifyRecovery
  };
})();
