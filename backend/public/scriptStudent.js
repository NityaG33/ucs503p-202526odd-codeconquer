
const API = "";

function $(sel, parent = document) { return parent.querySelector(sel); }
function $all(sel, parent = document) { return Array.from((parent || document).querySelectorAll(sel)); }

function saveUser(user) { localStorage.setItem("mm_user", JSON.stringify(user)); }
function loadUser() { try { return JSON.parse(localStorage.getItem("mm_user")); } catch { return null; } }
function removeUser() { localStorage.removeItem("mm_user"); }

const sidebar = $("#sidebar");
const sidebarUsername = $("#sidebar-username");
const logoutBtn = $("#logoutBtn");

const pages = {
  login: $("#page-login"),
  dashboard: $("#page-dashboard"),
  meals: $("#page-meals"),
  attendance: $("#page-attendance"),
  points: $("#page-points")
};

const loginForm = $("#loginForm");
const nameInput = $("#name");
const emailInput = $("#email");

const welcomeHeading = $("#welcomeHeading");
const pointsCount = $("#pointsCount");
const pointsLarge = $("#pointsLarge");

const mealsContainer = $("#mealsContainer");
const qrContainer = $("#qrContainer");

let currentUser = loadUser();

//// Navigation ////
function showPage(pageName) {
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  const p = pages[pageName];
  if (p) p.classList.remove("hidden");
}

function navigateTo(page) {
  if (!currentUser && page !== "login") return showPage("login");

  if (page === "dashboard") renderDashboard();
  else if (page === "meals") renderMeals();
  else if (page === "attendance") renderAttendance();
  else if (page === "points") renderPoints();

  showPage(page);
}

$all(".nav-link").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    navigateTo(a.getAttribute("data-page"));
  });
});

