const API_BASE = "/api";
const TOKEN_KEY = "attendance_token";

const state = {
  token: null,
  user: null,
  classes: [],
  currentClass: null,
  students: [],
  attendance: {},
  date: "",
  search: "",
};

const elements = {
  authScreen: document.getElementById("auth-screen"),
  appScreen: document.getElementById("app-screen"),
  tabs: document.querySelectorAll(".tab"),
  signinForm: document.getElementById("signin-form"),
  signinName: document.getElementById("signin-name"),
  signinPin: document.getElementById("signin-pin"),
  remember: document.getElementById("remember"),
  registerForm: document.getElementById("register-form"),
  registerName: document.getElementById("register-name"),
  registerPin: document.getElementById("register-pin"),
  registerRole: document.getElementById("register-role"),
  authError: document.getElementById("auth-error"),
  forgotPinLink: document.getElementById("forgot-pin"),
  forgotPinOverlay: document.getElementById("forgot-pin-overlay"),
  resetPinForm: document.getElementById("reset-pin-form"),
  resetPinName: document.getElementById("reset-pin-name"),
  resetPinNew: document.getElementById("reset-pin-new"),
  resetPinConfirm: document.getElementById("reset-pin-confirm"),
  closeForgotPin: document.getElementById("close-forgot-pin"),
  resetPinError: document.getElementById("reset-pin-error"),
  userChip: document.getElementById("user-chip"),
  logout: document.getElementById("logout"),
  date: document.getElementById("date"),
  currentClassName: document.getElementById("current-class-name"),
  summaryClass: document.getElementById("summary-class"),
  summaryDate: document.getElementById("summary-date"),
  presentCount: document.getElementById("present-count"),
  absentCount: document.getElementById("absent-count"),
  unmarkedCount: document.getElementById("unmarked-count"),
  search: document.getElementById("search"),
  table: document.getElementById("student-table"),
  markAllPresent: document.getElementById("mark-all-present"),
  markAllAbsent: document.getElementById("mark-all-absent"),
  clearDay: document.getElementById("clear-day"),
  whatsappText: document.getElementById("whatsapp-text"),
  copyWhatsapp: document.getElementById("copy-whatsapp"),
  downloadCsv: document.getElementById("download-csv"),
  downloadTxt: document.getElementById("download-txt"),
  studentForm: document.getElementById("student-form"),
  studentName: document.getElementById("student-name"),
  studentId: document.getElementById("student-id"),
  importFile: document.getElementById("import-file"),
  importCsv: document.getElementById("import-csv"),
  downloadSample: document.getElementById("download-sample"),
  importSummary: document.getElementById("import-summary"),
  openStudentModal: document.getElementById("open-student-modal"),
  studentModal: document.getElementById("student-modal"),
  closeStudentModal: document.getElementById("close-student-modal"),
  openClassSwitcher: document.getElementById("open-class-switcher"),
  classOverlay: document.getElementById("class-overlay"),
  classGrid: document.getElementById("class-grid"),
  closeClassSwitcher: document.getElementById("close-class-switcher"),
  newClass: document.getElementById("new-class"),
  renameClass: document.getElementById("rename-class"),
  deleteClass: document.getElementById("delete-class"),
  submitAttendance: document.getElementById("submit-attendance"),
  toast: document.getElementById("toast"),
};

function getTodayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function storeToken(token, remember) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
  state.token = token;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  state.token = null;
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      "Server connection failed. Start the app with python3 server.py and open http://localhost:8000."
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function showAuthError(message) {
  if (!elements.authError) return;
  elements.authError.textContent = message;
  elements.authError.classList.remove("hidden");
}

function clearAuthError() {
  if (!elements.authError) return;
  elements.authError.textContent = "";
  elements.authError.classList.add("hidden");
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1500);
}

function setScreen(screen) {
  if (screen === "app") {
    elements.authScreen.classList.add("hidden");
    elements.appScreen.classList.remove("hidden");
  } else {
    elements.authScreen.classList.remove("hidden");
    elements.appScreen.classList.add("hidden");
  }
}

function setTab(tabName) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  elements.signinForm.classList.toggle("hidden", tabName !== "signin");
  elements.registerForm.classList.toggle("hidden", tabName !== "register");
}

