// The page side of the Class Library. It only talks to the API with fetch().
const $ = (id) => document.getElementById(id);
let user = null;

async function call(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function say(text, bad) {
  $("msg").textContent = text;
  $("msg").className = bad ? "lib-msg bad" : "lib-msg";
}

function item(text, buttonText, onClick) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text; // textContent, never innerHTML, for anything typed
  li.append(span);
  if (buttonText) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = buttonText;
    b.addEventListener("click", onClick);
    li.append(b);
  }
  return li;
}

async function showBooks() {
  const books = await call("GET", "/api/books");
  $("books").replaceChildren(...books.map((b) => {
    const label = `${b.title}, ${b.author}` + (b.on_loan ? " (out)" : "");
    if (!user || b.on_loan) return item(label);
    return item(label, "Borrow", () => borrow(b.id, b.title));
  }));
}

async function showLoans() {
  if (!user) return;
  const loans = await call("GET", "/api/loans");
  $("loans").replaceChildren(...(loans.length ? loans.map((l) =>
    item(`${l.title}, due ${l.due_date}` + (l.overdue ? " (overdue)" : ""), "Return", () => giveBack(l.id))
  ) : [item("Nothing borrowed.")]));
  if (user.is_librarian) {
    const late = await call("GET", "/api/overdue");
    $("overdue").replaceChildren(...(late.length ? late.map((l) =>
      item(`${l.title}: ${l.username}, due ${l.due_date}`, "Mark returned", () => giveBack(l.id))
    ) : [item("Nothing overdue.")]));
  }
}

function showUser() {
  $("who").textContent = user ? `Logged in as ${user.username}` : "Not logged in";
  $("logout").hidden = !user;
  $("auth").hidden = !!user;
  $("mine").hidden = !user;
  $("desk").hidden = !(user && user.is_librarian);
}

async function refresh() {
  showUser();
  await showBooks();
  await showLoans();
}

async function borrow(id, title) {
  try {
    const loan = await call("POST", "/api/loans", { book_id: id });
    say(`Borrowed ${title}. Due ${loan.due_date}.`);
  } catch (e) { say(e.message, true); }
  await refresh();
}

async function giveBack(id) {
  try {
    await call("POST", `/api/loans/${id}/return`);
    say("Returned.");
  } catch (e) { say(e.message, true); }
  await refresh();
}

$("auth").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const action = e.submitter ? e.submitter.dataset.action : "login";
  try {
    user = await call("POST", `/api/${action}`, {
      username: form.get("username"),
      password: form.get("password"),
    });
    e.target.reset();
    say(action === "signup" ? "Account made. You are logged in." : "Logged in.");
  } catch (err) { say(err.message, true); }
  await refresh();
});

$("logout").addEventListener("click", async () => {
  await call("POST", "/api/logout");
  user = null;
  say("Logged out.");
  await refresh();
});

$("add-book").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const book = await call("POST", "/api/books", { title: form.get("title"), author: form.get("author") });
    e.target.reset();
    say(`Added ${book.title}.`);
  } catch (err) { say(err.message, true); }
  await refresh();
});

(async () => {
  try { user = await call("GET", "/api/me"); } catch { user = null; }
  await refresh();
})();
