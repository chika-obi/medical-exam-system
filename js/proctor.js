/**
 * proctor.js
 * - Captures webcam snapshots at intervals during an exam
 * - Logs browser visibility/focus events and key events (F12, Ctrl+Shift+I/J)
 * - Writes logs to localStorage under key "proctorLogs"
 *
 * Usage: include this file on exam.html (after exam.js) so it runs during the exam.
 */

(function () {
  const SNAP_INTERVAL_MS = 30 * 1000; // 30 seconds (adjust as needed)
  const MAX_SNAPSHOTS_PER_EXAM = 50;   // safety cap to avoid huge storage

  let videoStream = null;
  let snapTimer = null;
  let canvas = null;
  let ctx = null;
  let snapshotCount = 0;

  function getCurrentMeta() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
    return {
      email: loggedInUser.email || "unknown",
      fullname: loggedInUser.fullname || "",
      examTitle: localStorage.getItem("currentExam") || "unknown-exam"
    };
  }

  function logEvent(type, extra = {}) {
    const meta = getCurrentMeta();
    const logs = JSON.parse(localStorage.getItem("proctorLogs")) || [];
    const entry = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
      email: meta.email,
      fullname: meta.fullname,
      examTitle: meta.examTitle,
      timestamp: new Date().toISOString(),
      type, // e.g., "snapshot", "visibility-hidden", "blur", "copy", "rightclick", "devtools"
      extra
    };
    logs.push(entry);
    try {
      localStorage.setItem("proctorLogs", JSON.stringify(logs));
    } catch (e) {
      console.warn("proctor: failed to save log (storage full).", e);
    }
  }

  async function startWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Webcam not supported in this browser.");
      return;
    }
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // create hidden video + canvas
      const video = document.createElement("video");
      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      video.style.display = "none";
      document.body.appendChild(video);
      video.srcObject = videoStream;

      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");

      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
      });

      // first snapshot shortly after starting
      setTimeout(() => takeSnapshot(video), 1000);

      // recurring snapshots
      snapTimer = setInterval(() => takeSnapshot(video), SNAP_INTERVAL_MS);

      logEvent("proctor-start", { note: "webcam started" });
    } catch (err) {
      console.error("proctor: webcam permission denied or error", err);
      logEvent("proctor-webcam-error", { message: err.message || err.toString() });
    }
  }

  function stopWebcam() {
    if (snapTimer) {
      clearInterval(snapTimer);
      snapTimer = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      videoStream = null;
    }
    logEvent("proctor-stop", { note: "webcam stopped" });
  }

  function takeSnapshot(videoEl) {
    try {
      // safety cap
      if (snapshotCount >= MAX_SNAPSHOTS_PER_EXAM) {
        logEvent("snapshot-cap-reached", { count: snapshotCount });
        return;
      }

      if (!canvas || !ctx) return;
      // draw video frame
      canvas.width = videoEl.videoWidth || canvas.width;
      canvas.height = videoEl.videoHeight || canvas.height;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // compressed jpeg

      const meta = getCurrentMeta();
      const logs = JSON.parse(localStorage.getItem("proctorLogs")) || [];
      const entry = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
        email: meta.email,
        fullname: meta.fullname,
        examTitle: meta.examTitle,
        timestamp: new Date().toISOString(),
        type: "snapshot",
        extra: { dataUrl }
      };
      logs.push(entry);
      try {
        localStorage.setItem("proctorLogs", JSON.stringify(logs));
        snapshotCount++;
      } catch (e) {
        console.warn("proctor: snapshot save failed (localStorage full).", e);
      }
    } catch (e) {
      console.error("proctor: snapshot error", e);
      logEvent("snapshot-error", { message: e.message || e.toString() });
    }
  }

  // visibility and focus events
  function attachVisibilityHandlers() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        logEvent("visibility-hidden", { note: "document.hidden true" });
      } else {
        logEvent("visibility-visible", { note: "document visible" });
      }
    });

    window.addEventListener("blur", () => {
      logEvent("window-blur", { note: "window lost focus" });
    });

    window.addEventListener("focus", () => {
      logEvent("window-focus", { note: "window gained focus" });
    });
  }

  // copy / paste / contextmenu etc. - we will log and optionally block
  function attachInputHandlers() {
    document.addEventListener("copy", (e) => {
      logEvent("copy", { selection: (window.getSelection() || "").toString().slice(0, 100) });
      // optionally prevent copy: e.preventDefault();
    });

    document.addEventListener("cut", (e) => logEvent("cut", {}));
    document.addEventListener("paste", (e) => logEvent("paste", {}));

    document.addEventListener("contextmenu", (e) => {
      logEvent("rightclick", { x: e.clientX, y: e.clientY });
      // optionally prevent: e.preventDefault();
    });
  }

  // detect devtools attempts via common key combos
  function attachDevtoolsDetectors() {
    document.addEventListener("keydown", (e) => {
      const combo = `${e.ctrlKey ? "Ctrl+" : ""}${e.shiftKey ? "Shift+" : ""}${e.key}`;
      // common devtools combos: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) || (e.ctrlKey && e.key === "U")) {
        logEvent("devtools-attempt", { combo });
        // optional: e.preventDefault();
      }
    });
  }

  // called from exam.js when exam starts
  window.__proctorStart = function () {
    attachVisibilityHandlers();
    attachInputHandlers();
    attachDevtoolsDetectors();
    startWebcam();
  };

  // called from exam.js when exam ends (submit / exit)
  window.__proctorStop = function () {
    stopWebcam();
    // we don't remove logs — admin should see them
  };

  // auto-stop when page unloads
  window.addEventListener("beforeunload", () => {
    if (videoStream) stopWebcam();
  });
})();
