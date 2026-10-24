// Runs the twin: starts the in-browser server, points fetch() at it,
// then loads app.js, the same file Flask serves. Each request is shown
// in the inspector with the SQL it ran.
(() => {
  const $ = (id) => document.getElementById(id);
  const STATUS = { 200: "OK", 201: "CREATED", 400: "BAD REQUEST", 401: "UNAUTHORIZED",
    403: "FORBIDDEN", 404: "NOT FOUND", 405: "METHOD NOT ALLOWED", 409: "CONFLICT" };
  let count = 0;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function hidePassword(body) {
    if (!body || !("password" in body)) return body;
    return { ...body, password: "•".repeat(String(body.password).length) };
  }

  function logRequest(method, path, body, result) {
    count += 1;
    const box = el("li", "req");
    const head = el("div", "req-head");
    head.append(el("span", "req-n", `#${count}`), el("span", "req-line", `${method} ${path}`),
      el("span", `req-status s${String(result.status)[0]}`, `${result.status} ${STATUS[result.status] || ""}`));
    box.append(head);
    if (body) box.append(el("pre", "req-body", "→ " + JSON.stringify(hidePassword(body))));
    for (const q of result.sql) {
      const pre = el("pre", "req-sql");
      pre.textContent = q.sql;
      if (q.params.length) {
        pre.append(el("span", "req-params", "\n  ? = " + q.params.map((p) =>
          typeof p === "string" && p.startsWith("pbkdf2:") ? JSON.stringify(p.slice(0, 30) + "…") : JSON.stringify(p)).join(", ")));
      }
      box.append(pre);
    }
    if (!result.sql.length) box.append(el("p", "req-none", "No SQL ran."));
    box.append(el("pre", "req-reply", "← " + JSON.stringify(result.body)));
    $("log").prepend(box);
    while ($("log").children.length > 40) $("log").lastChild.remove();
    showTables();
  }

  function showTables() {
    const which = document.querySelector("#db-tabs [aria-pressed=true]").dataset.table;
    const t = Server.tables()[which];
    const table = el("table");
    const tr = el("tr");
    for (const c of t.columns) tr.append(el("th", "", c));
    table.append(tr);
    for (const row of t.values) {
      const r = el("tr");
      for (const v of row) {
        const shown = v === null ? "NULL" : typeof v === "string" && v.length > 28 ? v.slice(0, 26) + "…" : String(v);
        r.append(el("td", v === null ? "null" : "", shown));
      }
      table.append(r);
    }
    $("db-view").replaceChildren(table);
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    const path = String(url);
    if (!path.startsWith("/api/")) return realFetch(url, opts);
    const method = (opts.method || "GET").toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : null;
    const result = await Server.handle(method, path, body);
    logRequest(method, path, body, result);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await Server.start();
    } catch (e) {
      $("twin-state").textContent = "The database could not start in this browser. The code page still shows every file.";
      return;
    }
    $("twin-state").textContent = "Server running in this tab. Data is saved in this browser only.";
    for (const b of document.querySelectorAll("#db-tabs button")) {
      b.addEventListener("click", () => {
        for (const o of document.querySelectorAll("#db-tabs button")) o.setAttribute("aria-pressed", String(o === b));
        showTables();
      });
    }
    $("reset").addEventListener("click", () => {
      Server.reset();
      location.reload();
    });
    $("raw").addEventListener("submit", async (e) => {
      e.preventDefault();
      const method = $("raw-method").value;
      const path = $("raw-path").value.trim();
      const text = $("raw-body").value.trim();
      if (!path.startsWith("/api/")) { $("raw-note").textContent = "Paths start with /api/."; return; }
      if (text) {
        try { JSON.parse(text); } catch { $("raw-note").textContent = "The body is not valid JSON."; return; }
      }
      $("raw-note").textContent = "";
      const opts = { method };
      if (method === "POST" && text) { opts.body = text; opts.headers = { "Content-Type": "application/json" }; }
      await fetch(path, opts);
    });
    $("clear-log").addEventListener("click", () => $("log").replaceChildren());
    showTables();
    const s = document.createElement("script");
    s.src = "app.js";
    document.body.append(s);
  });
})();