function setUserChip() {
  if (!state.user) return;
  const roleLabel = state.user.role === "rep" ? "Class Rep" : "Teacher";
  elements.userChip.textContent = `${state.user.name} · ${roleLabel}`;
}

function applyRoleRules() {
  if (!state.user) return;
  elements.newClass.classList.remove("hidden");
  elements.deleteClass.classList.remove("hidden");
}

async function loadSession() {
  const stored = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!stored) {
    return false;
  }
  state.token = stored;
  try {
    const data = await apiFetch("/session");
    state.user = data.user;
    return true;
  } catch (error) {
    clearToken();
    showAuthError(error.message);
    return false;
  }
}

async function loadClasses() {
  const data = await apiFetch("/classes");
  state.classes = data.classes;
  if (state.classes.length === 0) {
    state.currentClass = null;
  } else if (!state.currentClass) {
    state.currentClass = state.classes[0];
  } else {
    state.currentClass = state.classes.find(
      (item) => item.id === state.currentClass.id
    );
  }
  renderClassSwitcher();
  updateClassInfo();
  applyRoleRules();
}

function renderClassSwitcher() {
  elements.classGrid.innerHTML = "";
  if (state.classes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "callout";
    empty.textContent = "No classes yet. Create your first class.";
    elements.classGrid.appendChild(empty);
    return;
  }
  state.classes.forEach((item) => {
    const card = document.createElement("button");
    card.className = "class-card";
    if (state.currentClass && state.currentClass.id === item.id) {
      card.classList.add("active");
    }
    card.innerHTML = `
      <div><strong>${item.name}</strong></div>
      <div class="class-meta">${item.student_count} students</div>
    `;
    card.addEventListener("click", async () => {
      state.currentClass = item;
      closeClassOverlay();
      await loadRoster();
    });
    elements.classGrid.appendChild(card);
  });
}

function updateClassInfo() {
  if (!state.currentClass) {
    elements.currentClassName.textContent = "Select class";
    elements.summaryClass.textContent = "No class selected";
    elements.summaryDate.textContent = "Choose a class to begin.";
    return;
  }
  elements.currentClassName.textContent = state.currentClass.name;
  elements.summaryClass.textContent = state.currentClass.name;
  elements.summaryDate.textContent = `Date: ${state.date}`;
}

async function loadRoster() {
  if (!state.currentClass) {
    state.students = [];
    state.attendance = {};
    render();
    return;
  }
  const data = await apiFetch(
    `/classes/${state.currentClass.id}/roster?date=${state.date}`
  );
  state.currentClass = data.class;
  state.students = data.students;
  state.attendance = data.attendance || {};
  updateClassInfo();
  render();
}

function getStatus(studentId) {
  return state.attendance[String(studentId)] || "unmarked";
}

async function setStatus(studentId, status) {
  if (!state.currentClass) return;
  await apiFetch(`/classes/${state.currentClass.id}/attendance`, {
    method: "POST",
    body: JSON.stringify({
      date: state.date,
      student_id: studentId,
      status,
    }),
  });
  if (status === "unmarked") {
    delete state.attendance[String(studentId)];
  } else {
    state.attendance[String(studentId)] = status;
  }
  render();
}

async function markAll(status) {
  if (!state.currentClass) return;
  await apiFetch(`/classes/${state.currentClass.id}/attendance/bulk`, {
    method: "POST",
    body: JSON.stringify({ date: state.date, status }),
  });
  await loadRoster();
}

function updateCounts() {
  let present = 0;
  let absent = 0;
  let unmarked = 0;

  state.students.forEach((student) => {
    const status = getStatus(student.id);
    if (status === "present") {
      present += 1;
    } else if (status === "absent") {
      absent += 1;
    } else {
      unmarked += 1;
    }
  });

  elements.presentCount.textContent = present;
  elements.absentCount.textContent = absent;
  elements.unmarkedCount.textContent = unmarked;
}

