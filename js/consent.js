/**
 * consent.js (updated)
 * Shows consent modal and calls __proctorStart() and __examStart() when student accepts.
 */

document.addEventListener("DOMContentLoaded", () => {
  const consentModal = document.getElementById("consentModal");
  const policyModal = document.getElementById("policyModal");
  const consentCheckbox = document.getElementById("consentCheckbox");
  const startExamBtn = document.getElementById("startExamBtn");
  const viewPolicyBtn = document.getElementById("viewPolicyBtn");
  const closePolicy = document.getElementById("closePolicy");

  // Hide exam UI until consent
  const examContainer = document.getElementById("examContainer");
  if (examContainer) examContainer.style.display = "none";

  // Enable Start button only when checkbox is checked
  consentCheckbox?.addEventListener("change", () => {
    startExamBtn.disabled = !consentCheckbox.checked;
  });

  // Show full policy modal
  viewPolicyBtn?.addEventListener("click", () => {
    if (policyModal) policyModal.style.display = "flex";
  });

  // Close full policy modal
  closePolicy?.addEventListener("click", () => {
    if (policyModal) policyModal.style.display = "none";
  });

  // Start exam when user accepts
  startExamBtn?.addEventListener("click", () => {
    if (!consentCheckbox.checked) return;
    // hide consent
    if (consentModal) consentModal.style.display = "none";
    if (examContainer) examContainer.style.display = "block";

    // start proctoring + exam lifecycle if available
    if (typeof window.__proctorStart === "function") {
      try { window.__proctorStart(); } catch (e) { console.warn("proctor start error", e); }
    }
    // call exam start (start timer/render) if present
    if (typeof window.__examStart === "function") {
      try { window.__examStart(); } catch (e) { console.warn("exam start error", e); }
    }
  });
});
