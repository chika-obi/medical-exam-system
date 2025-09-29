// ========= SIGNUP =========
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // SIGN UP FUNCTION
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullname = document.getElementById("fullname").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const role = document.getElementById("role").value;

      if (!fullname || !email || !password || !role) {
        alert("Please fill in all fields.");
        return;
      }

      let users = JSON.parse(localStorage.getItem("users")) || [];

      // Check if email already exists
      if (users.some((user) => user.email === email)) {
        alert("Email already registered. Please login.");
        return;
      }

      // Save new user
      users.push({ fullname, email, password, role });
      localStorage.setItem("users", JSON.stringify(users));
      alert("Registration successful! You can now log in.");
      window.location.href = "login.html";
    });
  }

  // ========= LOGIN =========
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      const users = JSON.parse(localStorage.getItem("users")) || [];

      const user = users.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        alert(`Welcome back, ${user.fullname}!`);
        // Redirect based on role
        if (user.role === "admin") {
          window.location.href = "admin-dashboard.html";
        } else {
          window.location.href = "student-dashboard.html";
        }
      } else {
        alert("Invalid email or password.");
      }
    });
  }
});
