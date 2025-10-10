fetch("../data/questions.json")
  .then(res => res.json())
  .then(data => {
    localStorage.setItem("questions", JSON.stringify(data));
  });

// ======== Role Protection =========
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser || loggedInUser.role !== "admin") {
    alert("Access denied! Admins only.");
    window.location.href = "login.html";
  }
});

// ======== Sidebar Navigation =========
const sidebarLinks = document.querySelectorAll(".sidebar a");
const sections = document.querySelectorAll(".section");

sidebarLinks.forEach(link => {
  link.addEventListener("click", () => {
    const target = link.dataset.section;

    sections.forEach(sec => sec.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  });
});

// ======== Add Questions =========
const questionForm = document.getElementById("questionForm");
const questionList = document.getElementById("questionList");

if (questionForm) {
  questionForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const question = document.getElementById("question").value.trim();
    const optionA = document.getElementById("optionA").value.trim();
    const optionB = document.getElementById("optionB").value.trim();
    const optionC = document.getElementById("optionC").value.trim();
    const optionD = document.getElementById("optionD").value.trim();
    const correctAnswer = document.getElementById("correctAnswer").value;

    const newQuestion = { question, optionA, optionB, optionC, optionD, correctAnswer };

    let questions = JSON.parse(localStorage.getItem("questions")) || [];
    questions.push(newQuestion);
    localStorage.setItem("questions", JSON.stringify(questions));

    alert("✅ Question added successfully!");
    questionForm.reset();
    renderQuestions();
  });
}

// ======== Display Questions =========
function renderQuestions() {
  const questions = JSON.parse(localStorage.getItem("questions")) || [];
  questionList.innerHTML = "";
  questions.forEach((q, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Q${i + 1}:</strong> ${q.question} 
      <em>(Answer: ${q.correctAnswer})</em>`;
    questionList.appendChild(li);
  });
}
renderQuestions();

// ======== Schedule Exam =========
const scheduleForm = document.getElementById("scheduleForm");
const examList = document.getElementById("examList");

if (scheduleForm) {
  scheduleForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const examTitle = document.getElementById("examTitle").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    let exams = JSON.parse(localStorage.getItem("exams")) || [];
    exams.push({ examTitle, startDate, endDate });
    localStorage.setItem("exams", JSON.stringify(exams));

    alert("📅 Exam scheduled successfully!");
    scheduleForm.reset();
    renderExams();
  });
}

function renderExams() {
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  examList.innerHTML = "";
  exams.forEach((e, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${e.examTitle}</strong> - ${new Date(
      e.startDate
    ).toLocaleString()} to ${new Date(e.endDate).toLocaleString()}`;
    examList.appendChild(li);
  });
}
renderExams();

// ======== Logout =========
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
});

// ====== Proctor Logs render & controls ======
function renderProctorLogs() {
  const logs = JSON.parse(localStorage.getItem("proctorLogs")) || [];
  const list = document.getElementById("proctorList");
  if (!list) return;
  const filterEmail = document.getElementById("proctorFilterEmail").value.trim().toLowerCase();
  const filterExam = document.getElementById("proctorFilterExam").value.trim().toLowerCase();

  list.innerHTML = "";
  if (logs.length === 0) {
    list.innerHTML = "<p>No proctor logs yet.</p>";
    return;
  }

  // show most recent first
  logs.slice().reverse().forEach((log) => {
    if (filterEmail && !log.email.toLowerCase().includes(filterEmail)) return;
    if (filterExam && !log.examTitle.toLowerCase().includes(filterExam)) return;

    const li = document.createElement("li");
    const left = document.createElement("div");
    left.className = "proctor-meta";
    left.innerHTML = `<strong>${log.type}</strong> — ${log.email || "N/A"} — ${new Date(log.timestamp).toLocaleString()}`;

    const right = document.createElement("div");
    // snapshot entries include extra.dataUrl
    if (log.type === "snapshot" && log.extra && log.extra.dataUrl) {
      const btn = document.createElement("button");
      btn.textContent = "View Snapshot";
      btn.className = "btn primary";
      btn.onclick = () => openProctorModal(log.extra.dataUrl, log);
      right.appendChild(btn);
    } else {
      const span = document.createElement("span");
      span.textContent = "View";
      span.className = "btn secondary";
      span.onclick = () => openProctorModal(null, log);
      right.appendChild(span);
    }

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

function openProctorModal(dataUrl, log) {
  const modal = document.getElementById("proctorModal");
  const body = document.getElementById("modalBody");
  body.innerHTML = ""; // reset
  const details = document.createElement("div");
  details.innerHTML = `<p><strong>Type:</strong> ${log.type}</p>
                       <p><strong>Student:</strong> ${log.email || "N/A"}</p>
                       <p><strong>Exam:</strong> ${log.examTitle || "N/A"}</p>
                       <p><strong>Time:</strong> ${new Date(log.timestamp).toLocaleString()}</p>`;
  body.appendChild(details);

  if (dataUrl) {
    const img = document.createElement("img");
    img.src = dataUrl;
    body.appendChild(img);
  } else {
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.textContent = JSON.stringify(log.extra || {}, null, 2);
    body.appendChild(pre);
  }

  modal.style.display = "flex";
}

document.getElementById("modalClose")?.addEventListener("click", () => {
  document.getElementById("proctorModal").style.display = "none";
});



document.getElementById("proctorRefresh")?.addEventListener("click", renderProctorLogs);
document.getElementById("clearProctorLogs")?.addEventListener("click", () => {
  if (!confirm("Clear all proctor logs? This cannot be undone.")) return;
  localStorage.removeItem("proctorLogs");
  renderProctorLogs();
});



// auto-render on load of admin dashboard
renderProctorLogs();