function renderTable() {
  elements.table.innerHTML = "";

  const header = document.createElement("div");
  header.className = "student-row header";
  header.innerHTML = "<div>Name</div><div>ID</div><div>Status</div><div>Action</div>";
  elements.table.appendChild(header);

  if (!state.currentClass) {
    const empty = document.createElement("div");
    empty.className = "student-row";
    empty.textContent = "Create a class to start marking attendance.";
    elements.table.appendChild(empty);
    return;
  }

  const query = state.search.toLowerCase();
  const filtered = state.students.filter((student) => {
    if (!query) return true;
    return (
      student.name.toLowerCase().includes(query) ||
      student.student_uid.toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "student-row";
    empty.textContent = "No students found.";
    elements.table.appendChild(empty);
    return;
  }

  filtered.forEach((student) => {
    const status = getStatus(student.id);
    const row = document.createElement("div");
    row.className = "student-row";
    if (status === "present") row.classList.add("present");
    if (status === "absent") row.classList.add("absent");

    const statusGroup = document.createElement("div");
    statusGroup.className = "status-group";

    const presentBtn = document.createElement("button");
    presentBtn.className = `action present ${status === "present" ? "" : "inactive"}`;
    presentBtn.textContent = "Present";
    presentBtn.addEventListener("click", () => setStatus(student.id, "present"));

    const absentBtn = document.createElement("button");
    absentBtn.className = `action absent ${status === "absent" ? "" : "inactive"}`;
    absentBtn.textContent = "Absent";
    absentBtn.addEventListener("click", () => setStatus(student.id, "absent"));

    const clearBtn = document.createElement("button");
    clearBtn.className = `action ${status === "unmarked" ? "inactive" : ""}`;
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => setStatus(student.id, "unmarked"));

    statusGroup.appendChild(presentBtn);
    statusGroup.appendChild(absentBtn);
    statusGroup.appendChild(clearBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      if (!confirm(`Remove ${student.name}?`)) return;
      await apiFetch(`/students/${student.id}`, { method: "DELETE" });
      await loadRoster();
    });

    row.appendChild(createCell(student.name));
    row.appendChild(createCell(student.student_uid));
    row.appendChild(statusGroup);
    row.appendChild(removeBtn);

    elements.table.appendChild(row);
  });
}

function createCell(text) {
  const cell = document.createElement("div");
  cell.textContent = text;
  return cell;
}

function buildWhatsappText() {
  if (!state.currentClass) return "";
  const present = [];
  const absent = [];
  const unmarked = [];

  state.students.forEach((student) => {
    const status = getStatus(student.id);
    const entry = `${student.name} (${student.student_uid})`;
    if (status === "present") {
      present.push(entry);
    } else if (status === "absent") {
      absent.push(entry);
    } else {
      unmarked.push(entry);
    }
  });

  const lines = [
    `Attendance - ${state.date}`,
    `Class: ${state.currentClass.name}`,
    `Marked by: ${state.user ? state.user.name : ""}`,
  ];

  const pushGroup = (label, list) => {
    lines.push("");
    lines.push(`${label} (${list.length})`);
    if (list.length === 0) {
      lines.push("- None");
      return;
    }
    list.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
  };

  pushGroup("Present", present);
  pushGroup("Absent", absent);
  pushGroup("Unmarked", unmarked);

  return lines.join("\n");
}

function buildCsv() {
  if (!state.currentClass) return "";
  const rows = [["Date", "Class", "Teacher", "Name", "ID", "Status"]];
  state.students.forEach((student) => {
    rows.push([
      state.date,
      state.currentClass.name,
      state.user ? state.user.name : "",
      student.name,
      student.student_uid,
      getStatus(student.id),
    ]);
  });
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[,\n"]/g.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderExports() {
  elements.whatsappText.value = buildWhatsappText();
}

function render() {
  updateCounts();
  renderTable();
  renderExports();
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current || row.length > 0) {
        row.push(current);
        rows.push(row);
      }
      current = "";
      row = [];
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      continue;
    }

    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function detectHeader(row) {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  const nameIndex = normalized.findIndex((cell) => cell.includes("name"));
  const idIndex = normalized.findIndex((cell) => cell.includes("id"));
  return {
    nameIndex,
    idIndex,
    hasHeader: nameIndex !== -1 && idIndex !== -1,
  };
}

