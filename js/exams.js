/* exam.js — robust loader + exam flow (use in exam/exam.html) */

(function () {
  const QUESTION_PATHS = ["../data/questions.json", "/data/questions.json", "data/questions.json"];

  // DOM elements
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

  // results DOM
  const resultContainer = document.getElementById("resultContainer");
  const resultScore = document.getElementById("resultScore");
  const resultTitle = document.getElementById("resultTitle");
  const resultCorrect = document.getElementById("resultCorrect");
  const resultTotal = document.getElementById("resultTotal");
  const resultDate = document.getElementById("resultDate");
  const reviewList = document.getElementById("reviewList");
  const backToDashboard = document.getElementById("backToDashboard");

  // state
  let questions = [];
  let total = 0;
  let currentIndex = 0;
  let answers = {};
  let marked = {};
  let timer = null;
  let timeLeft = 60 * 60; // default 60 mins

  // load questions helper
  async function loadQuestionsIfNeeded() {
    // prefer localStorage
    try {
      const local = JSON.parse(localStorage.getItem("questions") || "null");
      if (Array.isArray(local) && local.length > 0) {
        questions = local;
        total = questions.length;
        console.log("Questions loaded from localStorage:", total);
        return;
      }
    } catch (e) { /* ignore */ }

    // attempt fetch from likely paths
    for (const p of QUESTION_PATHS) {
      try {
        const resp = await fetch(p);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          questions = data;
          total = questions.length;
          localStorage.setItem("questions", JSON.stringify(data));
          console.log("Questions fetched from", p, "count:", total);
          return;
        }
      } catch (err) {
        console.warn("fetch failed for", p, err);
      }
    }
    // still no questions
    total = 0;
    questions = [];
    throw new Error("No questions found in localStorage or at ../data/questions.json (or other paths).");
  }

  // expose start so consent.js calls it after consent
  window.__examStart = async function () {
    try {
      // hide consent and show exam (consent.js does that too)
      document.getElementById("consentModal")?.style.display = "none";
      if (examContainer) examContainer.style.display = "block";

      // ensure proctoring is started
      if (typeof window.__proctorStart === "function") {
        try { window.__proctorStart(); } catch(e){ console.warn(e); }
      }

      // load questions (await)
      await loadQuestionsIfNeeded();

      // set UI totals
      totalNumber.textContent = total;
      // initialize normal exam flow
      startExamFlow();
    } catch (err) {
      console.error("Exam start failed:", err);
      alert("Could not start exam: " + err.message + "\nMake sure data/questions.json is reachable and you are using a local web server.");
      // optional redirect back to dashboard:
      // window.location.href = "../student/student-dashboard.html";
    }
  };

  // only auto-start if there is no consent modal or it is hidden
  (function autoStartIfNoConsent() {
    const consentModal = document.getElementById("consentModal");
    if (!consentModal || consentModal.style.display === "none") {
      // call __examStart (it will handle its own errors)
      if (typeof window.__examStart === "function") window.__examStart();
    }
  })();

  /* ---------- Main exam functions (same as before) ---------- */
  function startExamFlow() {
    // setup UI
    totalNumber.textContent = total;
    renderQuestion(currentIndex);
    updateNavButtons();
    updateProgress();
    startTimer(); // starts with default timeLeft (you can customize)
  }

  function renderQuestion(index) {
    const q = questions[index];
    if (!q) {
      questionCard.innerHTML = "<p>Question unavailable.</p>";
      return;
    }
    currentNumber.textContent = index + 1;
    totalNumber.textContent = total;

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
      <div class="small-meta" style="margin-top:8px">${marked[index] ? '⚑ Marked for review' : ''}</div>
    `;

    const inputs = questionCard.querySelectorAll('input[name="answer"]');
    inputs.forEach(inp => inp.addEventListener("change", (e) => { answers[index] = e.target.value; updateProgress(); }));
  }

  function updateNavButtons() {
    prevBtn.style.display = currentIndex === 0 ? "none" : "inline-block";
    nextBtn.style.display = currentIndex === total - 1 ? "none" : "inline-block";
    submitBtn.style.display = currentIndex === total - 1 ? "inline-block" : "none";
    markBtn.textContent = marked[currentIndex] ? "☆ Unmark" : "☆ Mark";
  }

  prevBtn.addEventListener("click", () => { if (currentIndex>0) { currentIndex--; renderQuestion(currentIndex); updateNavButtons(); }});
  nextBtn.addEventListener("click", () => { if (currentIndex < total-1) { currentIndex++; renderQuestion(currentIndex); updateNavButtons(); }});
  markBtn.addEventListener("click", () => { marked[currentIndex] = !marked[currentIndex]; renderQuestion(currentIndex); updateNavButtons(); });

  submitBtn.addEventListener("click", () => {
    if (!confirm("Submit exam now?")) return;
    submitExam("manual");
  });

  exitExam.addEventListener("click", () => {
    if (!confirm("Exit exam? Progress will be lost.")) return;
    if (typeof window.__proctorStop === "function") window.__proctorStop();
    localStorage.removeItem("currentExam");
    window.location.href = "../student/student-dashboard.html";
  });

  // Timer
  function startTimer() {
    // set timeLeft from a saved autosave if exists (optional)
    updateTimerDisplay();
    timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timer);
        alert("Time is up. Submitting exam now.");
        submitExam("timeout");
      } else updateTimerDisplay();
    }, 1000);
  }
  function updateTimerDisplay(){
    const mins = Math.floor(timeLeft/60), secs = timeLeft%60;
    timerDisplay.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function updateProgress(){
    const answered = Object.keys(answers).length;
    const percent = total ? Math.round((answered/total)*100) : 0;
    progressBar.style.width = percent + "%";
  }

  function submitExam(trigger) {
    if (timer) { clearInterval(timer); timer = null; }
    if (typeof window.__proctorStop === "function") window.__proctorStop();

    let correct = 0;
    let perQuestion = [];
    for (let i=0;i<total;i++){
      const q = questions[i];
      const selected = answers[i] || null;
      const isCorrect = selected && selected === q.correctAnswer;
      if (isCorrect) correct++;
      perQuestion.push({ index: i+1, question: q.question, options: {A:q.optionA,B:q.optionB,C:q.optionC,D:q.optionD}, correctAnswer: q.correctAnswer, selected, isCorrect: !!isCorrect });
    }
    const score = total ? ((correct/total)*100).toFixed(2) : 0;
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
    const resultObj = { email: loggedInUser.email || "unknown", fullname: loggedInUser.fullname || "", examTitle: localStorage.getItem("currentExam") || "Exam", total, correct, score, date: new Date().toISOString(), perQuestion };
    const results = JSON.parse(localStorage.getItem("examResults") || "[]");
    results.push(resultObj);
    try { localStorage.setItem("examResults", JSON.stringify(results)); } catch(e){ console.warn(e); }
    localStorage.removeItem("currentExam");
    showResult(resultObj);
  }

  function showResult(resultObj) {
    examContainer.style.display = "none";
    resultContainer.style.display = "block";
    resultScore.textContent = resultObj.score + "%";
    resultTitle.textContent = resultObj.examTitle;
    resultCorrect.textContent = resultObj.correct;
    resultTotal.textContent = resultObj.total;
    resultDate.textContent = new Date(resultObj.date).toLocaleString();
    reviewList.innerHTML = "";
    resultObj.perQuestion.forEach(p => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `<h4>Q${p.index}: ${p.question}</h4>
        <div class="small-meta">Your: <span class="${p.isCorrect?'correct':'wrong'}">${p.selected||'No answer'}</span> — Correct: <strong>${p.correctAnswer}</strong></div>
        <div style="margin-top:8px"><ul style="padding-left:16px">
          <li><strong>A:</strong> ${p.options.A}</li>
          <li><strong>B:</strong> ${p.options.B}</li>
          <li><strong>C:</strong> ${p.options.C}</li>
          <li><strong>D:</strong> ${p.options.D}</li>
        </ul></div>`;
      reviewList.appendChild(div);
    });
  }

  backToDashboard.addEventListener("click", () => { window.location.href = "../student/student-dashboard.html"; });

  // autosave (optional) and restore omitted here for brevity
})();
