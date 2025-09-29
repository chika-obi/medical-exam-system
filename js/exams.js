// ======== Access Protection =========
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser || loggedInUser.role !== "student") {
    alert("Access denied! Students only.");
    window.location.href = "login.html";
  }

  const currentExam = localStorage.getItem("currentExam");
  if (!currentExam) {
    alert("No exam selected.");
    window.location.href = "student-dashboard.html";
  }

  document.getElementById("examTitle").innerText = currentExam;

  startExam();
});

// ======== Variables =========
let questions = JSON.parse(localStorage.getItem("questions")) || [];
let currentIndex = 0;
let answers = {};
let totalQuestions = questions.length;
let timeLeft = 60 * 10; // ⏱️ 10 minutes

document.getElementById("totalQuestions").textContent = totalQuestions;

// ======== Load Question =========
function loadQuestion(index) {
  const q = questions[index];
  if (!q) return;

  document.getElementById("currentQuestionNumber").textContent = index + 1;
  document.getElementById("questionBox").innerHTML = `
    <h3>${q.question}</h3>
    <div class="options">
      ${["A", "B", "C", "D"].map(
        (opt) => `
        <label>
          <input type="radio" name="answer" value="${opt}" ${
          answers[index] === opt ? "checked" : ""
        } />
          ${opt}: ${q[`option${opt}`]}
        </label>
      `
      ).join("")}
    </div>
  `;

  updateProgress();
  updateButtons();
}

// ======== Save Answer =========
document.addEventListener("change", (e) => {
  if (e.target.name === "answer") {
    answers[currentIndex] = e.target.value;
  }
});

// ======== Navigation =========
document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentIndex < totalQuestions - 1) {
    currentIndex++;
    loadQuestion(currentIndex);
  }
});

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    loadQuestion(currentIndex);
  }
});

function updateButtons() {
  document.getElementById("prevBtn").style.display =
    currentIndex === 0 ? "none" : "inline-block";
  document.getElementById("nextBtn").style.display =
    currentIndex === totalQuestions - 1 ? "none" : "inline-block";
  document.getElementById("submitBtn").style.display =
    currentIndex === totalQuestions - 1 ? "inline-block" : "none";
}
// before saving results / redirecting
if (typeof window.__proctorStop === "function") window.__proctorStop();


// ======== Submit Exam =========
document.getElementById("submitBtn").addEventListener("click", () => {
  if (Object.keys(answers).length < totalQuestions) {
    if (!confirm("You haven’t answered all questions. Submit anyway?")) return;
  }
  calculateScore();
});

// ======== Timer =========
function startExam() {
  loadQuestion(currentIndex);

  const timer = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("⏱️ Time is up! Submitting exam...");
      calculateScore();
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("timer").textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    timeLeft--;
  }, 1000);
}

// ======== Progress Bar =========
function updateProgress() {
  const answered = Object.keys(answers).length;
  const progressPercent = (answered / totalQuestions) * 100;
  document.getElementById("progress").style.width = `${progressPercent}%`;
}

// ======== Calculate Score =========
function calculateScore() {
  let correct = 0;
  questions.forEach((q, index) => {
    if (answers[index] === q.correctAnswer) correct++;
  });

  const score = ((correct / totalQuestions) * 100).toFixed(2);
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const results = JSON.parse(localStorage.getItem("examResults")) || [];

  results.push({
    email: loggedInUser.email,
    examTitle: localStorage.getItem("currentExam"),
    score,
    date: new Date().toISOString(),
  });

  localStorage.setItem("examResults", JSON.stringify(results));

  alert(`✅ Exam submitted! Your score: ${score}%`);
  localStorage.removeItem("currentExam");
  window.location.href = "student-dashboard.html";
}

// ======== Exit Exam =========
document.getElementById("exitExam").addEventListener("click", () => {
  if (confirm("Are you sure you want to exit? Your progress will be lost.")) {
    localStorage.removeItem("currentExam");
    window.location.href = "student-dashboard.html";
  }
});
function calculateScore() {
  // stop proctoring BEFORE saving results and redirecting
  if (typeof window.__proctorStop === "function") window.__proctorStop();

  // ... existing score calculation & save logic ...
}
document.getElementById("exitExam").addEventListener("click", () => {
  if (confirm("Are you sure you want to exit? Your progress will be lost.")) {
    if (typeof window.__proctorStop === "function") window.__proctorStop();
    localStorage.removeItem("currentExam");
    window.location.href = "student-dashboard.html";
  }
});