async function handleImport() {
  const file = elements.importFile.files[0];
  if (!file) {
    alert("Please select a CSV file.");
    return;
  }
  const text = await file.text();
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) {
    elements.importSummary.textContent = "No data found.";
    elements.importSummary.classList.remove("hidden");
    return;
  }

  const headerInfo = detectHeader(rows[0]);
  let startIndex = 0;
  let nameIndex = 0;
  let idIndex = 1;

  if (headerInfo.hasHeader) {
    startIndex = 1;
    nameIndex = headerInfo.nameIndex;
    idIndex = headerInfo.idIndex;
  }

  const students = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    const name = (row[nameIndex] || "").trim();
    const student_uid = (row[idIndex] || "").trim();
    if (name && student_uid) {
      students.push({ name, student_uid });
    }
  }

  const result = await apiFetch(
    `/classes/${state.currentClass.id}/students/import`,
    {
      method: "POST",
      body: JSON.stringify({ students }),
    }
  );

  elements.importSummary.textContent = `Imported ${result.added} students. Skipped ${result.skipped} rows.`;
  elements.importSummary.classList.remove("hidden");
  await loadRoster();
}

async function handleRegister(event) {
  event.preventDefault();
  const name = elements.registerName.value.trim();
  const pin = elements.registerPin.value.trim();
  const role = elements.registerRole.value;
  if (!name || pin.length < 4) {
    alert("Please enter a name and 4+ digit PIN.");
    return;
  }
  clearAuthError();
  try {
    await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ name, pin, role }),
    });
    await handleLoginWithCredentials(name, pin, true);
  } catch (error) {
    showAuthError(error.message);
  }
}

function showResetPinError(message) {
  if (!elements.resetPinError) return;
  elements.resetPinError.textContent = message;
  elements.resetPinError.classList.remove("hidden");
}

function clearResetPinError() {
  if (!elements.resetPinError) return;
  elements.resetPinError.textContent = "";
  elements.resetPinError.classList.add("hidden");
}

function openForgotPinModal() {
  clearResetPinError();
  elements.resetPinForm.reset();
  elements.forgotPinOverlay.classList.remove("hidden");
}

function closeForgotPinModal() {
  elements.forgotPinOverlay.classList.add("hidden");
  clearResetPinError();
}

async function handleResetPin(event) {
  event.preventDefault();
  const name = elements.resetPinName.value.trim();
  const newPin = elements.resetPinNew.value;
  const confirmPin = elements.resetPinConfirm.value;

  if (!name) {
    showResetPinError("Enter your registered full name.");
    return;
  }
  if (newPin.length < 4) {
    showResetPinError("New PIN must be at least 4 characters.");
    return;
  }
  if (newPin !== confirmPin) {
    showResetPinError("New PIN and confirmation do not match.");
    return;
  }

  clearResetPinError();
  try {
    await apiFetch("/reset-pin", {
      method: "POST",
      body: JSON.stringify({ name, new_pin: newPin }),
    });
    showToast("PIN reset successfully. Sign in with your new PIN.");
    closeForgotPinModal();
  } catch (error) {
    showResetPinError(error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const name = elements.signinName.value.trim();
  const pin = elements.signinPin.value.trim();
  await handleLoginWithCredentials(name, pin, elements.remember.checked);
}

async function handleLoginWithCredentials(name, pin, remember) {
  if (!name || !pin) {
    alert("Enter both name and PIN.");
    return;
  }
  clearAuthError();
  try {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ name, pin }),
    });
    storeToken(data.token, remember);
    state.user = data.user;
    setUserChip();
    setScreen("app");
    await loadClasses();
    await loadRoster();
  } catch (error) {
    showAuthError(error.message);
  }
}

async function handleLogout() {
  try {
    await apiFetch("/logout", { method: "POST" });
  } catch (error) {
    // ignore
  }
  clearToken();
  state.user = null;
  state.classes = [];
  state.currentClass = null;
  clearAuthError();
  setScreen("auth");
}

