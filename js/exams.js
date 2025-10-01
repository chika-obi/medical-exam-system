/**
 * exam.js
 * Single-question-per-page exam flow + timer + auto-submit + detailed review
 *
 * Requirements:
 * - questions stored in localStorage under "questions" (array)
 * - loggedInUser in localStorage as "loggedInUser"
 * - currentExam stored in localStorage as "currentExam"
 * - proctor.js exposes __proctorStart() and __proctorStop()
 *
 * This script exposes window.__examStart() so consent.js can start the exam when user accepts.
 */

(function () {
  // config
  const EXAM_DURATION_MINUTES = 60; // 60 minutes
  const AUTO_SAVE_KEY = "examSavedAnswers"; // optional - not used heavily here

  // DOM
  const examContainer = document.getElementById("examContainer");
  const questionCard = document.getElementById("questionCard");
  const currentNumber = document.getElementById("currentNumber");
  const totalNumber = document.getElementById("totalNumber");
  const timerDisplay = document.getElementById("timerDisplay");
  const progressBar = document.getElementById("progressBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const markBtn = document.getElementById("markBtn");
  const exitExam = document.getElementById("exitExam");

  const resultContainer = document.getElementById("resultContainer");
  const resultScore = document.getElementById("resultScore");
  const resultTitle = document.getElementById("resultTitle");
  const resultCorrect = document.getElementById("resultCorrect");
  const resultTotal = document.getElementById("resultTotal");
  const resultDate = document.getElementById("resultDate");
  const reviewList = document.getElementById("reviewList");
  const backToDashboard = document.getElementById("backToDashboard");

  // state
  let questions = JSON.parse(localStorage.getItem("questions")) || [];
  let total = questions.length || 0;
  let currentIndex = 0;
  let answers = {}; // answers[index] = "A"/"B"/"C"/"D"
  let marked = {};  // flagged questions
  let timer = null;
  let timeLeft = EXAM_DURATION_MINUTES * 60; // seconds

  // show brief student meta
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
  document.getElementById("studentShort").textContent = loggedInUser.fullname || loggedInUser.email || "";

  // if no questions or no currentExam -> redirect to dashboard
  if (!total) {
    // Try fetching questions.json (in case dashboard didn't load it)
    fetch("../data/questions.json")
      .then(r => r.json())
      .then(data => {
        questions = data || [];
        total = questions.length;
        totalNumber.textContent = total;
        // keep page waiting for consent -> exam start begins later
      })
      .catch(err => {
        console.warn("No questions available", err);
        totalNumber.textContent = 0;
      });
  } else {
    totalNumber.textContent = total;
  }

  // Expose start function that consent.js will call once user agrees
  window.__examStart = function () {
    // reveal exam container
    document.getElementById("consentModal")?.style.display = "none";
    document.getElementById("examContainer").style.display = "block";

    // ensure proctoring (consent.js also calls __proctorStart())
    if (typeof window.__proctorStart === "function") {
      try { window.__proctorStart(); } catch(e) { console.warn("proctor start failed", e); }
    }

    // initialize exam flow only once
    if (!timer) startExamFlow();
  };

  // If consent modal is NOT present (or already hidden), start immediately
  (function autoStartIfNoConsent() {
    const consentModal = document.getElementById("consentModal");
    if (!consentModal) {
      // start immediately
      window.__examStart();
    } else if (consentModal.style.display === "none") {
      window.__examStart();
    }
  })();

  function startExamFlow() {
    // set totals
    totalNumber.textContent = total;
    renderQuestion(currentIndex);
    updateNavButtons();
    // start timer
    startTimer();
  }

  function renderQuestion(index) {
    const q = questions[index];
    if (!q) {
      questionCard.innerHTML = "<p>Question unavailable.</p>";
      return;
    }

    currentNumber.textContent = index + 1;
    totalNumber.textContent = total;

    // build options HTML
    const opts = ["A","B","C","D"].map(opt => {
      const text = q[`option${opt}`] || "";
      const checked = answers[index] === opt ? "checked" : "";
      return `<label class="${answers[index]===opt ? 'selected':''}">
                <input type="radio" name="answer" value="${opt}" ${checked} /> 
                <strong>${opt}:</strong> ${text}
              </label>`;
    }).join("");

    questionCard.innerHTML = `
      <h3>Q${index + 1}</h3>
      <div class="question-text">${q.question}</div>
      <div class="options">${opts}</div>
      <div class="small-meta" style="margin-top:8px">
        ${marked[index] ? '⚑ Marked for review' : ''}
      </div>
    `;

    // hook option change
    const inputs = questionCard.querySelectorAll('input[name="answer"]');
    inputs.forEach(inp => {
      inp.addEventListener("change", (e) => {
        answers[index] = e.target.value;
        updateProgress();
      });
    });

    updateProgress();
  }

  function updateNavButtons() {
    prevBtn.style.display = currentIndex === 0 ? "none" : "inline-block";
    nextBtn.style.display = currentIndex === total - 1 ? "none" : "inline-block";
    submitBtn.style.display = currentIndex === total - 1 ? "inline-block" : "none";
    markBtn.textContent = marked[currentIndex] ? "☆ Unmark" : "☆ Mark";
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion(currentIndex);
      updateNavButtons();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < total - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      updateNavButtons();
    }
  });

  markBtn.addEventListener("click", () => {
    marked[currentIndex] = !marked[currentIndex];
    renderQuestion(currentIndex);
    updateNavButtons();
  });

  submitBtn.addEventListener("click", () => {
    if (!confirm("Submit exam now? This will end the exam.")) return;
    submitExam("manual");
  });

  exitExam.addEventListener("click", () => {
    if (!confirm("Are you sure you want to exit? Your progress will be lost.")) return;
    // stop proctoring
    if (typeof window.__proctorStop === "function") window.__proctorStop();
    localStorage.removeItem("currentExam");
    window.location.href = "../student/student-dashboard.html";
  });

  // timer functions
  function startTimer() {
    // show initial time
    updateTimerDisplay();
    timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timer);
        alert("⏱ Time is up — exam will be submitted automatically.");
        submitExam("timeout");
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function updateProgress() {
    const answered = Object.keys(answers).length;
    const percent = total ? Math.round((answered / total) * 100) : 0;
    progressBar.style.width = percent + "%";
  }

  // calculate score and save results
  function submitExam(trigger) {
    // stop timer and proctor
    if (timer) { clearInterval(timer); timer = null; }
    if (typeof window.__proctorStop === "function") window.__proctorStop();

    // grade
    let correct = 0;
    const perQuestion = [];

    for (let i=0; i<total; i++) {
      const q = questions[i];
      const selected = answers[i] || null;
      const isCorrect = selected && selected === q.correctAnswer;
      if (isCorrect) correct++;
      perQuestion.push({
        index: i + 1,
        question: q.question,
        options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
        correctAnswer: q.correctAnswer,
        selected: selected,
        isCorrect: !!isCorrect
      });
    }

    const score = total === 0 ? 0 : ((correct / total) * 100).toFixed(2);

    const resultObj = {
      email: (loggedInUser.email || "unknown"),
      fullname: (loggedInUser.fullname || ""),
      examTitle: localStorage.getItem("currentExam") || "Exam",
      total,
      correct,
      score,
      date: new Date().toISOString(),
      perQuestion
    };

    // save to examResults array
    const results = JSON.parse(localStorage.getItem("examResults")) || [];
    results.push(resultObj);
    try {
      localStorage.setItem("examResults", JSON.stringify(results));
    } catch (e) {
      console.warn("Failed saving examResults", e);
    }

    // clear currentExam marker
    localStorage.removeItem("currentExam");

    // show result page
    showResult(resultObj);
  }

  function showResult(resultObj) {
    examContainer.style.display = "none";
    resultContainer.style.display = "block";

    resultScore.textContent = resultObj.score + "%";
    resultTitle.textContent = resultObj.examTitle || "Exam";
    resultCorrect.textContent = resultObj.correct;
    resultTotal.textContent = resultObj.total;
    resultDate.textContent = new Date(resultObj.date).toLocaleString();

    // build review
    reviewList.innerHTML = "";
    resultObj.perQuestion.forEach(p => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <h4>Q${p.index}: ${p.question}</h4>
        <div class="small-meta">Your answer: <span class="${p.isCorrect ? 'correct' : 'wrong'}">${p.selected || 'No answer'}</span> — Correct: <strong>${p.correctAnswer}</strong></div>
        <div style="margin-top:8px">
          <em>Options:</em>
          <ul style="padding-left:16px;margin-top:8px">
            <li><strong>A:</strong> ${p.options.A}</li>
            <li><strong>B:</strong> ${p.options.B}</li>
            <li><strong>C:</strong> ${p.options.C}</li>
            <li><strong>D:</strong> ${p.options.D}</li>
          </ul>
        </div>
      `;
      reviewList.appendChild(div);
    });
  }

  backToDashboard.addEventListener("click", () => {
    window.location.href = "../student/student-dashboard.html";
  });

  // autosave answers to localStorage periodically (optional)
  setInterval(() => {
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ answers, marked, currentIndex, timeLeft }));
    } catch(e) {}
  }, 5000);

  // on load, try restoring any autosaved answers (if user refreshed)
  (function restoreAutosave() {
    const saved = JSON.parse(localStorage.getItem(AUTO_SAVE_KEY) || "{}");
    if (saved && saved.answers) {
      answers = saved.answers || {};
      marked = saved.marked || {};
      currentIndex = saved.currentIndex || 0;
      if (typeof saved.timeLeft === "number") timeLeft = saved.timeLeft;
    }
  })();

  // protect against accidental navigation
  window.addEventListener("beforeunload", function (e) {
    if (timer) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
})();
