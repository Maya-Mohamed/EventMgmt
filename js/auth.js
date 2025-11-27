

// 1) SIGN UP (USER OR ADMIN)

function signUp() {
  let name = document.getElementById("name").value.trim();
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value.trim();
  let confirmPassword = document.getElementById("confirmPassword").value.trim();
  let isAdmin = document.getElementById("is_admin").checked;
  let role = isAdmin ? "admin" : "user";

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    alert("All fields are required!");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if email already exists
  let exists = users.find((user) => user.email === email);
  if (exists) {
    alert("Email already exists!");
    return;
  }

  // Create new user
  let newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role,
  };

  // Save to localStorage
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created successfully!");
   window.location.href = "login.html";
}


// 2) LOGIN SYSTEM
function login() {
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();

    // Get all users
    let users = JSON.parse(localStorage.getItem("users")) || [];

    // Find user
    let currentUser = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (!currentUser) {
        alert("Invalid email or password!");
        return;
    }

    // Save logged-in user in sessionStorage
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    // Redirect based on role
    if (currentUser.role === "admin") {
        alert("Welcome Admin!");
        window.location.href = "admin.html";
    } else {
        alert("Welcome User!");
        window.location.href = "registered.html";
    }
}


// 3) CHECK LOGIN STATUS IN ANY PAGE

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem("currentUser"));
}

// Protect any page that needs login
function protectPage(requiredRole = null) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    alert("Access Denied");
    window.location.href = "index.html";
  }
}


// 4) DYNAMIC NAVBAR RENDERING

function renderNavbar() {
  const currentUser = getCurrentUser();
  const nav = document.getElementById("navbar");

  if (!nav) return;

  if (!currentUser) {
    nav.innerHTML = `
            <img src="logo-removebg.png" alt="EventEase Logo" class="logo">
  
  <!-- Menu Toggle Checkbox -->
  <input type="checkbox" id="menu-toggle">
  <label for="menu-toggle" class="menu-icon">&#9776;</label>
  
  <!-- Menu Links -->
  <ul class="menu">
    <li><a href="index.html">Home</a></li>
    <li><a href="events.html">View Events</a></li>
    <li><a href="signup.html">Sign Up</a></li>
    <li><a href="login.html">Login</a></li>
  </ul>
        `;
    return;
  }

  if (currentUser.role === "user") {
    nav.innerHTML = `
            <a href="events.html">Events</a>
            <a href="registered.html">My Registrations</a>
            <a href="#" onclick="logout()">Logout</a>
        `;
  }

  if (currentUser.role === "admin") {
    nav.innerHTML = `
            <a href="admin.html">Dashboard</a>
            <a href="manageUsers.html">Manage Users</a>
            <a href="#" onclick="logout()">Logout</a>
        `;
  }
}

// =========================
// 5) LOGOUT
// =========================
function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

// =========================
// AUTO EXECUTE NAVBAR ON EVERY PAGE
// =========================
document.addEventListener("DOMContentLoaded", renderNavbar);
