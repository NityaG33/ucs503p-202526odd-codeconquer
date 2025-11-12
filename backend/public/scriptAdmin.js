// scriptAdmin.js
async function fetchMenuAndStats() {
  try {
    // fetch menus (route defined in routes/admin.js and mounted at /api/admin)
    const response = await fetch("/api/admin/menus");
    if (!response.ok) throw new Error("Failed to fetch menus");
    const menus = await response.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize

    const todayMenu = menus.find((m) => {
      const menuDate = new Date(m.date);
      menuDate.setHours(0, 0, 0, 0);
      return menuDate.getTime() === today.getTime();
    });

    const menuContainer = document.getElementById("menu");

    if (!todayMenu) {
      menuContainer.innerHTML = `<p>No menu available for today.</p>`;
      return;
    }

    // fetch stats for the selected date (use yyyy-mm-dd)
    const isoDate = today.toISOString().split("T")[0];
    const statsRes = await fetch(`/api/admin/meal-stats?date=${encodeURIComponent(isoDate)}`);
    if (!statsRes.ok) throw new Error("Failed to fetch stats");
    const stats = await statsRes.json(); // array with breakfast/lunch/dinner entries

    // convert stats array to object for easy lookup
    const statsByMeal = {};
    stats.forEach(s => statsByMeal[s.mealType] = s);

    const dayName = new Date(todayMenu.date).toLocaleString("en-US", { weekday: "long" });

    let html = `<h2>${dayName}'s Menu</h2>`;
    html += `
      <div class="meal">
        <h3>Breakfast</h3>
        <p>${todayMenu.breakfast}</p>
        <p><strong>YES:</strong> ${statsByMeal.breakfast?.yesCount ?? 0} |
           <strong>NO:</strong> ${statsByMeal.breakfast?.noCount ?? 0}</p>
      </div>
      <div class="meal">
        <h3>Lunch</h3>
        <p>${todayMenu.lunch}</p>
        <p><strong>YES:</strong> ${statsByMeal.lunch?.yesCount ?? 0} |
           <strong>NO:</strong> ${statsByMeal.lunch?.noCount ?? 0}</p>
      </div>
      <div class="meal">
        <h3>Dinner</h3>
        <p>${todayMenu.dinner}</p>
        <p><strong>YES:</strong> ${statsByMeal.dinner?.yesCount ?? 0} |
           <strong>NO:</strong> ${statsByMeal.dinner?.noCount ?? 0}</p>
      </div>
    `;

    menuContainer.innerHTML = html;
  } catch (err) {
    console.error("Admin fetch error:", err);
    document.getElementById("menu").innerHTML = `<p class="muted">Error loading menu or stats.</p>`;
  }
}

fetchMenuAndStats();

// optional: auto-refresh every 20s so admin sees changes without reload
setInterval(fetchMenuAndStats, 20000);



// /* Simple framework-free frontend for Mess Manager
//    - Talks to: http://localhost:4000
//    - Features: login/register, dashboard points, weekly meals, attendance marking (YES/NO), QR display, points view
// */

// const API = "http://localhost:4000";

// ///// Utilities /////
// function $(sel, parent = document) { return parent.querySelector(sel); }
// function $all(sel, parent = document) { return Array.from((parent || document).querySelectorAll(sel)); }

// function normalizeKey(obj, key) {
//   // read both lower_case and UPPER_CASE (Oracle driver often returns uppercase)
//   if (!obj) return undefined;
//   if (key in obj) return obj[key];
//   const up = key.toUpperCase();
//   const low = key.toLowerCase();
//   if (up in obj) return obj[up];
//   if (low in obj) return obj[low];
//   // sometimes columns have different names
//   return undefined;
// }

// function saveUser(user) { localStorage.setItem("mm_user", JSON.stringify(user)); }
// function loadUser() { try { return JSON.parse(localStorage.getItem("mm_user")); } catch (e) { return null; } }
// function removeUser() { localStorage.removeItem("mm_user"); }

// ///// State & elements /////
// const sidebar = $("#sidebar");
// const sidebarUsername = $("#sidebar-username");
// const logoutBtn = $("#logoutBtn");

// const pages = {
//   login: $("#page-login"),
//   dashboard: $("#page-dashboard"),
//   meals: $("#page-meals"),
//   attendance: $("#page-attendance"),
//   points: $("#page-points")
// };

// const loginForm = $("#loginForm");
// const nameInput = $("#name");
// const emailInput = $("#email");

// const welcomeHeading = $("#welcomeHeading");
// const pointsCount = $("#pointsCount");
// const pointsLarge = $("#pointsLarge");

// const mealsContainer = $("#mealsContainer");
// const qrContainer = $("#qrContainer");

// let currentUser = loadUser();

// ///// Navigation helpers /////
// function showPage(pageName) {
//   Object.values(pages).forEach(p => p.classList.add("hidden"));
//   const p = pages[pageName];
//   if (p) p.classList.remove("hidden");
//   // highlight nav link
//   $all(".nav-link").forEach(a => a.classList.remove("active"));
//   const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
//   if (activeLink) activeLink.classList.add("active");
// }

