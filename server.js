const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const databaseFile = path.join(__dirname, "data.json");
const sessions = new Map();
const seed = {
  users: [
    {
      id: 1,
      name: "Aarav Sharma",
      email: "aarav@shelfwise.io",
      role: "admin",
      password: "admin123",
    },
    {
      id: 2,
      name: "Maya Patel",
      email: "maya@shelfwise.io",
      role: "librarian",
      password: "library123",
    },
    {
      id: 3,
      name: "Noah Williams",
      email: "noah@shelfwise.io",
      role: "member",
      password: "member123",
    },
  ],
  books: [
    {
      id: 1,
      title: "Atomic Habits",
      author: "James Clear",
      category: "Self Growth",
      isbn: "978-0735211292",
      copies: 12,
      available: 8,
      color: "#e6bf73",
    },
    {
      id: 2,
      title: "The Midnight Library",
      author: "Matt Haig",
      category: "Fiction",
      isbn: "978-0525559474",
      copies: 7,
      available: 3,
      color: "#365b83",
    },
    {
      id: 3,
      title: "Project Hail Mary",
      author: "Andy Weir",
      category: "Science Fiction",
      isbn: "978-0593135204",
      copies: 9,
      available: 5,
      color: "#cf654f",
    },
    {
      id: 4,
      title: "Thinking, Fast and Slow",
      author: "Daniel Kahneman",
      category: "Psychology",
      isbn: "978-0374533557",
      copies: 5,
      available: 1,
      color: "#6b9279",
    },
    {
      id: 5,
      title: "The Design of Everyday Things",
      author: "Don Norman",
      category: "Design",
      isbn: "978-0465050659",
      copies: 6,
      available: 6,
      color: "#a36c50",
    },
  ],
  loans: [
    {
      id: 1,
      bookId: 2,
      member: "Noah Williams",
      status: "Borrowed",
      issued: "Aug 12, 2026",
      due: "Aug 26, 2026",
    },
    {
      id: 2,
      bookId: 4,
      member: "Emma Wilson",
      status: "Overdue",
      issued: "Jul 21, 2026",
      due: "Aug 04, 2026",
    },
    {
      id: 3,
      bookId: 1,
      member: "Liam Chen",
      status: "Borrowed",
      issued: "Aug 15, 2026",
      due: "Aug 29, 2026",
    },
  ],
};
function loadDb() {
  if (!fs.existsSync(databaseFile))
    fs.writeFileSync(databaseFile, JSON.stringify(seed, null, 2));
  return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
}
let db = loadDb();
function saveDb() {
  fs.writeFileSync(databaseFile, JSON.stringify(db, null, 2));
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}
function getUser(req, roles) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const user = sessions.get(token);
  return user && (!roles || roles.includes(user.role)) ? user : null;
}
function requireUser(req, res, roles) {
  const user = getUser(req, roles);
  if (!user)
    send(res, 403, { error: "You do not have permission for this action." });
  return user;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/login" && req.method === "POST") {
    const { email, password } = await readBody(req);
    const user = db.users.find(
      (x) =>
        x.email.toLowerCase() === String(email).toLowerCase() &&
        x.password === password,
    );
    if (!user) return send(res, 401, { error: "Incorrect email or password" });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, publicUser(user));
    return send(res, 200, { user: publicUser(user), token });
  }
  if (url.pathname === "/api/logout" && req.method === "POST") {
    sessions.delete((req.headers.authorization || "").replace("Bearer ", ""));
    return send(res, 204, "");
  }
  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return send(res, 200, {
      users: user.role === "member" ? [] : db.users.map(publicUser),
      books: db.books,
      loans:
        user.role === "member"
          ? db.loans.filter((x) => x.member === user.name)
          : db.loans,
    });
  }
  if (url.pathname === "/api/books" && req.method === "POST") {
    if (!requireUser(req, res, ["admin", "librarian"])) return;
    const b = await readBody(req);
    if (
      ["title", "author", "category", "isbn"].some(
        (k) => !String(b[k] || "").trim(),
      )
    )
      return send(res, 400, { error: "Please complete all book details." });
    if (db.books.some((x) => x.isbn === b.isbn))
      return send(res, 409, { error: "A book with this ISBN already exists." });
    const copies = Math.max(1, Number(b.copies) || 1);
    const book = {
      id: nextId(db.books),
      title: b.title.trim(),
      author: b.author.trim(),
      category: b.category.trim(),
      isbn: b.isbn.trim(),
      copies,
      available: copies,
      color: "#556aaf",
    };
    db.books.unshift(book);
    saveDb();
    return send(res, 201, book);
  }
  if (url.pathname === "/api/loans" && req.method === "POST") {
    if (!requireUser(req, res, ["admin", "librarian"])) return;
    const { bookId, member } = await readBody(req),
      book = db.books.find((x) => x.id === Number(bookId));
    if (!book || !member || book.available < 1)
      return send(res, 400, { error: "Choose an available book and member." });
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const loan = {
      id: nextId(db.loans),
      bookId: book.id,
      member: String(member),
      status: "Borrowed",
      issued: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      due: due.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };
    book.available--;
    db.loans.unshift(loan);
    saveDb();
    return send(res, 201, loan);
  }
  if (/^\/api\/loans\/\d+$/.test(url.pathname) && req.method === "PATCH") {
    if (!requireUser(req, res, ["admin", "librarian"])) return;
    const loan = db.loans.find(
      (x) => x.id === Number(url.pathname.split("/").pop()),
    );
    if (!loan) return send(res, 404, { error: "Loan not found." });
    if (loan.status !== "Returned") {
      loan.status = "Returned";
      const book = db.books.find((x) => x.id === loan.bookId);
      if (book) book.available = Math.min(book.copies, book.available + 1);
      saveDb();
    }
    return send(res, 200, loan);
  }
  const requested =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname).replace(/^\/+/, ""),
    file = path.resolve(publicDir, requested);
  if (!file.startsWith(publicDir))
    return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, "Not found", "text/plain");
    const mime =
      {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
      }[path.extname(file)] || "application/octet-stream";
    send(res, 200, content, mime);
  });
});
server.listen(PORT, () =>
  console.log(`Shelfwise is running at http://localhost:${PORT}`),
);
