/**
 * sw.js — Service Worker for Daily Habit Portal PWA.
 * Strategy: Cache-first for static assets; network-first for Google Sheets API.
 */
'use strict';

const CACHE_NAME   = 'habit-portal-v1';
const SHEETS_HOST  = 'script.google.com';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/state.js',
  './js/storage.js',
  './js/auth.js',
  './js/render.js',
  './js/export.js',
  './js/import.js',
  './js/schedule.js',
  './js/router.js',
  './js/main.js',
  './js/profiles.js'
];

// ── Install: pre-cache static assets ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for Sheets ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for Google Sheets API calls
  if (url.hostname === SHEETS_HOST) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