//// Auth ////
async function apiAuth(name, email) {
  const res = await fetch(`${API}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Auth failed");
  return data.user;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  if (!name || !email) return alert("Enter name and email");
  try {
    const user = await apiAuth(name, email);
    currentUser = user;
    saveUser(user);
    onLogin();
  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed. Check backend and try again.");
  }
});

logoutBtn.addEventListener("click", () => {
  currentUser = null;
  removeUser();
  localStorage.removeItem("mm_activeQR");
  sidebar.classList.add("hidden");
  showPage("login");
});

function onLogin() {
  sidebar.classList.remove("hidden");
  sidebarUsername.textContent = currentUser.name || currentUser.email || "Student";
  navigateTo("dashboard");
  fetchAndRenderPoints();
}

//// Points ////
async function fetchAndRenderPoints() {
  if (!currentUser) return;
  const res = await fetch(`${API}/api/points/${currentUser._id}`);
  const data = await res.json();
  const pts = data.points ?? 0;
  pointsCount.textContent = pts;
  pointsLarge.textContent = `${pts} pts`;
}

function renderDashboard() {
  welcomeHeading.textContent = `Welcome ${currentUser.name || "Student"}`;
  fetchAndRenderPoints();
}

function renderPoints() {
  fetchAndRenderPoints();
}

//// Meals (only NO button logic) ////
async function renderMeals() {
  mealsContainer.innerHTML = `<p class="muted">Loading menu...</p>`;

  const res = await fetch(`${API}/api/menu`);
  const menu = await res.json();
  console.log("Menu from API:", menu);

  if (!menu.length) {
    mealsContainer.innerHTML = `<p class="muted">No meals scheduled.</p>`;
    return;
  }

  // Convert current time to IST
// ✅ Correct IST time
const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const currentHour = nowIST.getHours();
console.log("🕒 Current IST hour:", currentHour);

  // Determine which meal to show
  let currentMealType = null;
  if (currentHour >= 5 && currentHour < 9) currentMealType = "breakfast";
  else if (currentHour >= 10 && currentHour < 15) currentMealType = "lunch";
  else if (currentHour >= 16 && currentHour <= 21) currentMealType = "dinner";

  // Find today's menu entry (compare dates in IST)
  const todayMenu = menu.find(m => {
    const menuUTC = new Date(m.date);
    const menuIST = new Date(menuUTC.getTime() + 5.5 * 60 * 60 * 1000);
    return (
      menuIST.getFullYear() === nowIST.getFullYear() &&
      menuIST.getMonth() === nowIST.getMonth() &&
      menuIST.getDate() === nowIST.getDate()
    );
  });

  console.log("✅ Found todayMenu:", todayMenu);

  mealsContainer.innerHTML = "";

  if (!todayMenu) {
    mealsContainer.innerHTML = `<p class="muted">No menu found for today.</p>`;
    return;
  }

  if (!currentMealType) {
    mealsContainer.innerHTML = `<p class="muted">No meals available at this time.</p>`;
    return;
  }

  const mealName = todayMenu[currentMealType] || "Not available";
  
  // Create meal row
  const row = document.createElement("div");
  row.className = "meal-row";
  row.setAttribute("data-menu-id", todayMenu._id);
  row.innerHTML = `
    <span>${mealName} (${currentMealType.toUpperCase()})</span>
    <div>
      <button class="no-btn">Skip Meal (NO)</button>
    </div>
  `;
  mealsContainer.appendChild(row);

  const noBtn = row.querySelector(".no-btn");

  // --- Skip meal logic ---
  noBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser._id,
          menu_id: todayMenu._id,
          meal_type: currentMealType,
          response: "NO"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Already marked NO");
      } else {
        noBtn.disabled = true;
        noBtn.textContent = "Skipped";
      }
    } catch (err) {
      console.error("Attendance error:", err);
    }
  });

  // --- Disable skip button after cutoff (IST-based) ---
  const cutoffTimes = {
    breakfast: 6,
    lunch: 12,
    dinner: 17, // 5:00 PM cutoff
  };

  const cutoffHour = cutoffTimes[currentMealType];
  if (currentHour >= cutoffHour) {
    noBtn.disabled = true;
    noBtn.textContent = "Cutoff passed";
    noBtn.classList.add("disabled-btn");
  }
}



//// Mark attendance (simplified for only NO button logic) ////
async function markAttendance(menu_id, response,meal_type) {
  if (!currentUser) return alert("Please login first.");

  try {
    const res = await fetch(`${API}/api/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser._id,
        menu_id,
        response ,// only NO will be sent
        meal_type,
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to mark attendance.");
      return;
    }

    alert("You have skipped today’s meal. No QR will be issued.");

    // Remove any active QR for today (since NO)
    localStorage.removeItem("mm_activeQR");
    renderAttendance();
    fetchAndRenderPoints();
  } catch (err) {
    console.error(err);
    alert("Error marking attendance.");
  }
}


function renderAttendance() {
  const token = localStorage.getItem("mm_activeQR");
  qrContainer.innerHTML = "";
  if (token) {
    const img = document.createElement("img");
    img.src = `${API}/api/qr/${encodeURIComponent(token)}`;
    img.alt = "QR Code";
    qrContainer.appendChild(img);
  } else {
    qrContainer.innerHTML = `<p class="muted">No active QR.</p>`;
  }
 

}


//// Init ////
function initUI() {
  if (currentUser) {
    sidebar.classList.remove("hidden");
    sidebarUsername.textContent = currentUser.name || "Student";
    navigateTo("dashboard");

    // ✅ Global auto-QR refresh every 30s
    setInterval(async () => {
      try {
        if (!currentUser || !currentUser._id) return;
        const res = await fetch(`${API}/api/activeQR/${currentUser._id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.token && data.token !== localStorage.getItem("mm_activeQR")) {
            localStorage.setItem("mm_activeQR", data.token);
            renderAttendance(); // show QR automatically
          }
        }
      } catch (err) {
        console.error("Global QR refresh error:", err);
      }
    }, 30000);

  } else {
    sidebar.classList.add("hidden");
    showPage("login");
  }
}

initUI();