async function handleNewClass() {
  const name = prompt("Class name");
  if (!name || !name.trim()) return;
  try {
    const data = await apiFetch("/classes", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadClasses();
    state.currentClass = state.classes.find((item) => item.id === data.id) || state.classes[0];
    closeClassOverlay();
    await loadRoster();
  } catch (error) {
    alert(error.message);
  }
}

async function handleRenameClass() {
  if (!state.currentClass) return;
  const name = prompt("Rename class", state.currentClass.name);
  if (!name || !name.trim()) return;
  try {
    await apiFetch(`/classes/${state.currentClass.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadClasses();
    await loadRoster();
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteClass() {
  if (!state.currentClass) return;
  if (!confirm(`Delete ${state.currentClass.name}?`)) return;
  try {
    await apiFetch(`/classes/${state.currentClass.id}`, { method: "DELETE" });
    await loadClasses();
    await loadRoster();
  } catch (error) {
    alert(error.message);
  }
}

function openStudentModal() {
  elements.studentModal.classList.remove("hidden");
}

function closeStudentModal() {
  elements.studentModal.classList.add("hidden");
}

function openClassOverlay() {
  renderClassSwitcher();
  elements.classOverlay.classList.remove("hidden");
}

function closeClassOverlay() {
  elements.classOverlay.classList.add("hidden");
}

function init() {
  state.date = getTodayString();
  elements.date.value = state.date;

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  elements.signinForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.forgotPinLink.addEventListener("click", openForgotPinModal);
  elements.closeForgotPin.addEventListener("click", closeForgotPinModal);
  elements.resetPinForm.addEventListener("submit", handleResetPin);
  elements.logout.addEventListener("click", handleLogout);

  elements.date.addEventListener("change", async (event) => {
    state.date = event.target.value || getTodayString();
    updateClassInfo();
    await loadRoster();
  });

  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTable();
  });

  elements.markAllPresent.addEventListener("click", () => markAll("present"));
  elements.markAllAbsent.addEventListener("click", () => markAll("absent"));
  elements.clearDay.addEventListener("click", () => markAll("unmarked"));

  elements.copyWhatsapp.addEventListener("click", async () => {
    const text = buildWhatsappText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      elements.copyWhatsapp.textContent = "Copied!";
      setTimeout(() => {
        elements.copyWhatsapp.textContent = "Copy WhatsApp";
      }, 1500);
    } catch (error) {
      alert("Copy failed. You can still copy manually.");
    }
  });

  elements.downloadCsv.addEventListener("click", () => {
    downloadFile(`attendance-${state.date}.csv`, buildCsv(), "text/csv");
  });

  elements.downloadTxt.addEventListener("click", () => {
    downloadFile(`attendance-${state.date}.txt`, buildWhatsappText(), "text/plain");
  });

  elements.openStudentModal.addEventListener("click", openStudentModal);
  elements.closeStudentModal.addEventListener("click", closeStudentModal);

  elements.studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentClass) {
      alert("Create a class first.");
      return;
    }
    const name = elements.studentName.value.trim();
    const student_uid = elements.studentId.value.trim();
    if (!name || !student_uid) return;
    try {
      await apiFetch(`/classes/${state.currentClass.id}/students`, {
        method: "POST",
        body: JSON.stringify({ name, student_uid }),
      });
      elements.studentName.value = "";
      elements.studentId.value = "";
      closeStudentModal();
      await loadRoster();
    } catch (error) {
      alert(error.message);
    }
  });

  elements.importCsv.addEventListener("click", async () => {
    if (!state.currentClass) {
      alert("Create a class first.");
      return;
    }
    try {
      await handleImport();
    } catch (error) {
      alert(error.message);
    }
  });

  elements.downloadSample.addEventListener("click", () => {
    const sample = "Name,ID\nPriya Sharma,CPU-2041\nArjun Patel,CPU-2042";
    downloadFile("sample-students.csv", sample, "text/csv");
  });

  elements.openClassSwitcher.addEventListener("click", openClassOverlay);
  elements.closeClassSwitcher.addEventListener("click", closeClassOverlay);
  elements.newClass.addEventListener("click", handleNewClass);
  elements.renameClass.addEventListener("click", handleRenameClass);
  elements.deleteClass.addEventListener("click", handleDeleteClass);

  elements.submitAttendance.addEventListener("click", () => {
    showToast("Attendance saved");
  });

  setTab("signin");

  loadSession().then(async (hasSession) => {
    if (hasSession) {
      setUserChip();
      setScreen("app");
      await loadClasses();
      await loadRoster();
    } else {
      setScreen("auth");
    }
  });
}

init();
