const app = document.querySelector("#app");
let selectedRole = "admin",
  currentUser = JSON.parse(localStorage.getItem("shelfwise_user") || "null"),
  authToken = localStorage.getItem("shelfwise_token"),
  state = null;
async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
  const response = await fetch(path, { ...options, headers });
  if (response.status === 403) {
    localStorage.clear();
    currentUser = null;
    authToken = null;
    loginView();
    throw new Error("Your session has ended.");
  }
  return response;
}
const icons = {
  Dashboard: "⌂",
  Catalog: "▤",
  Circulation: "↗",
  Members: "♙",
  Reports: "◒",
  Browse: "⌕",
  "My loans": "◷",
};
const cap = (s) =>
  s
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);
function loginView() {
  app.innerHTML = `<section class="login"><div class="login-side"><div class="brand"><i class="brand-mark">S</i> shelfwise</div><div><h1>A calmer way to run your library.</h1><p>Bring your collection, members, and daily circulation together in one beautifully simple workspace.</p></div><div class="quote">“Knowledge is a garden. A library is its keeper.”</div></div><div class="login-form"><form class="form-card" id="loginForm"><h2>Welcome back</h2><p>Sign in to your library workspace.</p><div class="role-tabs">${["admin", "librarian", "member"].map((r) => `<button type="button" data-role="${r}" class="${r === selectedRole ? "active" : ""}">${r[0].toUpperCase() + r.slice(1)}</button>`).join("")}</div><label class="field">Email<input id="email" type="email" value="${selectedRole === "admin" ? "aarav" : selectedRole === "librarian" ? "maya" : "noah"}@shelfwise.io"></label><label class="field">Password<input id="password" type="password" value="${selectedRole === "admin" ? "admin123" : selectedRole === "librarian" ? "library123" : "member123"}"></label><div class="error" id="error"></div><button class="primary">Sign in to Shelfwise</button><div class="hint">Demo credentials are pre-filled for the selected role.</div></form></div></section>`;
  document.querySelectorAll("[data-role]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedRole = b.dataset.role;
        loginView();
      }),
  );
  document.querySelector("#loginForm").onsubmit = login;
}
async function login(e) {
  e.preventDefault();
  let r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, password: password.value }),
  });
  if (!r.ok) {
    error.textContent = "Those details do not match our records.";
    return;
  }
  let result = await r.json();
  currentUser = result.user;
  authToken = result.token;
  localStorage.setItem("shelfwise_user", JSON.stringify(currentUser));
  localStorage.setItem("shelfwise_token", authToken);
  init();
}
async function init() {
  state = await (await api("/api/dashboard")).json();
  render("Dashboard");
}
function sidebar(active) {
  let nav =
    currentUser.role === "member"
      ? ["Browse", "My loans"]
      : currentUser.role === "librarian"
        ? ["Dashboard", "Catalog", "Circulation", "Members"]
        : ["Dashboard", "Catalog", "Circulation", "Members", "Reports"];
  return `<aside class="sidebar"><div class="brand"><i class="brand-mark">S</i> shelfwise</div><div>${nav.map((n) => `<div class="nav-item ${active === n ? "active" : ""}" data-page="${n}"><span>${icons[n]}</span>${n}</div>`).join("")}</div><div class="nav-item logout" id="logout">↪ Sign out</div></aside>`;
}
function shell(page, body) {
  app.innerHTML = `<div class="layout">${sidebar(page)}<section class="content"><header class="topbar"><div class="greeting"><h1>${page === "Dashboard" ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${currentUser.name.split(" ")[0]}` : page}</h1><p>${page === "Dashboard" ? "Here is what is happening in your library today." : `Manage your library ${page.toLowerCase()} with ease.`}</p></div><div class="profile"><span>${currentUser.role[0].toUpperCase() + currentUser.role.slice(1)}</span><div class="avatar">${cap(currentUser.name)}</div></div></header>${body}</section></div>`;
  document
    .querySelectorAll("[data-page]")
    .forEach((x) => (x.onclick = () => render(x.dataset.page)));
  logout.onclick = async () => {
    await api("/api/logout", { method: "POST" });
    localStorage.clear();
    currentUser = null;
    authToken = null;
    loginView();
  };
}
function bookCell(b) {
  return `<div class="book-cell"><i class="cover" style="background:${b.color}">${b.title[0]}</i><div>${b.title}<small style="display:block;color:#7c879a;font-weight:400;margin-top:3px">${b.author}</small></div></div>`;
}
function dashboard() {
  let overdue = state.loans.filter((l) => l.status === "Overdue").length;
  let stats =
    currentUser.role === "admin"
      ? [
          [
            "TOTAL BOOKS",
            state.books.reduce((a, b) => a + b.copies, 0),
            "↑ 12 added this month",
          ],
          ["ACTIVE MEMBERS", "1,284", "↑ 8.2% from last month"],
          ["BOOKS ON LOAN", state.loans.length, "↑ 14 this week"],
          ["OVERDUE ITEMS", overdue, "Needs attention"],
        ]
      : currentUser.role === "librarian"
        ? [
            ["ISSUED TODAY", "14", "↑ 4 from yesterday"],
            ["BOOKS TO RETURN", "8", "Due today"],
            ["OVERDUE ITEMS", overdue, "Follow up needed"],
            [
              "AVAILABLE BOOKS",
              state.books.reduce((a, b) => a + b.available, 0),
              "Ready to lend",
            ],
          ]
        : [
            [
              "MY BORROWED",
              state.loans.filter(
                (l) => l.member === currentUser.name && l.status !== "Returned",
              ).length,
              "Due soon",
            ],
            [
              "BOOKS AVAILABLE",
              state.books.reduce((a, b) => a + b.available, 0),
              "Explore collection",
            ],
            ["FAVOURITES", "7", "Saved for later"],
            ["READING GOAL", "62%", "12 books this year"],
          ];
  let loans =
    currentUser.role === "member"
      ? state.loans.filter((l) => l.member === currentUser.name)
      : state.loans;
  let main =
    currentUser.role === "member"
      ? `<div class="welcome"><div><h2>Find your next great read.</h2><p style="margin:0">Over 4,000 titles are waiting for you.</p></div><button class="action" data-page="Browse">Browse books</button></div><div class="section-head"><h2>Popular in the library</h2></div><div class="book-shelf">${state.books.map((b) => `<div class="book-card"><i class="cover" style="background:${b.color}">${b.title[0]}</i><b>${b.title}</b><small>${b.author}</small></div>`).join("")}</div>`
      : `<div class="two-col"><div><div class="section-head"><h2>Recent circulation</h2><button class="link-button" data-page="Circulation">View all</button></div>${loansTable(loans.slice(0, 5))}</div><div><div class="section-head"><h2>Library activity</h2></div><div class="panel activity">${["New member registration", "Book returned: Atomic Habits", "Inventory update completed", "Reminder emails sent"].map((x, i) => `<div class="activity-item"><i class="dot" style="background:${["#5069d8", "#1f9a73", "#eea842", "#df6570"][i]}"></i><div>${x}<span>${i + 1} hour${i ? "s" : ""} ago</span></div></div>`).join("")}</div></div></div>`;
  shell(
    "Dashboard",
    `<div class="grid-stats">${stats.map((s) => `<div class="stat"><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]}</div><div class="stat-change">${s[2]}</div></div>`).join("")}</div>${main}`,
  );
}
function loansTable(loans) {
  return `<div class="panel"><table><thead><tr><th>BOOK</th><th>MEMBER</th><th>DUE DATE</th><th>STATUS</th><th></th></tr></thead><tbody>${loans
    .map((l) => {
      let b = state.books.find((x) => x.id === l.bookId);
      return `<tr><td>${bookCell(b)}</td><td>${l.member}</td><td>${l.due}</td><td><span class="badge ${l.status === "Overdue" ? "danger" : l.status === "Returned" ? "ok" : "warn"}">${l.status}</span></td><td>${currentUser.role === "librarian" && l.status !== "Returned" ? `<button class="link-button return" data-id="${l.id}">Return</button>` : ""}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
function catalog() {
  shell(
    "Catalog",
    `<div class="toolbar"><input class="search" placeholder="Search title, author or ISBN" id="search"><button class="action" id="addBook">+ Add new book</button></div><div id="bookTable">${booksTable(state.books)}</div>`,
  );
  search.oninput = () => {
    let q = search.value.toLowerCase();
    bookTable.innerHTML = booksTable(
      state.books.filter((b) =>
        Object.values(b).join(" ").toLowerCase().includes(q),
      ),
    );
  };
  addBook.onclick = showBookModal;
}
function booksTable(books) {
  return `<div class="panel"><table><thead><tr><th>BOOK</th><th>CATEGORY</th><th>ISBN</th><th>AVAILABILITY</th><th></th></tr></thead><tbody>${books.map((b) => `<tr><td>${bookCell(b)}</td><td>${b.category}</td><td>${b.isbn}</td><td><span class="badge ${b.available ? "ok" : "danger"}">${b.available} of ${b.copies} available</span></td><td><button class="link-button">Details</button></td></tr>`).join("")}</tbody></table></div>`;
}
function circulation() {
  shell(
    "Circulation",
    `<div class="welcome"><div><h2>Keep circulation moving.</h2><p style="margin:0">Issue, receive, and track every book in one place.</p></div><button class="action" id="issue">+ Issue book</button></div><div class="section-head"><h2>All loans</h2></div>${loansTable(state.loans)}`,
  );
  document.querySelectorAll(".return").forEach(
    (b) =>
      (b.onclick = async () => {
        await api("/api/loans/" + b.dataset.id, { method: "PATCH" });
        await init();
        render("Circulation");
      }),
  );
  issue.onclick = () =>
    alert(
      "Select a member and an available title to issue a book. This demo includes the circulation workflow view.",
    );
}
function members() {
  shell(
    "Members",
    `<div class="toolbar"><input class="search" placeholder="Search members"><button class="action">+ Add member</button></div><div class="panel"><table><thead><tr><th>MEMBER</th><th>ROLE</th><th>EMAIL</th><th>ACTIVE LOANS</th><th>STATUS</th></tr></thead><tbody>${state.users.map((u) => `<tr><td><div class="book-cell"><div class="avatar">${cap(u.name)}</div>${u.name}</div></td><td>${u.role[0].toUpperCase() + u.role.slice(1)}</td><td>${u.email}</td><td>${state.loans.filter((l) => l.member === u.name && l.status !== "Returned").length}</td><td><span class="badge ok">Active</span></td></tr>`).join("")}</tbody></table></div>`,
  );
}
function reports() {
  let total = state.books.reduce((a, b) => a + b.copies, 0),
    loaned = total - state.books.reduce((a, b) => a + b.available, 0);
  shell(
    "Reports",
    `<div class="grid-stats"><div class="stat"><div class="stat-label">COLLECTION UTILIZATION</div><div class="stat-value">${Math.round((loaned / total) * 100)}%</div><div class="stat-change">Books currently circulating</div></div><div class="stat"><div class="stat-label">MOST POPULAR CATEGORY</div><div class="stat-value">Fiction</div><div class="stat-change">42 loans this month</div></div><div class="stat"><div class="stat-label">RETURN RATE</div><div class="stat-value">96%</div><div class="stat-change">↑ 3% from last month</div></div><div class="stat"><div class="stat-label">OVERDUE RATE</div><div class="stat-value">${state.loans.filter((x) => x.status === "Overdue").length}</div><div class="stat-change">Items requiring attention</div></div></div><div class="section-head"><h2>Collection report</h2><button class="action" onclick="window.print()">Export report</button></div>${booksTable(state.books)}`,
  );
}
function myLoans() {
  let ls = state.loans.filter((l) => l.member === currentUser.name);
  shell(
    "My loans",
    `<div class="welcome"><div><h2>Your reading desk</h2><p style="margin:0">Keep track of your borrowed books and return dates.</p></div><button class="action" data-page="Browse">Find a book</button></div><div class="section-head"><h2>Current & past loans</h2></div>${ls.length ? loansTable(ls) : '<div class="panel empty">No books are currently checked out to you.</div>'}`,
  );
}
function browse() {
  shell(
    "Browse",
    `<div class="toolbar"><input class="search" placeholder="Search the collection" id="search"></div><div id="bookTable">${booksTable(state.books)}</div>`,
  );
  search.oninput = () => {
    let q = search.value.toLowerCase();
    bookTable.innerHTML = booksTable(
      state.books.filter((b) =>
        (b.title + b.author + b.category).toLowerCase().includes(q),
      ),
    );
  };
}
function showBookModal() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><form class="modal" id="bookForm"><h2>Add new book</h2><label class="field">Title<input name="title" required></label><label class="field">Author<input name="author" required></label><label class="field">Category<input name="category" required></label><label class="field">ISBN<input name="isbn" required></label><label class="field">Number of copies<input name="copies" type="number" min="1" value="1" required></label><div class="modal-actions"><button type="button" class="primary secondary" id="cancel">Cancel</button><button class="primary">Add book</button></div></form></div>`,
  );
  cancel.onclick = () => modal.remove();
  bookForm.onsubmit = async (e) => {
    e.preventDefault();
    let d = Object.fromEntries(new FormData(bookForm)),
      r = await api("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
    if (!r.ok) {
      alert((await r.json()).error);
      return;
    }
    modal.remove();
    await init();
    render("Catalog");
  };
}
function render(page) {
  ({
    Dashboard: dashboard,
    Catalog: catalog,
    Circulation: circulation,
    Members: members,
    Reports: reports,
    Browse: browse,
    "My loans": myLoans,
  })[page]();
}
currentUser ? init() : loginView();
