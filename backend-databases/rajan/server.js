// A twin of app.py that runs in your browser. Same routes, same SQL text,
// same status codes. sql.js runs SQLite itself here, so every query below
// really runs. The differences are listed on code.html.
const Server = (() => {
  const TODAY = "date('now', '+8 hours')";
  const KEY_DB = "rajan-library-db-v1";
  const KEY_SESSION = "rajan-library-session-v1";
  let db = null;
  let trace = [];
  let session = JSON.parse(localStorage.getItem(KEY_SESSION) || "{}");

  // ---- Password hashes in werkzeug's own format ----
  // Browsers can't do scrypt, werkzeug's default, so the twin uses
  // werkzeug's pbkdf2 method. app.py's check_password_hash reads both.
  const ITER = 1000000;
  const SALT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  async function pbkdf2(password, salt, iterations) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations }, key, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function generatePasswordHash(password) {
    const pick = crypto.getRandomValues(new Uint32Array(16));
    const salt = [...pick].map((n) => SALT_CHARS[n % SALT_CHARS.length]).join("");
    return `pbkdf2:sha256:${ITER}$${salt}$${await pbkdf2(password, salt, ITER)}`;
  }
  async function checkPasswordHash(stored, password) {
    const [method, salt, hex] = stored.split("$");
    const parts = method.split(":");
    if (parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
    return (await pbkdf2(password, salt, Number(parts[2]))) === hex;
  }

  // ---- Database helpers, like rows() and db().execute() in app.py ----
  function execute(sql, params = []) {
    trace.push({ sql, params });
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const out = [];
      while (stmt.step()) out.push(stmt.getAsObject());
      return out;
    } finally {
      stmt.free();
    }
  }
  const rows = execute;
  const lastRowId = () => db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  const isIntegrityError = (e) => /constraint failed/i.test(String(e && e.message));

  function me() {
    if (!session.user_id) return null;
    return rows("SELECT id, username, is_librarian FROM users WHERE id = ?", [session.user_id])[0] || null;
  }
  const reply = (body, status = 200) => ({ body, status });
  const error = (message, status) => reply({ error: message }, status);

  // ---- Routes ----
  async function signup(data) {
    const username = String(data.username ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return error("Use 3 to 20 letters, numbers or _.", 400);
    if (password.length < 8) return error("Use at least 8 characters.", 400);
    const hash = await generatePasswordHash(password);
    try {
      execute("INSERT INTO users (username, pw_hash) VALUES (?, ?)", [username, hash]);
    } catch (e) {
      if (isIntegrityError(e)) return error("That username is taken.", 409);
      throw e;
    }
    session.user_id = lastRowId();
    return reply({ username, is_librarian: 0 }, 201);
  }

  async function login(data) {
    const username = String(data.username ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    const user = execute(
      "SELECT id, username, pw_hash, is_librarian FROM users WHERE username = ?", [username])[0];
    if (!user || !(await checkPasswordHash(user.pw_hash, password))) {
      return error("Wrong username or password.", 401);
    }
    session.user_id = user.id;
    return reply({ username: user.username, is_librarian: user.is_librarian });
  }

  function logout() { session = {}; return reply({ ok: true }); }

  function whoami() {
    const user = me();
    if (!user) return error("Not logged in.", 401);
    return reply({ username: user.username, is_librarian: user.is_librarian });
  }

  function listBooks() {
    return reply(rows(
      "SELECT b.id, b.title, b.author, l.id IS NOT NULL AS on_loan " +
      "FROM books b LEFT JOIN loans l " +
      "ON l.book_id = b.id AND l.returned_on IS NULL " +
      "ORDER BY b.title"));
  }

  function oneBook(bookId) {
    const found = rows("SELECT id, title, author FROM books WHERE id = ?", [bookId]);
    if (!found.length) return error("No book with that id.", 404);
    return reply(found[0]);
  }

  function addBook(data) {
    const user = me();
    if (!user || !user.is_librarian) return error("Only the librarian can add books.", 403);
    const title = String(data.title ?? "").trim();
    const author = String(data.author ?? "").trim();
    if (!(title.length >= 1 && title.length <= 100 && author.length >= 1 && author.length <= 100)) {
      return error("Give a title and an author, 100 characters at most.", 400);
    }
    execute("INSERT INTO books (title, author) VALUES (?, ?)", [title, author]);
    return reply({ id: lastRowId(), title, author }, 201);
  }

  function myLoans() {
    const user = me();
    if (!user) return error("Log in first.", 401);
    return reply(rows(
      "SELECT l.id, b.title, l.due_date, " +
      `l.due_date < ${TODAY} AS overdue ` +
      "FROM loans l JOIN books b ON b.id = l.book_id " +
      "WHERE l.user_id = ? AND l.returned_on IS NULL " +
      "ORDER BY l.due_date", [user.id]));
  }

  function borrow(data) {
    const user = me();
    if (!user) return error("Log in first.", 401);
    const bookId = data.book_id;
    if (!Number.isInteger(bookId)) return error("Send a book_id number.", 400);
    if (!rows("SELECT id FROM books WHERE id = ?", [bookId]).length) return error("No book with that id.", 404);
    try {
      execute(
        "INSERT INTO loans (user_id, book_id, due_date) " +
        `VALUES (?, ?, date(${TODAY}, '+14 days'))`, [user.id, bookId]);
    } catch (e) {
      if (isIntegrityError(e)) return error("Someone already has that book.", 409);
      throw e;
    }
    return reply(rows("SELECT id, due_date FROM loans WHERE id = ?", [lastRowId()])[0], 201);
  }

  function giveBack(loanId) {
    const user = me();
    if (!user) return error("Log in first.", 401);
    execute(
      `UPDATE loans SET returned_on = ${TODAY} ` +
      "WHERE id = ? AND returned_on IS NULL AND (user_id = ? OR ? = 1)",
      [loanId, user.id, user.is_librarian]);
    if (db.getRowsModified() === 0) return error("No open loan of yours with that id.", 404);
    return reply({ ok: true });
  }

  function overdue() {
    const user = me();
    if (!user || !user.is_librarian) return error("Only the librarian can see this.", 403);
    return reply(rows(
      "SELECT l.id, u.username, b.title, l.due_date " +
      "FROM loans l " +
      "JOIN users u ON u.id = l.user_id " +
      "JOIN books b ON b.id = l.book_id " +
      `WHERE l.returned_on IS NULL AND l.due_date < ${TODAY} ` +
      "ORDER BY l.due_date"));
  }

  const ROUTES = [
    ["POST", /^\/api\/signup$/, (m, d) => signup(d)],
    ["POST", /^\/api\/login$/, (m, d) => login(d)],
    ["POST", /^\/api\/logout$/, () => logout()],
    ["GET", /^\/api\/me$/, () => whoami()],
    ["GET", /^\/api\/books$/, () => listBooks()],
    ["GET", /^\/api\/books\/(\d+)$/, (m) => oneBook(Number(m[1]))],
    ["POST", /^\/api\/books$/, (m, d) => addBook(d)],
    ["GET", /^\/api\/loans$/, () => myLoans()],
    ["POST", /^\/api\/loans$/, (m, d) => borrow(d)],
    ["POST", /^\/api\/loans\/(\d+)\/return$/, (m) => giveBack(Number(m[1]))],
    ["GET", /^\/api\/overdue$/, () => overdue()],
  ];

  // Handle one request. Returns the reply plus every SQL statement it ran.
  async function handle(method, path, data) {
    db.run("PRAGMA foreign_keys = ON"); // export() reopens the file, so set it each time
    trace = [];
    let out = null;
    for (const [verb, pattern, fn] of ROUTES) {
      const m = path.match(pattern);
      if (!m) continue;
      if (verb !== method) { out = out || error("Method not allowed.", 405); continue; }
      out = await fn(m, data || {});
      break;
    }
    out = out || error("Not found.", 404);
    save();
    return { ...out, sql: trace };
  }

  // ---- Setup: schema.sql, then the same made-up data as setup_db.py ----
  // The sample readers' hashes are of random passwords nobody knows.
  const LIBRARIAN = "pbkdf2:sha256:1000000$MwKLJEZdJGhaJQVn$63494a03991fc836af08811835fc8354d38f95f9d087b7d9ab87874888702a81";
  const READERS = [
    ["reader_kite", "pbkdf2:sha256:1000000$vOrIViSr168eNQrB$71da37f3cd34a00f4d1796c525a6a373066a07cc958ebef8f1cc88f4df6623f2"],
    ["reader_moss", "pbkdf2:sha256:1000000$4GmUD8qzzndwv9KO$078fe97fac3cf2c462fd6ba0aa72543410b5929e74564625f32269d41afb72ce"],
    ["reader_pebble", "pbkdf2:sha256:1000000$57X0pZIxmNDrA6KX$6b634ea0d7c0524d496ca07a2d00064c2a6478af43fa54ffef8245c9f2d42d6e"],
  ];
  const BOOKS = [
    ["Animal Farm", "George Orwell"], ["The Hobbit", "J. R. R. Tolkien"], ["Holes", "Louis Sachar"],
    ["The Giver", "Lois Lowry"], ["Wonder", "R. J. Palacio"], ["Frankenstein", "Mary Shelley"],
  ];

  function seed() {
    db.exec(window.SCHEMA_SQL);
    db.run("INSERT INTO users (username, pw_hash, is_librarian) VALUES (?, ?, 1)", ["librarian", LIBRARIAN]);
    for (const r of READERS) db.run("INSERT INTO users (username, pw_hash) VALUES (?, ?)", r);
    for (const b of BOOKS) db.run("INSERT INTO books (title, author) VALUES (?, ?)", b);
    for (const [user, book, days] of [[2, 1, -5], [3, 3, -1], [3, 4, 9]]) {
      db.run(`INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, date(${TODAY}, ?))`,
        [user, book, `${days} days`]);
    }
  }

  function save() {
    const bytes = db.export();
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    try {
      localStorage.setItem(KEY_DB, btoa(s));
      localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    } catch { /* storage full or blocked: the twin still works until you leave */ }
  }

  async function start() {
    const wasm = Uint8Array.from(atob(window.SQL_WASM_B64), (c) => c.charCodeAt(0));
    const SQL = await initSqlJs({ wasmBinary: wasm });
    const saved = localStorage.getItem(KEY_DB);
    if (saved) {
      db = new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)));
    } else {
      db = new SQL.Database();
      seed();
      save();
    }
    db.run("PRAGMA foreign_keys = ON");
    Server.SQL = SQL;
  }

  function reset() {
    db.close();
    db = new Server.SQL.Database();
    session = {};
    seed();
    db.run("PRAGMA foreign_keys = ON");
    save();
  }

  function tables() {
    const out = {};
    for (const name of ["users", "books", "loans"]) {
      const r = db.exec(`SELECT * FROM ${name}`)[0];
      out[name] = r || { columns: [], values: [] };
    }
    return out;
  }

  return { start, handle, reset, tables, SQL: null };
})();
