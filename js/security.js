/**
 * security.js
 * - Lightweight prevention & logging helpers
 * - Disables right-click (configurable), prevents text selection if desired
 * - Logs key combos like Ctrl+C, Ctrl+T, F12 etc.
 *
 * Include this on pages where you want protection (exam.html).
 */

(function () {
  const DISABLE_CONTEXT_MENU = true;
  const DISABLE_SELECT = false; // toggle if you want to prevent selecting text

  function logSecurityEvent(type, data = {}) {
    const logs = JSON.parse(localStorage.getItem("proctorLogs")) || [];
    logs.push({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
      email: (JSON.parse(localStorage.getItem("loggedInUser")) || {}).email || "unknown",
      examTitle: localStorage.getItem("currentExam") || "unknown",
      timestamp: new Date().toISOString(),
      type,
      extra: data
    });
    try { localStorage.setItem("proctorLogs", JSON.stringify(logs)); } catch (e) { /* ignore */ }
  }

  if (DISABLE_CONTEXT_MENU) {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      logSecurityEvent("blocked-rightclick", { x: e.clientX, y: e.clientY });
    });
  }

  if (DISABLE_SELECT) {
    document.addEventListener("selectstart", (e) => {
      e.preventDefault();
      logSecurityEvent("blocked-select");
    });
  }

  // block some keys and log attempts
  document.addEventListener("keydown", (e) => {
    const key = e.key;
    // block F12, Ctrl+Shift+I/J, Ctrl+U, Ctrl+T (open new tab)
    if (key === "F12" ||
        (e.ctrlKey && e.shiftKey && (key === "I" || key === "J")) ||
        (e.ctrlKey && key === "U") ||
        (e.ctrlKey && key === "T")) {

      e.preventDefault();
      logSecurityEvent("blocked-key", { key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });
    }

    // optional: block copying via Ctrl+C
    if (e.ctrlKey && key === "c") {
      // log but allow (or e.preventDefault() to block)
      logSecurityEvent("copy-key-pressed", {});
    }
  });
})();
