window.GH600_BACKEND = {
  apiBase: "/api",
  // Any deploy (https or plain http) talks to the real API. The localStorage/
  // access-config fallback only ever applies to a file:// preview with no server available.
  enabled: window.location.protocol !== "file:"
};
