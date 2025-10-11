// ========== auth.js (single source of truth for signup validation) ==========
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // ======= CONFIG =======
  // Make sure this matches the code you expect in signup.html (adminAccessDiv input)
  const SECRET_ADMIN_CODE = "ADMIN-ACCESS-2025";

  // ======= SIGN UP =======
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullname = document.getElementById("fullname")?.value.trim() || "";
      const email = document.getElementById("email")?.value.trim() || "";
      const password = document.getElementById("password")?.value.trim() || "";
      const role = document.getElementById("role")?.value || "";

      // read admin code only if the element exists
      const adminAccessCode = document.getElementById("adminAccessCode")
        ? document.getElementById("adminAccessCode").value.trim()
        : "";

      // basic validation
      if (!fullname || !email || !password || !role) {
        alert("⚠️ Please fill in all fields.");
        return;
      }

      let users = JSON.parse(localStorage.getItem("users")) || [];

      // Check if email already exists
      if (users.some((u) => u.email === email)) {
        alert("Email already registered. Please login.");
        return;
      }

      // Enforce admin access code here (single check)
      if (role === "admin") {
        if (adminAccessCode !== SECRET_ADMIN_CODE) {
          alert("⛔ Unauthorized! Invalid Admin Access Code.");
          return; // STOP — do not save any user
        }
      }

      // Save valid user only
      users.push({ fullname, email, password, role });
      localStorage.setItem("users", JSON.stringify(users));

      alert("✅ Registration successful! You can now log in.");
      window.location.href = "login.html";
    });
  }

  // ======= LOGIN =======
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail")?.value.trim() || "";
      const password = document.getElementById("loginPassword")?.value.trim() || "";

      const users = JSON.parse(localStorage.getItem("users")) || [];

      const user = users.find((u) => u.email === email && u.password === password);

      if (!user) {
        alert("Invalid email or password.");
        return;
      }

      // Save session and redirect by role
      localStorage.setItem("loggedInUser", JSON.stringify(user));
      alert(`Welcome back, ${user.fullname}!`);

      if (user.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "student-dashboard.html";
      }
    });
  }
});
