// My app.py, copied into JavaScript so it can run on this page.
// The routes and the SQL are the same. sql.js is real SQLite, so the
// queries really run. code.html says what is different.
const Server = (() => {
  const KEY_DB = "daniel-trial-db-v1";
  const KEY_SESSION = "daniel-trial-session-v1";
  let db = null;
  let sqlLog = [];
  let session = JSON.parse(localStorage.getItem(KEY_SESSION) || '{"flashes": []}');
  let version = 2;

  // ---- Password hashes, in the same format werkzeug uses ----
  async function pbkdf2(password, salt, iterations) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations }, key, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function checkPasswordHash(stored, password) {
    const [method, salt, hex] = stored.split("$");
    const [algo, hash, rounds] = method.split(":");
    if (algo !== "pbkdf2" || hash !== "sha256") return false;
    return (await pbkdf2(password, salt, Number(rounds))) === hex;
  }

  // Run one query, and note it down so the page can show it.
  function execute(sql, params = []) {
    sqlLog.push({ sql, params });
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  const flash = (message) => session.flashes.push(message);
  const redirect = (to) => ({ status: 302, location: to });

  // ---- Routes ----
  function home() {
    const slots = execute(
      "SELECT slots.id, slots.cca, slots.time_label, slots.places, " +
      "COUNT(signups.id) AS taken " +
      "FROM slots LEFT JOIN signups ON signups.slot_id = slots.id " +
      "GROUP BY slots.id ORDER BY slots.cca, slots.id");
    let signups = [];
    if (session.teacher) {
      signups = execute(
        "SELECT signups.id, signups.first_name, signups.form_class, " +
        "slots.cca, slots.time_label " +
        "FROM signups JOIN slots ON slots.id = signups.slot_id " +
        "ORDER BY slots.cca, slots.id, signups.form_class");
    }
    const flashes = session.flashes;
    session.flashes = [];
    return { status: 200, page: { slots, signups, flashes, teacher: session.teacher || null } };
  }

  function signup(form) {
    const firstName = (form.get("first_name") || "").trim();
    const formClass = (form.get("form_class") || "").trim().toUpperCase();
    const slotId = form.get("slot_id") || "";
    if (!(firstName.length >= 1 && firstName.length <= 30)) {
      flash("Type a first name, 30 letters at most.");
      return redirect("/");
    }
    if (!/^[1-5][A-Z]{0,2}[0-9]{1,2}$/.test(formClass)) {
      flash("Type your class like 1E2.");
      return redirect("/");
    }
    const slot = execute(
      "SELECT slots.cca, slots.time_label, slots.places, COUNT(signups.id) AS taken " +
      "FROM slots LEFT JOIN signups ON signups.slot_id = slots.id " +
      "WHERE slots.id = ? GROUP BY slots.id", [slotId])[0];
    if (!slot) {
      flash("Pick a session.");
    } else if (slot.taken >= slot.places) {
      flash(`Sorry, ${slot.cca} on ${slot.time_label} is full.`);
    } else {
      execute("INSERT INTO signups (slot_id, first_name, form_class) VALUES (?, ?, ?)",
        [slotId, firstName, formClass]);
      flash(`Done! See you at ${slot.cca}, ${slot.time_label}.`);
    }
    return redirect("/");
  }

  async function login(form) {
    const username = (form.get("username") || "").trim().toLowerCase();
    const password = form.get("password") || "";
    if (version === 1) return loginVersion1(username, password);
    const teacher = execute(
      "SELECT username, pw_hash FROM teachers WHERE username = ?", [username])[0];
    if (teacher && (await checkPasswordHash(teacher.pw_hash, password))) {
      session.teacher = teacher.username;
      flash("Logged in. The sign-up list is at the bottom.");
    } else {
      flash("Wrong username or password.");
    }
    return redirect("/");
  }

  // Version 1, my first try. Plain passwords, and the query is glued
  // together from what you typed. Kept only to show what goes wrong.
  function loginVersion1(username, password) {
    let teacher;
    try {
      teacher = execute(
        `SELECT username FROM teachers_v1 WHERE username = '${username}' AND password = '${password}'`)[0];
    } catch (e) {
      flash("The database gave an error: " + e.message);
      return redirect("/");
    }
    if (teacher) {
      session.teacher = teacher.username;
      flash("Logged in. The sign-up list is at the bottom.");
    } else {
      flash("Wrong username or password.");
    }
    return redirect("/");
  }

  function logout() {
    session = { flashes: [] };
    flash("Logged out.");
    return redirect("/");
  }

  function remove(signupId) {
    if (!session.teacher) return { status: 403, text: "Teachers only." };
    execute("DELETE FROM signups WHERE id = ?", [signupId]);
    flash("Removed.");
    return redirect("/");
  }

  async function handle(method, path, form) {
    sqlLog = [];
    let out;
    let m;
    if (method === "GET" && path === "/") out = home();
    else if (method === "POST" && path === "/signup") out = signup(form);
    else if (method === "POST" && path === "/login") out = await login(form);
    else if (method === "POST" && path === "/logout") out = logout();
    else if (method === "POST" && (m = path.match(/^\/remove\/(\d+)$/))) out = remove(Number(m[1]));
    else out = { status: 404, text: "Not Found" };
    save();
    return { ...out, sql: sqlLog };
  }

  // ---- Setup: schema.sql plus the same made-up rows as setup_db.py ----
  const TEACHER_HASH = "pbkdf2:sha256:1000000$r1lyuWY3VuMdmimE$e22078e92cb691dd4eb32699e26518951bc38ba4662db9b1a4e6b5df91adc9f9";
  function seed() {
    db.exec(window.SCHEMA_SQL);
    for (const s of [["Robotics", "Wed 2:30 pm", 6], ["Robotics", "Fri 2:30 pm", 6],
      ["Infocomm", "Wed 2:30 pm", 8], ["Media Club", "Thu 3:00 pm", 5]]) {
      db.run("INSERT INTO slots (cca, time_label, places) VALUES (?, ?, ?)", s);
    }
    for (const p of [[1, "Ali", "1E1"], [1, "Bee Lin", "1E3"], [3, "Chandra", "1E2"], [4, "Dev", "1E4"]]) {
      db.run("INSERT INTO signups (slot_id, first_name, form_class) VALUES (?, ?, ?)", p);
    }
    db.run("INSERT INTO teachers (username, pw_hash) VALUES (?, ?)", ["mr_ong", TEACHER_HASH]);
    // Version 1's table, with the password in plain text. Never do this.
    db.run("CREATE TABLE teachers_v1 (username TEXT, password TEXT)");
    db.run("INSERT INTO teachers_v1 VALUES (?, ?)", ["mr_ong", "club-trial-2026"]);
  }

  function save() {
    const bytes = db.export();
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    try {
      localStorage.setItem(KEY_DB, btoa(s));
      localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    } catch { /* storage blocked: still works until you leave the page */ }
  }

  async function start() {
    const wasm = Uint8Array.from(atob(window.SQL_WASM_B64), (c) => c.charCodeAt(0));
    Server.SQL = await initSqlJs({ wasmBinary: wasm });
    const saved = localStorage.getItem(KEY_DB);
    if (saved) {
      db = new Server.SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)));
    } else {
      db = new Server.SQL.Database();
      seed();
      save();
    }
  }

  function reset() {
    db.close();
    db = new Server.SQL.Database();
    session = { flashes: [] };
    seed();
    save();
  }

  function table(name) {
    const r = db.exec(`SELECT * FROM ${name}`)[0];
    return r || { columns: [], values: [] };
  }

  return {
    start, handle, reset, table, SQL: null,
    setVersion(v) { version = v; },
    getVersion() { return version; },
  };
})();
