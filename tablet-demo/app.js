(() => {
  const STORAGE_KEY = "parousiologio-offline-demo-v1";
  const ROSTER_KEY = "parousiologio-offline-roster-v1";

  const POSTS = [
    { id: "servitores", title: "Σερβιτόροι", slots: 6, depts: ["SERVICE"] },
    { id: "paso", title: "Πάσο", slots: 4, depts: ["SERVICE"] },
    { id: "voithei", title: "Βοηθοί", slots: 6, depts: ["SERVICE"] },
    { id: "boufes", title: "Μπουφές", slots: 3, depts: ["ΜΠΟΥΦΕ-ΜΠΑΡ"] },
    { id: "ypodochi", title: "Υποδοχή", slots: 6, depts: ["ΥΠΟΔΟΧΗ"] },
    { id: "dj", title: "DJ", slots: 2, depts: ["DJ"] },
    { id: "bar", title: "Bar", slots: 4, depts: ["ΜΠΟΥΦΕ-ΜΠΑΡ"] },
    { id: "fota", title: "Φώτα", slots: 2, depts: ["ΥΠΟΔΟΧΗ", "ΜΠΟΥΦΕ-ΜΠΑΡ", "ΑΛΛΟ"] },
    { id: "check", title: "Check", slots: 2, depts: ["ΥΠΟΔΟΧΗ"] },
    { id: "ypeyth", title: "Υπεύθ. βάρδιας", slots: 1, depts: ["ΥΠΕΥΘΥΝΟΙ"] },
    { id: "klados", title: "Κλάδος", slots: 1, depts: ["ΥΠΕΥΘΥΝΟΙ"] },
  ];

  const DEPTS = [
    "SERVICE",
    "ΜΠΟΥΦΕ-ΜΠΑΡ",
    "ΥΠΟΔΟΧΗ",
    "DJ",
    "ΥΠΕΥΘΥΝΟΙ",
    "ΚΟΥΖΙΝΑ",
    "ΑΛΛΟ",
  ];

  const DAYS_EL = [
    "Κυριακή",
    "Δευτέρα",
    "Τρίτη",
    "Τετάρτη",
    "Πέμπτη",
    "Παρασκευή",
    "Σάββατο",
  ];

  const MONTHS_EL = [
    "Ιανουαρίου",
    "Φεβρουαρίου",
    "Μαρτίου",
    "Απριλίου",
    "Μαΐου",
    "Ιουνίου",
    "Ιουλίου",
    "Αυγούστου",
    "Σεπτεμβρίου",
    "Οκτωβρίου",
    "Νοεμβρίου",
    "Δεκεμβρίου",
  ];

  const TIME_STEP = 5;
  const TIME_OPTIONS = buildTimeOptions();

  const state = {
    view: "home",
    dateKey: todayKey(),
    slots: {},
    customEmployees: [],
    deactivatedIds: [],
    pickSlot: null,
    pickPost: null,
    pickMode: "new", // new | change
    activeSlot: null,
    timeField: null, // arrival | departure
  };

  const els = {
    screens: {
      home: document.getElementById("screen-home"),
      day: document.getElementById("screen-day"),
      person: document.getElementById("screen-person"),
      names: document.getElementById("screen-names"),
    },
    homeDate: document.getElementById("home-date"),
    homeTime: document.getElementById("home-time"),
    btnToday: document.getElementById("btn-today"),
    btnContinue: document.getElementById("btn-continue"),
    btnNames: document.getElementById("btn-names"),
    dayDate: document.getElementById("day-date"),
    dayClock: document.getElementById("day-clock"),
    board: document.getElementById("board"),
    btnBackHome: document.getElementById("btn-back-home"),
    btnBackHome2: document.getElementById("btn-back-home-2"),
    btnPrint: document.getElementById("btn-print"),
    btnExport: document.getElementById("btn-export"),
    btnClearDay: document.getElementById("btn-clear-day"),
    picker: document.getElementById("picker"),
    pickerTitle: document.getElementById("picker-title"),
    pickerSub: document.getElementById("picker-sub"),
    pickerSearch: document.getElementById("picker-search"),
    nameList: document.getElementById("name-list"),
    btnClosePicker: document.getElementById("btn-close-picker"),
    timePicker: document.getElementById("time-picker"),
    timePickerTitle: document.getElementById("time-picker-title"),
    timePickerSub: document.getElementById("time-picker-sub"),
    timeList: document.getElementById("time-list"),
    btnCloseTime: document.getElementById("btn-close-time"),
    btnClearTime: document.getElementById("btn-clear-time"),
    personPost: document.getElementById("person-post"),
    personName: document.getElementById("person-name"),
    personDept: document.getElementById("person-dept"),
    personArrive: document.getElementById("person-arrive"),
    personLeave: document.getElementById("person-leave"),
    personHours: document.getElementById("person-hours"),
    personNotes: document.getElementById("person-notes"),
    btnArrive: document.getElementById("btn-arrive"),
    btnLeave: document.getElementById("btn-leave"),
    btnEditArrive: document.getElementById("btn-edit-arrive"),
    btnEditLeave: document.getElementById("btn-edit-leave"),
    btnChangeName: document.getElementById("btn-change-name"),
    btnBackDay: document.getElementById("btn-back-day"),
    btnRemove: document.getElementById("btn-remove"),
    btnBackNames: document.getElementById("btn-back-names"),
    newName: document.getElementById("new-name"),
    newShort: document.getElementById("new-short"),
    newDept: document.getElementById("new-dept"),
    btnAddName: document.getElementById("btn-add-name"),
    adminSearch: document.getElementById("admin-search"),
    adminList: document.getElementById("admin-list"),
    toast: document.getElementById("toast"),
    printRoot: document.getElementById("print-root"),
  };

  function buildTimeOptions() {
    const out = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += TIME_STEP) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatLongDate(key) {
    const d = parseKey(key);
    return `${DAYS_EL[d.getDay()]}, ${d.getDate()} ${MONTHS_EL[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatClock(d = new Date()) {
    return d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function nowStamp() {
    return formatClock(new Date());
  }

  function nearestStep(t) {
    if (!t) return null;
    const mins = parseHHMM(t);
    if (mins == null) return null;
    const rounded = Math.round(mins / TIME_STEP) * TIME_STEP;
    const norm = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function parseHHMM(t) {
    if (!t) return null;
    const parts = String(t).split(":");
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  function calcHours(arrival, departure) {
    const a = parseHHMM(arrival);
    const b = parseHHMM(departure);
    if (a == null || b == null) return null;
    let diff = b - a;
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 100) / 100;
  }

  function formatHours(h) {
    if (h == null) return "—";
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    if (mins === 0) return `${whole} ώρ.`;
    return `${whole}:${String(mins).padStart(2, "0")}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.dateKey && data.slots) {
          state.dateKey = data.dateKey;
          state.slots = data.slots;
        }
      }
    } catch (_) {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(ROSTER_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data) {
          state.customEmployees = Array.isArray(data.customEmployees)
            ? data.customEmployees
            : [];
          state.deactivatedIds = Array.isArray(data.deactivatedIds)
            ? data.deactivatedIds
            : [];
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dateKey: state.dateKey, slots: state.slots })
    );
  }

  function saveRoster() {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({
        customEmployees: state.customEmployees,
        deactivatedIds: state.deactivatedIds,
      })
    );
  }

  function allEmployees(includeInactive = false) {
    const seed = (window.EMPLOYEES || []).map((e) => ({
      ...e,
      source: "seed",
      active: !state.deactivatedIds.includes(e.id),
    }));
    const custom = state.customEmployees.map((e) => ({
      ...e,
      source: "custom",
      active: e.active !== false,
    }));
    const merged = [...seed, ...custom];
    if (includeInactive) return merged;
    return merged.filter((e) => e.active);
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function setView(view) {
    state.view = view;
    Object.entries(els.screens).forEach(([name, el]) => {
      el.classList.toggle("active", name === view);
    });
  }

  function postForSlot(slotKey) {
    return POSTS.find((p) => slotKey.startsWith(`${p.id}-`));
  }

  function usedEmpIds(exceptSlot) {
    const used = new Set();
    Object.entries(state.slots).forEach(([key, slot]) => {
      if (key !== exceptSlot && slot && slot.empId) used.add(slot.empId);
    });
    return used;
  }

  function filteredEmployees(post, query) {
    const used = usedEmpIds(state.pickSlot);
    const q = (query || "").trim().toLocaleLowerCase("el");
    return allEmployees(false)
      .filter((e) => post.depts.includes(e.dept))
      .filter((e) => !used.has(e.id))
      .filter((e) => {
        if (!q) return true;
        return (
          e.short.toLocaleLowerCase("el").includes(q) ||
          e.name.toLocaleLowerCase("el").includes(q)
        );
      })
      .sort((a, b) => a.short.localeCompare(b.short, "el"));
  }

  function openPicker(slotKey, post, mode = "new") {
    state.pickSlot = slotKey;
    state.pickPost = post;
    state.pickMode = mode;
    els.pickerTitle.textContent =
      mode === "change" ? "Αλλαγή ονόματος" : "Επιλογή ονόματος";
    els.pickerSub.textContent = post.title;
    els.pickerSearch.value = "";
    renderNameList();
    els.picker.classList.add("open");
    setTimeout(() => els.pickerSearch.focus(), 80);
  }

  function closePicker() {
    els.picker.classList.remove("open");
    state.pickSlot = null;
    state.pickPost = null;
    state.pickMode = "new";
  }

  function renderNameList() {
    const post = state.pickPost;
    if (!post) return;
    const list = filteredEmployees(post, els.pickerSearch.value);
    els.nameList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "sheet-sub";
      empty.textContent = "Δεν βρέθηκαν ονόματα για αυτό το πόστο.";
      els.nameList.appendChild(empty);
      return;
    }
    list.forEach((emp) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "name-item";
      btn.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)} · ${escapeHtml(emp.dept)}</span>`;
      btn.addEventListener("click", () => assignEmployee(emp));
      els.nameList.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function assignEmployee(emp) {
    const key = state.pickSlot;
    if (!key) return;
    const existing = state.slots[key];
    if (state.pickMode === "change" && existing) {
      state.slots[key] = {
        ...existing,
        empId: emp.id,
        short: emp.short,
        name: emp.name,
        dept: emp.dept,
      };
      save();
      closePicker();
      openPerson(key);
      showToast(`Όνομα: ${emp.short}`);
      return;
    }
    state.slots[key] = {
      empId: emp.id,
      short: emp.short,
      name: emp.name,
      dept: emp.dept,
      arrival: null,
      departure: null,
      notes: "",
    };
    save();
    closePicker();
    openPerson(key);
    showToast(`${emp.short} προστέθηκε`);
  }

  function openPerson(slotKey) {
    const slot = state.slots[slotKey];
    if (!slot) return;
    state.activeSlot = slotKey;
    const post = postForSlot(slotKey);
    els.personPost.textContent = post ? post.title : "";
    els.personName.textContent = slot.short;
    els.personDept.textContent = slot.name;
    els.personArrive.textContent = slot.arrival || "—";
    els.personLeave.textContent = slot.departure || "—";
    els.personHours.textContent = formatHours(
      calcHours(slot.arrival, slot.departure)
    );
    els.personNotes.value = slot.notes || "";
    setView("person");
  }

  function persistNotes() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    slot.notes = els.personNotes.value;
    save();
  }

  function stampArrive() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    slot.arrival = nowStamp();
    save();
    openPerson(state.activeSlot);
    showToast(`Άφιξη ${slot.arrival}`);
  }

  function stampLeave() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    slot.departure = nowStamp();
    save();
    openPerson(state.activeSlot);
    showToast(`Αποχώρηση ${slot.departure}`);
  }

  function openTimePicker(field) {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    state.timeField = field;
    const label = field === "arrival" ? "Ώρα άφιξης" : "Ώρα αποχώρησης";
    els.timePickerTitle.textContent = label;
    els.timePickerSub.textContent = `${slot.short} · κάθε ${TIME_STEP} λεπτά`;
    renderTimeList(slot[field]);
    els.timePicker.classList.add("open");
    requestAnimationFrame(() => {
      const selected = els.timeList.querySelector(".time-item.selected");
      if (selected) selected.scrollIntoView({ block: "center" });
    });
  }

  function closeTimePicker() {
    els.timePicker.classList.remove("open");
    state.timeField = null;
  }

  function renderTimeList(current) {
    const selected = nearestStep(current) || current;
    els.timeList.innerHTML = "";
    TIME_OPTIONS.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-item" + (t === selected ? " selected" : "");
      btn.textContent = t;
      btn.addEventListener("click", () => applyTime(t));
      els.timeList.appendChild(btn);
    });
  }

  function applyTime(t) {
    const slot = state.slots[state.activeSlot];
    const field = state.timeField;
    if (!slot || !field) return;
    slot[field] = t;
    save();
    closeTimePicker();
    openPerson(state.activeSlot);
    showToast(field === "arrival" ? `Άφιξη ${t}` : `Αποχώρηση ${t}`);
  }

  function clearTimeField() {
    const slot = state.slots[state.activeSlot];
    if (!slot || !state.timeField) return;
    slot[state.timeField] = null;
    save();
    closeTimePicker();
    openPerson(state.activeSlot);
    showToast("Η ώρα καθαρίστηκε");
  }

  function changeName() {
    if (!state.activeSlot) return;
    const post = postForSlot(state.activeSlot);
    if (!post) return;
    openPicker(state.activeSlot, post, "change");
  }

  function removePerson() {
    if (!state.activeSlot) return;
    if (!confirm("Αφαίρεση αυτού του ατόμου από το πόστο;")) return;
    delete state.slots[state.activeSlot];
    save();
    state.activeSlot = null;
    renderBoard();
    setView("day");
    showToast("Αφαιρέθηκε");
  }

  function startToday() {
    const key = todayKey();
    if (state.dateKey !== key) {
      state.slots = {};
    }
    state.dateKey = key;
    save();
    els.dayDate.textContent = formatLongDate(state.dateKey);
    renderBoard();
    setView("day");
    updateContinueVisibility();
  }

  function continueDay() {
    if (!state.dateKey) state.dateKey = todayKey();
    els.dayDate.textContent = formatLongDate(state.dateKey);
    renderBoard();
    setView("day");
  }

  function clearDay() {
    if (
      !confirm(
        "Καθαρισμός ημέρας; Θα σβηστούν όλα τα ονόματα και οι ώρες σε αυτό το tablet."
      )
    ) {
      return;
    }
    state.slots = {};
    save();
    renderBoard();
    showToast("Η ημέρα καθαρίστηκε");
    updateContinueVisibility();
  }

  function renderBoard() {
    els.board.innerHTML = "";
    POSTS.forEach((post) => {
      const section = document.createElement("section");
      section.className = "post";
      section.innerHTML = `<h2 class="post-title">${post.title}</h2>`;
      const slotsEl = document.createElement("div");
      slotsEl.className = "slots";
      for (let i = 0; i < post.slots; i++) {
        const key = `${post.id}-${i}`;
        const data = state.slots[key];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot" + (data ? " filled" : "");
        if (!data) {
          btn.innerHTML = `<span class="slot-empty">＋ Προσθήκη</span>`;
          btn.addEventListener("click", () => openPicker(key, post, "new"));
        } else {
          const hours = calcHours(data.arrival, data.departure);
          const times =
            data.arrival || data.departure
              ? `${data.arrival || "—"} → ${data.departure || "—"}`
              : "χωρίς ώρες ακόμα";
          const noteMark = data.notes && data.notes.trim() ? " · σημ." : "";
          btn.innerHTML = `
            <span class="slot-main">
              <span class="slot-name">${escapeHtml(data.short)}</span>
              <span class="slot-times">${escapeHtml(times)}${noteMark}</span>
            </span>
            <span class="slot-hours">${formatHours(hours)}</span>
          `;
          btn.addEventListener("click", () => openPerson(key));
        }
        slotsEl.appendChild(btn);
      }
      section.appendChild(slotsEl);
      els.board.appendChild(section);
    });
  }

  function fillDeptSelect() {
    els.newDept.innerHTML = "";
    DEPTS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      els.newDept.appendChild(opt);
    });
  }

  function openNames() {
    els.adminSearch.value = "";
    els.newName.value = "";
    els.newShort.value = "";
    renderAdminList();
    setView("names");
  }

  function renderAdminList() {
    const q = (els.adminSearch.value || "").trim().toLocaleLowerCase("el");
    const list = allEmployees(true)
      .filter((e) => {
        if (!q) return true;
        return (
          e.short.toLocaleLowerCase("el").includes(q) ||
          e.name.toLocaleLowerCase("el").includes(q) ||
          e.dept.toLocaleLowerCase("el").includes(q)
        );
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.short.localeCompare(b.short, "el");
      });

    els.adminList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "sheet-sub";
      empty.textContent = "Κανένα όνομα.";
      els.adminList.appendChild(empty);
      return;
    }

    list.forEach((emp) => {
      const row = document.createElement("div");
      row.className = "admin-item" + (emp.active ? "" : " inactive");
      const main = document.createElement("div");
      main.className = "admin-item-main";
      main.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)} · ${escapeHtml(emp.dept)}${emp.source === "custom" ? " · δικό σας" : ""}</span>`;
      const action = document.createElement("button");
      action.type = "button";
      action.className = "btn btn-ghost btn-sm";
      if (emp.active) {
        action.textContent = "Απενεργοποίηση";
        action.addEventListener("click", () => deactivateEmployee(emp));
      } else {
        action.textContent = "Ενεργοποίηση";
        action.addEventListener("click", () => activateEmployee(emp));
      }
      row.appendChild(main);
      row.appendChild(action);
      els.adminList.appendChild(row);
    });
  }

  function addEmployee() {
    const name = (els.newName.value || "").trim();
    if (!name) {
      showToast("Γράψτε όνομα");
      return;
    }
    const short = (els.newShort.value || "").trim() || name.split(/\s+/)[0];
    const dept = els.newDept.value || "ΑΛΛΟ";
    const id = `C${Date.now().toString(36).toUpperCase()}`;
    state.customEmployees.push({
      id,
      name: name.toLocaleUpperCase("el"),
      short: short.toLocaleUpperCase("el"),
      dept,
      active: true,
    });
    saveRoster();
    els.newName.value = "";
    els.newShort.value = "";
    renderAdminList();
    showToast(`${short} προστέθηκε`);
  }

  function deactivateEmployee(emp) {
    if (emp.source === "custom") {
      const found = state.customEmployees.find((e) => e.id === emp.id);
      if (found) found.active = false;
    } else if (!state.deactivatedIds.includes(emp.id)) {
      state.deactivatedIds.push(emp.id);
    }
    saveRoster();
    renderAdminList();
    showToast("Απενεργοποιήθηκε");
  }

  function activateEmployee(emp) {
    if (emp.source === "custom") {
      const found = state.customEmployees.find((e) => e.id === emp.id);
      if (found) found.active = true;
    } else {
      state.deactivatedIds = state.deactivatedIds.filter((id) => id !== emp.id);
    }
    saveRoster();
    renderAdminList();
    showToast("Ενεργοποιήθηκε");
  }

  function updateClocks() {
    const now = new Date();
    els.homeDate.textContent = formatLongDate(todayKey(now));
    els.homeTime.textContent = formatClock(now);
    if (els.dayClock) els.dayClock.textContent = formatClock(now);
  }

  function updateContinueVisibility() {
    const has = state.dateKey && Object.keys(state.slots).length > 0;
    els.btnContinue.hidden = !has;
    if (has) {
      els.btnContinue.textContent =
        state.dateKey === todayKey()
          ? "Συνέχεια σημερινής"
          : `Άνοιγμα ${state.dateKey}`;
    }
  }

  function buildPrint() {
    const rows = [];
    POSTS.forEach((post) => {
      for (let i = 0; i < post.slots; i++) {
        const key = `${post.id}-${i}`;
        const data = state.slots[key];
        if (!data) continue;
        const hours = calcHours(data.arrival, data.departure);
        rows.push({
          post: post.title,
          name: data.short,
          arrival: data.arrival || "",
          departure: data.departure || "",
          hours: hours == null ? "" : String(hours),
          notes: data.notes || "",
        });
      }
    });
    els.printRoot.innerHTML = `
      <h1>ΠΑΡΟΥΣΙΟΛΟΓΙΟ — STORE 311</h1>
      <p>${formatLongDate(state.dateKey)}</p>
      <p>Αποθήκευση: τοπικά σε αυτό το tablet (localStorage)</p>
      <table>
        <thead>
          <tr><th>Πόστο</th><th>Όνομα</th><th>Άφιξη</th><th>Αποχώρηση</th><th>Ώρες</th><th>Σημειώσεις</th></tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.post)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.arrival)}</td><td>${escapeHtml(r.departure)}</td><td>${escapeHtml(r.hours)}</td><td>${escapeHtml(r.notes)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function printDay() {
    buildPrint();
    window.print();
  }

  function exportDayJson() {
    const rows = [];
    POSTS.forEach((post) => {
      for (let i = 0; i < post.slots; i++) {
        const key = `${post.id}-${i}`;
        const data = state.slots[key];
        if (!data) continue;
        rows.push({
          post: post.title,
          postId: post.id,
          slot: i,
          empId: data.empId,
          short: data.short,
          name: data.name,
          dept: data.dept,
          arrival: data.arrival,
          departure: data.departure,
          hours: calcHours(data.arrival, data.departure),
          notes: data.notes || "",
        });
      }
    });
    const payload = {
      store: "STORE 311",
      dateKey: state.dateKey,
      exportedAt: new Date().toISOString(),
      storage: "localStorage on this tablet only",
      entries: rows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `parousiologio-${state.dateKey}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Εξαγωγή JSON");
  }

  function goHome() {
    persistNotesIfNeeded();
    updateContinueVisibility();
    setView("home");
  }

  function persistNotesIfNeeded() {
    if (state.view === "person" && state.activeSlot) persistNotes();
  }

  load();
  fillDeptSelect();
  updateClocks();
  updateContinueVisibility();
  setInterval(updateClocks, 1000);

  els.btnToday.addEventListener("click", startToday);
  els.btnContinue.addEventListener("click", continueDay);
  els.btnNames.addEventListener("click", openNames);
  els.btnBackHome.addEventListener("click", goHome);
  els.btnBackHome2.addEventListener("click", goHome);
  els.btnBackNames.addEventListener("click", goHome);
  els.btnBackDay.addEventListener("click", () => {
    persistNotes();
    renderBoard();
    setView("day");
  });
  els.btnArrive.addEventListener("click", stampArrive);
  els.btnLeave.addEventListener("click", stampLeave);
  els.btnEditArrive.addEventListener("click", () => openTimePicker("arrival"));
  els.btnEditLeave.addEventListener("click", () => openTimePicker("departure"));
  els.btnChangeName.addEventListener("click", changeName);
  els.btnRemove.addEventListener("click", removePerson);
  els.btnClosePicker.addEventListener("click", closePicker);
  els.picker.addEventListener("click", (e) => {
    if (e.target === els.picker) closePicker();
  });
  els.pickerSearch.addEventListener("input", renderNameList);
  els.btnCloseTime.addEventListener("click", closeTimePicker);
  els.btnClearTime.addEventListener("click", clearTimeField);
  els.timePicker.addEventListener("click", (e) => {
    if (e.target === els.timePicker) closeTimePicker();
  });
  els.btnPrint.addEventListener("click", printDay);
  els.btnExport.addEventListener("click", exportDayJson);
  els.btnClearDay.addEventListener("click", clearDay);
  els.btnAddName.addEventListener("click", addEmployee);
  els.adminSearch.addEventListener("input", renderAdminList);
  els.personNotes.addEventListener("change", persistNotes);
  els.personNotes.addEventListener("blur", persistNotes);

  window.__DEMO__ = {
    state,
    startToday,
    continueDay,
    renderBoard,
    save,
    setView,
    openPerson,
    POSTS,
    calcHours,
    formatHours,
    allEmployees,
  };
})();