// $all(".nav-link").forEach(a => {
//   a.addEventListener("click", (e) => {
//     e.preventDefault();
//     const page = a.getAttribute("data-page");
//     navigateTo(page);
//   });
// });

// function navigateTo(page) {
//   // require login for pages other than login
//   if (!currentUser && page !== "login") {
//     showPage("login");
//     return;
//   }
//   if (page === "dashboard") {
//     renderDashboard();
//   } else if (page === "meals") {
//     renderMeals();
//   } else if (page === "attendance") {
//     renderAttendance();
//   } else if (page === "points") {
//     renderPoints();
//   }
//   showPage(page);
// }

// ///// Auth /////
// async function apiAuth(name, email) {
//   const res = await fetch(`${API}/api/auth`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ name, email })
//   });
//   if (!res.ok) {
//     const t = await res.json().catch(()=>({}));
//     throw new Error(t?.error || `Auth failed (${res.status})`);
//   }
//   const data = await res.json();
//   return data.user;
// }

// loginForm.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   const name = nameInput.value.trim();
//   const email = emailInput.value.trim();
//   if (!name || !email) return alert("Enter name and email");
//   try {
//     const user = await apiAuth(name, email);
//     currentUser = user;
//     saveUser(user);
//     onLogin();
//   } catch (err) {
//     console.error("Login error:", err);
//     alert("Login failed. Check backend and try again.");
//   }
// });

// logoutBtn.addEventListener("click", () => {
//   currentUser = null;
//   removeUser();
//   // remove any stored QR for this user
//   localStorage.removeItem("mm_activeQR");
//   showPage("login");
//   sidebar.classList.add("hidden");
// });

// function onLogin() {
//   // update sidebar
//   sidebar.classList.remove("hidden");
//   const displayName = normalizeKey(currentUser, "NAME") || normalizeKey(currentUser, "name") || normalizeKey(currentUser, "EMAIL") || "Student";
//   sidebarUsername.textContent = displayName;
//   // go to dashboard
//   navigateTo("dashboard");
//   // fetch initial data
//   fetchAndRenderPoints();
//   // listen for other tabs / storage changes for QR updates
// }

// window.addEventListener("storage", (e) => {
//   // listen for mm_activeQR changes and re-render attendance
//   if (e.key === "mm_activeQR") {
//     renderAttendance();
//   }
// });

// ///// Points /////
// async function fetchPoints(userId) {
//   try {
//     const res = await fetch(`${API}/api/points/${encodeURIComponent(userId)}`);
//     if (!res.ok) throw new Error("Failed to fetch points");
//     const data = await res.json();
//     const points = data.points ?? data.POINTS ?? 0;
//     return Number(points);
//   } catch (err) {
//     console.error("fetchPoints error:", err);
//     return 0;
//   }
// }

// async function fetchAndRenderPoints() {
//   if (!currentUser) return;
//   const uid = normalizeKey(currentUser, "USER_ID") || normalizeKey(currentUser, "user_id") || normalizeKey(currentUser, "ID");
//   const pts = await fetchPoints(uid);
//   pointsCount.textContent = pts;
//   pointsLarge.textContent = `${pts} pts`;
// }

// function renderDashboard() {
//   const name = normalizeKey(currentUser, "NAME") || normalizeKey(currentUser, "name") || "Student";
//   welcomeHeading.textContent = `Welcome ${name}`;
//   fetchAndRenderPoints();
// }

// function renderPoints() {
//   // same as dashboard points display
//   fetchAndRenderPoints();
//   // show page (done by navigateTo)
// }

// ///// Meals & Attendance /////
// async function fetchMenu() {
//   try {
//     const res = await fetch(`${API}/api/menu`);
//     if (!res.ok) throw new Error("Failed to fetch menu");
//     const data = await res.json();
//     return Array.isArray(data) ? data : [];
//   } catch (err) {
//     console.error("fetchMenu error:", err);
//     return [];
//   }
// }

// function groupByDay(menuRows) {
//   // normalize keys and group into days 1..5
//   const groups = [1,2,3,4,5].map(d => ({ day: d, meals: [] }));
//   menuRows.forEach(row => {
//     const day = Number(normalizeKey(row, "day_of_week") ?? normalizeKey(row, "DAY_OF_WEEK") ?? normalizeKey(row, "day") ?? 0);
//     const item = {
//       menu_id: normalizeKey(row, "menu_id") ?? normalizeKey(row, "MENU_ID"),
//       meal_name: normalizeKey(row, "meal_name") ?? normalizeKey(row, "MEAL_NAME"),
//       meal_type: normalizeKey(row, "meal_type") ?? normalizeKey(row, "MEAL_TYPE"),
//       meal_time: normalizeKey(row, "meal_time") ?? normalizeKey(row, "MEAL_TIME")
//     };
//     const idx = groups.findIndex(g => g.day === day);
//     if (idx !== -1) groups[idx].meals.push(item);
//   });
//   return groups;
// }

