// ======== Access Protection =========
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser || loggedInUser.role !== "student") {
    alert("Access denied! Students only.");
    window.location.href = "login.html";
  }

  // Show profile info
  const profileDiv = document.getElementById("studentProfile");
  profileDiv.innerHTML = `
    <p><strong>Name:</strong> ${loggedInUser.fullname}</p>
    <p><strong>Email:</strong> ${loggedInUser.email}</p>
    <p><strong>Role:</strong> ${loggedInUser.role}</p>
  `;

  // Load available exams
  loadExams();
  loadHistory();
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

// ======== Load Exams =========
function loadExams() {
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const now = new Date();
  const list = document.getElementById("availableExams");
  list.innerHTML = "";

  if (exams.length === 0) {
    list.innerHTML = "<p>No exams available yet.</p>";
    return;
  }

  exams.forEach((exam, i) => {
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);

    if (now >= start && now <= end) {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${exam.examTitle}</strong> <br>
        ${start.toLocaleString()} - ${end.toLocaleString()} <br>
        <button class="btn primary" onclick="startExam('${exam.examTitle}')">Start Exam</button>
      `;
      list.appendChild(li);
    }
  });
}

// ======== Start Exam =========
function startExam(title) {
  localStorage.setItem("currentExam", title);
  window.location.href = "exam.html"; // We'll build this page next!
}

// ======== Load Exam History =========
function loadHistory() {
  const history = JSON.parse(localStorage.getItem("examResults")) || [];
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const list = document.getElementById("examHistory");
  list.innerHTML = "";

  const userHistory = history.filter(h => h.email === loggedInUser.email);

  if (userHistory.length === 0) {
    list.innerHTML = "<p>No exam history yet.</p>";
    return;
  }

  userHistory.forEach((attempt) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${attempt.examTitle}</strong> - Score: <b>${attempt.score}%</b> 
      <em>(${new Date(attempt.date).toLocaleString()})</em>
    `;
    list.appendChild(li);
  });
}

// ======== Logout =========
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
});
