// Draws the sign-up page the way templates/index.html does, sends each
// form to the copy of app.py in server.js, and writes down what happened.
(() => {
  const $ = (id) => document.getElementById(id);

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === "class") e.className = v; else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids) e.append(k); // strings become text, so names can't inject HTML
    return e;
  }

  // The same page as templates/index.html.
  function render(page) {
    const app = $("app");
    const parts = [
      el("h3", { class: "app-title" }, "CCA Trial Day"),
      el("p", {}, "Pick one trial session. Use a made-up first name for practice."),
    ];
    for (const message of page.flashes) parts.push(el("p", { class: "flash" }, message));

    const list = el("ul");
    for (const s of page.slots) {
      list.append(el("li", {}, `${s.cca}, ${s.time_label}: ${s.places - s.taken} of ${s.places} places left`));
    }
    parts.push(el("div", { class: "box" }, el("h4", {}, "Sessions"), list));

    const select = el("select", { name: "slot_id", required: true });
    for (const s of page.slots) {
      const full = s.taken >= s.places;
      select.append(el("option", { value: s.id, disabled: full }, `${s.cca}, ${s.time_label}${full ? " (full)" : ""}`));
    }
    parts.push(el("form", { class: "box", method: "post", action: "/signup" },
      el("h4", {}, "Sign up"),
      el("label", {}, "First name ", el("input", { name: "first_name", maxlength: 30, required: true, autocomplete: "off" })),
      el("label", {}, "Class ", el("input", { name: "form_class", placeholder: "1E2", maxlength: 5, required: true, autocomplete: "off" })),
      el("label", {}, "Session ", select),
      el("button", {}, "Sign up")));

    if (page.teacher) {
      const people = el("ul");
      for (const p of page.signups) {
        people.append(el("li", {}, `${p.cca}, ${p.time_label}: ${p.first_name} (${p.form_class}) `,
          el("form", { method: "post", action: `/remove/${p.id}`, class: "inline" }, el("button", {}, "Remove"))));
      }
      if (!page.signups.length) people.append(el("li", {}, "No sign-ups yet."));
      parts.push(el("div", { class: "box" }, el("h4", {}, "Sign-up list"),
        el("form", { method: "post", action: "/logout" }, el("button", {}, `Log out ${page.teacher}`)), people));
    } else {
      parts.push(el("form", { class: "box", method: "post", action: "/login" },
        el("h4", {}, "Teachers"),
        el("label", {}, "Username ", el("input", { name: "username", autocomplete: "off", required: true })),
        el("label", {}, "Password ", el("input", { name: "password", type: "password", autocomplete: "off", required: true })),
        el("button", {}, "Log in")));
    }
    app.replaceChildren(...parts);
  }

  // ---- "What just happened" ----
  function sqlBlock(q) {
    const pre = el("pre", { class: "sql" }, q.sql);
    if (q.params.length) pre.append(el("span", { class: "fill" }, "\n? marks filled with: " + q.params.map((p) => JSON.stringify(p)).join(", ")));
    return pre;
  }

  function showSteps(steps) {
    const ol = el("ol", { class: "steps" });
    for (const s of steps) ol.append(s);
    $("happened").replaceChildren(ol);
  }

  function formText(form) {
    const pairs = [];
    for (const [k, v] of form.entries()) pairs.push(`${k}=${k === "password" ? "•".repeat(v.length) : v}`);
    return pairs.join("&");
  }

  async function loadHome(steps) {
    const res = await Server.handle("GET", "/", null);
    const li = el("li", {}, el("strong", {}, "Browser: GET /"), " Flask reads the database to build the page.");
    for (const q of res.sql) li.append(sqlBlock(q));
    li.append(el("p", { class: "reply" }, "Flask fills in the template and replies 200 OK with the page."));
    steps.push(li);
    render(res.page);
    showTables();
  }

  async function submit(form) {
    const action = form.getAttribute("action");
    const data = new FormData(form);
    const steps = [];
    const sent = el("li", {}, el("strong", {}, `Browser: POST ${action}`), " with the form: ",
      el("code", {}, formText(data) || "(nothing)"));
    steps.push(sent);
    const res = await Server.handle("POST", action, data);
    const ran = el("li", {}, el("strong", {}, "Flask: "), res.sql.length ? "runs this SQL." : "runs no SQL.");
    for (const q of res.sql) ran.append(sqlBlock(q));
    steps.push(ran);
    if (res.status === 302) {
      steps.push(el("li", {}, el("strong", {}, "Flask: 302 Found."), " It says: go to / now. A message is saved for the next page."));
      await loadHome(steps);
    } else {
      steps.push(el("li", {}, el("strong", {}, `Flask: ${res.status}.`), ` ${res.text}`));
    }
    showSteps(steps);
  }

  function showTables() {
    for (const [name, box] of [["slots", "t-slots"], ["signups", "t-signups"],
      [Server.getVersion() === 1 ? "teachers_v1" : "teachers", "t-teachers"]]) {
      const t = Server.table(name);
      const table = el("table");
      table.append(el("caption", {}, name));
      const head = el("tr");
      for (const c of t.columns) head.append(el("th", {}, c));
      table.append(head);
      for (const row of t.values) {
        const tr = el("tr");
        for (const v of row) tr.append(el("td", {}, typeof v === "string" && v.length > 30 ? v.slice(0, 28) + "…" : String(v)));
        table.append(tr);
      }
      $(box).replaceChildren(table);
    }
  }

  function setVersion(v) {
    Server.setVersion(v);
    for (const b of document.querySelectorAll("#versions button")) b.setAttribute("aria-pressed", String(Number(b.dataset.v) === v));
    $("version-note").textContent = v === 1
      ? "Version 1: my first login. Plain passwords, and the SQL is glued together from what you type. Try the username ' OR 1=1 -- with any password."
      : "Version 2: the final app. Hashed passwords and ? placeholders everywhere.";
    $("app-frame").classList.toggle("v1", v === 1);
    showTables();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await Server.start();
    } catch (e) {
      $("app").textContent = "Sorry, the database could not start in this browser. The code page has every file.";
      return;
    }
    $("app").addEventListener("submit", (e) => {
      e.preventDefault();
      submit(e.target);
    });
    for (const b of document.querySelectorAll("#versions button")) {
      b.addEventListener("click", () => setVersion(Number(b.dataset.v)));
    }
    $("reset").addEventListener("click", async () => {
      Server.reset();
      const steps = [];
      await loadHome(steps);
      showSteps([el("li", {}, "Database wiped and filled again, like running setup_db.py."), ...steps]);
    });
    setVersion(2);
    const steps = [];
    await loadHome(steps);
    showSteps(steps);
  });
})();