// const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

// async function renderMeals() {
//   mealsContainer.innerHTML = `<p class="muted">Loading menu...</p>`;
//   const rows = await fetchMenu();
//   const grouped = groupByDay(rows);
//   if (!grouped.some(g => g.meals.length)) {
//     mealsContainer.innerHTML = `<p class="muted">No meals scheduled.</p>`;
//     return;
//   }

//   const wrapper = document.createElement("div");
//   grouped.forEach(group => {
//     const dayDiv = document.createElement("div");
//     dayDiv.className = "day-section";
//     const h = document.createElement("h3");
//     h.textContent = dayNames[group.day - 1] || `Day ${group.day}`;
//     dayDiv.appendChild(h);

//     if (group.meals.length === 0) {
//       const p = document.createElement("p");
//       p.textContent = "No meals scheduled";
//       dayDiv.appendChild(p);
//     } else {
//       group.meals.forEach(m => {
//         const row = document.createElement("div");
//         row.className = "meal-row";
//         const span = document.createElement("span");
//         span.textContent = `${m.meal_name || "Meal"} (${m.meal_type || "type"}) ${m.meal_time ? `@ ${m.meal_time}` : ""}`;
//         row.appendChild(span);

//         const controls = document.createElement("div");
//         controls.style.display = "flex";
//         controls.style.gap = "8px";

//         const yesBtn = document.createElement("button");
//         yesBtn.textContent = "Yes";
//         yesBtn.addEventListener("click", () => markAttendance(m.menu_id, "YES"));

//         const noBtn = document.createElement("button");
//         noBtn.textContent = "No";
//         noBtn.addEventListener("click", () => markAttendance(m.menu_id, "NO"));

//         controls.appendChild(yesBtn);
//         controls.appendChild(noBtn);
//         row.appendChild(controls);

//         dayDiv.appendChild(row);
//       });
//     }

//     wrapper.appendChild(dayDiv);
//   });

//   mealsContainer.innerHTML = "";
//   mealsContainer.appendChild(wrapper);
// }

// async function markAttendance(menu_id, response) {
//   if (!currentUser) return alert("Please login first.");
//   const uid = normalizeKey(currentUser, "USER_ID") || normalizeKey(currentUser, "user_id") || normalizeKey(currentUser, "ID");
//   if (!uid) return alert("User ID missing.");

//   try {
//     const res = await fetch(`${API}/api/attendance`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ user_id: uid, menu_id, response })
//     });

//     if (!res.ok) {
//       if (res.status === 409) {
//         alert("You have already responded to this meal.");
//         return;
//       } else {
//         const t = await res.json().catch(()=>({}));
//         throw new Error(t?.error || `Attendance failed (${res.status})`);
//       }
//     }

//     const data = await res.json();
//     await fetchAndRenderPoints();

//     if (response === "YES" && data.token) {
//       // save token to localStorage (so Attendance page and other tabs can display)
//       localStorage.setItem("mm_activeQR", data.token);
//       alert("YES marked! QR generated.");
//       // trigger storage event for same-tab listeners
//       window.dispatchEvent(new Event("storage"));
//     } else {
//       // remove active QR
//       localStorage.removeItem("mm_activeQR");
//       alert("NO marked!");
//       window.dispatchEvent(new Event("storage"));
//     }
//   } catch (err) {
//     console.error("markAttendance error:", err);
//     alert("Error marking attendance: " + (err.message || ""));
//   }
// }

// function renderAttendance() {
//   const token = localStorage.getItem("mm_activeQR");
//   qrContainer.innerHTML = "";
//   if (token) {
//     // Use Google Chart API to render QR quickly (no libs)
//     const box = document.createElement("div");
//     box.className = "qr-box";
//     const img = document.createElement("img");
//     img.alt = "QR code";
//     const size = 200;
//     img.src = `${API}/api/qr/${encodeURIComponent(token)}`;
//     const p = document.createElement("p");
//     p.textContent = "Show this QR to staff to get +15 points";
//     box.appendChild(img);
//     box.appendChild(p);
//     qrContainer.appendChild(box);
//   } else {
//     qrContainer.innerHTML = `<p class="muted">No active QR. Mark “YES” in Weekly Meals to generate one.</p>`;
//   }
// }

// ///// Init UI on load /////
// function initUI() {
//   // show login or main
//   if (currentUser) {
//     sidebar.classList.remove("hidden");
//     sidebarUsername.textContent = normalizeKey(currentUser, "NAME") || normalizeKey(currentUser, "name") || "Student";
//     navigateTo("dashboard");
//   } else {
//     sidebar.classList.add("hidden");
//     showPage("login");
//   }

//   // attach initial handlers
//   // clicking "home" quickly: dashboard
//   document.addEventListener("click", (e) => {
//     if (e.target.matches("[data-page]")) {
//       e.preventDefault();
//       const p = e.target.getAttribute("data-page");
//       navigateTo(p);
//     }
//   });
// }

// // run
// initUI();
