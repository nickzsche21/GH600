// Local-only preview fallback, checked by tests/static.test.js: this file
// must never contain a wildcard email match or a shared universal code —
// it ships to every deployed build. Only consulted when backend-config.js
// reports enabled=false, which only happens on a file:// preview with no
// API. Add single-use, non-wildcard codes here for local manual testing only.
window.GH600_ACCESS_CODES = [];
