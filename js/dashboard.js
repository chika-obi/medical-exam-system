// Fetch questions.json and save them into localStorage
fetch("../data/questions.json")
  .then(res => res.json())
  .then(data => {
    localStorage.setItem("questions", JSON.stringify(data));
    console.log("✅ Questions loaded into localStorage");
  })
  .catch(err => console.error("❌ Failed to load questions:", err));

  document.addEventListener("DOMContentLoaded", () => {
  const result = JSON.parse(localStorage.getItem("examResult"));
  if (result) {
    document.getElementById("examResultBox").innerHTML = `
      <h3>📊 Last Exam Results</h3>
      <p>Exam: ${result.examTitle}</p>
      <p>Score: <strong>${result.score}%</strong></p>
      <p>Correct Answers: ${result.correct}/${result.total}</p>
    `;
  }
});
