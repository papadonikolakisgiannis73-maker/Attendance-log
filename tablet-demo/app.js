(() => {
  const STORAGE_KEY = "parousiologio-offline-demo-v2";
  const LEGACY_KEY = "parousiologio-offline-demo-v1";
  const ROSTER_KEY = "parousiologio-offline-roster-v1";
  const DEFAULT_PIN = "3111";
  const FREE_MANUAL_EDITS = 2;
  const DAYRATE_DEPTS = new Set(["DJ", "ΥΠΕΥΘΥΝΟΙ"]);

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
    { id: "ypeyth", title: "Υπεύθ. βάρδιας", slots: 4, depts: ["ΥΠΕΥΘΥΝΟΙ"] },
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
    days: {},
    lateEntry: false,
    customEmployees: [],
    deactivatedIds: [],
    pin: DEFAULT_PIN,
    pickSlot: null,
    pickPost: null,
    pickMode: "new",
    activeSlot: null,
    timeField: null,
    pinAction: null,
    deferredInstall: null,
  };

  const els = {
    screens: {
      home: document.getElementById("screen-home"),
      day: document.getElementById("screen-day"),
      person: document.getElementById("screen-person"),
      names: document.getElementById("screen-names"),
      month: document.getElementById("screen-month"),
    },
    homeDate: document.getElementById("home-date"),
    homeTime: document.getElementById("home-time"),
    btnToday: document.getElementById("btn-today"),
    btnContinue: document.getElementById("btn-continue"),
    btnOtherDay: document.getElementById("btn-other-day"),
    btnMonth: document.getElementById("btn-month"),
    btnNames: document.getElementById("btn-names"),
    btnInstall: document.getElementById("btn-install"),
    dayDate: document.getElementById("day-date"),
    dayClock: document.getElementById("day-clock"),
    lateBanner: document.getElementById("late-banner"),
    board: document.getElementById("board"),
    btnBackHome: document.getElementById("btn-back-home"),
    btnBackHome2: document.getElementById("btn-back-home-2"),
    btnPrint: document.getElementById("btn-print"),
    btnExport: document.getElementById("btn-export"),
    btnEmail: document.getElementById("btn-email"),
    btnClearDay: document.getElementById("btn-clear-day"),
    datePicker: document.getElementById("date-picker"),
    otherDate: document.getElementById("other-date"),
    btnCloseDate: document.getElementById("btn-close-date"),
    btnOpenDate: document.getElementById("btn-open-date"),
    pinOverlay: document.getElementById("pin-overlay"),
    pinTitle: document.getElementById("pin-title"),
    pinReason: document.getElementById("pin-reason"),
    pinInput: document.getElementById("pin-input"),
    btnClosePin: document.getElementById("btn-close-pin"),
    btnPinOk: document.getElementById("btn-pin-ok"),
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
    hoursLabel: document.getElementById("hours-label"),
    personNotes: document.getElementById("person-notes"),
    pinHint: document.getElementById("pin-hint"),
    dayratePanel: document.getElementById("dayrate-panel"),
    dayrateStatus: document.getElementById("dayrate-status"),
    btnDayrate: document.getElementById("btn-dayrate"),
    clockBlock: document.getElementById("clock-block"),
    clockBlockLeave: document.getElementById("clock-block-leave"),
    btnArrive: document.getElementById("btn-arrive"),
    btnLeave: document.getElementById("btn-leave"),
    btnEditArrive: document.getElementById("btn-edit-arrive"),
    btnEditLeave: document.getElementById("btn-edit-leave"),
    btnChangeName: document.getElementById("btn-change-name"),
    btnBackDay: document.getElementById("btn-back-day"),
    btnRemove: document.getElementById("btn-remove"),
    btnBackNames: document.getElementById("btn-back-names"),
    adminPinCurrent: document.getElementById("admin-pin-current"),
    adminPinNew: document.getElementById("admin-pin-new"),
    btnChangePin: document.getElementById("btn-change-pin"),
    newName: document.getElementById("new-name"),
    newShort: document.getElementById("new-short"),
    newDept: document.getElementById("new-dept"),
    newDayrate: document.getElementById("new-dayrate"),
    btnAddName: document.getElementById("btn-add-name"),
    adminSearch: document.getElementById("admin-search"),
    adminList: document.getElementById("admin-list"),
    btnBackMonth: document.getElementById("btn-back-month"),
    monthPicker: document.getElementById("month-picker"),
    monthBody: document.getElementById("month-body"),
    btnMonthEmail: document.getElementById("btn-month-email"),
    btnMonthEmail2: document.getElementById("btn-month-email-2"),
    btnMonthPdf: document.getElementById("btn-month-pdf"),
    btnMonthExcel: document.getElementById("btn-month-excel"),
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function emptyDay() {
    return { slots: {}, lateEntry: false };
  }

  function persistCurrentDayIntoHistory() {
    if (!state.dateKey) return;
    state.days[state.dateKey] = {
      slots: state.slots,
      lateEntry: !!state.lateEntry,
    };
  }

  function loadDayIntoState(key) {
    const day = state.days[key] || emptyDay();
    state.dateKey = key;
    state.slots = day.slots || {};
    state.lateEntry = !!day.lateEntry;
  }

  function save() {
    persistCurrentDayIntoHistory();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentDateKey: state.dateKey,
        days: state.days,
      })
    );
  }

  function saveRoster() {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({
        customEmployees: state.customEmployees,
        deactivatedIds: state.deactivatedIds,
        pin: state.pin,
      })
    );
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.days) {
          state.days = data.days;
          const key = data.currentDateKey || todayKey();
          loadDayIntoState(key);
        }
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const data = JSON.parse(legacy);
          if (data && data.dateKey && data.slots) {
            state.days[data.dateKey] = {
              slots: data.slots,
              lateEntry: false,
            };
            loadDayIntoState(data.dateKey);
            save();
          }
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
          if (data.pin) state.pin = String(data.pin);
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  function isDayRateEligible(empOrSlot) {
    if (!empOrSlot) return false;
    if (empOrSlot.dayRate === true || empOrSlot.dayRateFlag === true) return true;
    return DAYRATE_DEPTS.has(empOrSlot.dept);
  }

  function allEmployees(includeInactive = false) {
    const seed = (window.EMPLOYEES || []).map((e) => ({
      ...e,
      source: "seed",
      active: !state.deactivatedIds.includes(e.id),
      dayRate: DAYRATE_DEPTS.has(e.dept),
    }));
    const custom = state.customEmployees.map((e) => ({
      ...e,
      source: "custom",
      active: e.active !== false,
      dayRate: !!e.dayRate || DAYRATE_DEPTS.has(e.dept),
    }));
    const merged = [...seed, ...custom];
    if (includeInactive) return merged;
    return merged.filter((e) => e.active);
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2000);
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

  function askPin(reason, onOk) {
    state.pinAction = onOk;
    els.pinReason.textContent = reason;
    els.pinInput.value = "";
    els.pinOverlay.classList.add("open");
    setTimeout(() => els.pinInput.focus(), 80);
  }

  function closePin() {
    els.pinOverlay.classList.remove("open");
    state.pinAction = null;
    els.pinInput.value = "";
  }

  function submitPin() {
    const entered = (els.pinInput.value || "").trim();
    if (entered !== String(state.pin)) {
      showToast("Λάθος PIN");
      return;
    }
    const action = state.pinAction;
    closePin();
    if (typeof action === "function") action();
  }

  function slotManualEdits(slot) {
    return (slot && slot.manualEdits) || 0;
  }

  function withManualTimeGuard(fn) {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    if (slotManualEdits(slot) < FREE_MANUAL_EDITS) {
      fn();
      return;
    }
    askPin(
      `Οι ${FREE_MANUAL_EDITS} δωρεάν διορθώσεις ώρας για αυτό το άτομο χρησιμοποιήθηκαν. Βάλτε PIN admin.`,
      fn
    );
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
      const tag = emp.dayRate ? " · ημερομίσθιο" : "";
      btn.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)} · ${escapeHtml(emp.dept)}${tag}</span>`;
      btn.addEventListener("click", () => assignEmployee(emp));
      els.nameList.appendChild(btn);
    });
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
        dayRateEligible: isDayRateEligible(emp),
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
      dayRate: false,
      dayRateEligible: isDayRateEligible(emp),
      manualEdits: 0,
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
    els.personNotes.value = slot.notes || "";

    const eligible = slot.dayRateEligible || isDayRateEligible(slot);
    els.dayratePanel.hidden = !eligible;
    els.dayrateStatus.textContent = "ΑΝ ΕΙΣΑΙ ΗΜΕΡΟΜΙΣΘΙΟ";
    if (slot.dayRate) {
      els.hoursLabel.textContent = "Παρουσία";
      els.personHours.textContent = "1 ημέρα";
      els.btnDayrate.textContent = "Ακύρωση ημερομισθίου";
      els.clockBlock.style.opacity = "0.45";
      els.clockBlockLeave.style.opacity = "0.45";
    } else {
      els.hoursLabel.textContent = "Σύνολο ωρών (και overnight)";
      els.personHours.textContent = formatHours(
        calcHours(slot.arrival, slot.departure)
      );
      els.btnDayrate.textContent = "Ημερομίσθιο (1)";
      els.clockBlock.style.opacity = "1";
      els.clockBlockLeave.style.opacity = "1";
    }

    const used = slotManualEdits(slot);
    const left = Math.max(0, FREE_MANUAL_EDITS - used);
    els.pinHint.textContent =
      left > 0
        ? `${left} δωρεάν χειροκίνητες διορθώσεις ακόμα για αυτό το άτομο· μετά PIN admin.`
        : "Χρειάζεται PIN admin για νέα χειροκίνητη διόρθωση ώρας.";

    setView("person");
  }

  function persistNotes() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    slot.notes = els.personNotes.value;
    save();
  }

  function toggleDayRate() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    slot.dayRate = !slot.dayRate;
    if (slot.dayRate) {
      slot.arrival = null;
      slot.departure = null;
      showToast("Ημερομίσθιο = 1");
    } else {
      showToast("Ώρες ενεργές");
    }
    save();
    openPerson(state.activeSlot);
  }

  function stampArrive() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    if (slot.dayRate) {
      showToast("Ακυρώστε πρώτα το ημερομίσθιο");
      return;
    }
    slot.arrival = nowStamp();
    save();
    openPerson(state.activeSlot);
    showToast(`Άφιξη ${slot.arrival}`);
  }

  function stampLeave() {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    if (slot.dayRate) {
      showToast("Ακυρώστε πρώτα το ημερομίσθιο");
      return;
    }
    slot.departure = nowStamp();
    save();
    openPerson(state.activeSlot);
    showToast(`Αποχώρηση ${slot.departure}`);
  }

  function openTimePicker(field) {
    const slot = state.slots[state.activeSlot];
    if (!slot) return;
    if (slot.dayRate) {
      showToast("Ακυρώστε πρώτα το ημερομίσθιο");
      return;
    }
    const open = () => {
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
    };
    withManualTimeGuard(open);
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

  function bumpManualEdit(slot) {
    slot.manualEdits = slotManualEdits(slot) + 1;
  }

  function applyTime(t) {
    const slot = state.slots[state.activeSlot];
    const field = state.timeField;
    if (!slot || !field) return;
    slot[field] = t;
    bumpManualEdit(slot);
    save();
    closeTimePicker();
    openPerson(state.activeSlot);
    showToast(field === "arrival" ? `Άφιξη ${t}` : `Αποχώρηση ${t}`);
  }

  function clearTimeField() {
    const slot = state.slots[state.activeSlot];
    if (!slot || !state.timeField) return;
    slot[state.timeField] = null;
    bumpManualEdit(slot);
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

  function showDayScreen() {
    els.dayDate.textContent = formatLongDate(state.dateKey);
    els.lateBanner.hidden = !state.lateEntry;
    renderBoard();
    setView("day");
    updateContinueVisibility();
  }

  function startToday() {
    persistCurrentDayIntoHistory();
    const key = todayKey();
    if (!state.days[key]) state.days[key] = emptyDay();
    loadDayIntoState(key);
    state.lateEntry = false;
    save();
    showDayScreen();
  }

  function continueDay() {
    if (!state.dateKey) state.dateKey = todayKey();
    showDayScreen();
  }

  function openDateSheet() {
    askPin("PIN admin για άνοιγμα άλλης ημερομηνίας.", () => {
      els.otherDate.value = state.dateKey || todayKey();
      els.datePicker.classList.add("open");
    });
  }

  function closeDateSheet() {
    els.datePicker.classList.remove("open");
  }

  function openSelectedDate() {
    const key = els.otherDate.value;
    if (!key) {
      showToast("Διαλέξτε ημερομηνία");
      return;
    }
    persistCurrentDayIntoHistory();
    if (!state.days[key]) state.days[key] = emptyDay();
    loadDayIntoState(key);
    if (key !== todayKey()) {
      state.lateEntry = true;
    } else {
      state.lateEntry = !!state.days[key].lateEntry;
    }
    save();
    closeDateSheet();
    showDayScreen();
    showToast(
      key === todayKey() ? "Σημερινή ημέρα" : "Εκπρόθεσμη καταχώρηση"
    );
  }

  function clearDay() {
    askPin("PIN admin για καθαρισμό ημέρας.", () => {
      if (
        !confirm(
          "Καθαρισμός ημέρας; Θα σβηστούν όλα τα ονόματα και οι ώρες αυτής της ημέρας σε αυτό το tablet."
        )
      ) {
        return;
      }
      state.slots = {};
      save();
      renderBoard();
      showToast("Η ημέρα καθαρίστηκε");
      updateContinueVisibility();
    });
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
          let times;
          let hoursLabel;
          if (data.dayRate) {
            times = "ημερομίσθιο";
            hoursLabel = "1 ημέρα";
          } else {
            times =
              data.arrival || data.departure
                ? `${data.arrival || "—"} → ${data.departure || "—"}`
                : "χωρίς ώρες ακόμα";
            hoursLabel = formatHours(calcHours(data.arrival, data.departure));
          }
          const noteMark = data.notes && data.notes.trim() ? " · σημ." : "";
          btn.innerHTML = `
            <span class="slot-main">
              <span class="slot-name">${escapeHtml(data.short)}</span>
              <span class="slot-times">${escapeHtml(times)}${noteMark}</span>
            </span>
            <span class="slot-hours">${escapeHtml(hoursLabel)}</span>
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
    askPin("PIN admin για Ονόματα / PIN.", () => {
      els.adminSearch.value = "";
      els.newName.value = "";
      els.newShort.value = "";
      els.newDayrate.checked = false;
      els.adminPinCurrent.value = "";
      els.adminPinNew.value = "";
      renderAdminList();
      setView("names");
    });
  }

  function changePin() {
    const current = (els.adminPinCurrent.value || "").trim();
    const next = (els.adminPinNew.value || "").trim();
    if (current !== String(state.pin)) {
      showToast("Λάθος τρέχον PIN");
      return;
    }
    if (!/^\d{4,8}$/.test(next)) {
      showToast("Νέο PIN: 4–8 ψηφία");
      return;
    }
    state.pin = next;
    saveRoster();
    els.adminPinCurrent.value = "";
    els.adminPinNew.value = "";
    showToast("Το PIN άλλαξε");
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
      const tags = [
        emp.dept,
        emp.dayRate ? "ημερομίσθιο" : null,
        emp.source === "custom" ? "δικό σας" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      main.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)} · ${escapeHtml(tags)}</span>`;
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
      dayRate: !!els.newDayrate.checked || DAYRATE_DEPTS.has(dept),
      active: true,
    });
    saveRoster();
    els.newName.value = "";
    els.newShort.value = "";
    els.newDayrate.checked = false;
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

  function openMonth() {
    askPin("PIN admin για άνοιγμα Μήνα.", () => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (!els.monthPicker.value) els.monthPicker.value = ym;
      renderMonth();
      setView("month");
    });
  }

  function formatDayMonth(dateKey) {
    const parts = String(dateKey || "").split("-");
    if (parts.length < 3) return dateKey || "";
    return `${Number(parts[2])}/${Number(parts[1])}`;
  }

  function formatHoursBreakdown(h) {
    if (h == null) return "—";
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    if (mins === 0) return `${whole} ώρες`;
    return `${whole}:${String(mins).padStart(2, "0")} ώρες`;
  }

  function collectMonthRows(ym) {
    const totals = {};
    Object.entries(state.days).forEach(([dateKey, day]) => {
      if (!dateKey.startsWith(ym)) return;
      // One stamp group per employee per calendar day (merge multi-slot same day).
      const byEmp = {};
      Object.values(day.slots || {}).forEach((slot) => {
        if (!slot || !slot.empId) return;
        if (!byEmp[slot.empId]) {
          byEmp[slot.empId] = {
            short: slot.short,
            name: slot.name,
            hours: 0,
            dayRate: false,
            stamped: false,
          };
        }
        const e = byEmp[slot.empId];
        e.short = slot.short || e.short;
        e.name = slot.name || e.name;
        if (slot.dayRate) {
          e.dayRate = true;
          e.stamped = true;
        } else {
          const h = calcHours(slot.arrival, slot.departure);
          if (h != null && h > 0) {
            e.hours += h;
            e.stamped = true;
          } else if (slot.arrival || slot.departure) {
            e.stamped = true;
          }
        }
      });

      Object.entries(byEmp).forEach(([empId, dayEmp]) => {
        if (!dayEmp.stamped) return;
        if (!totals[empId]) {
          totals[empId] = {
            short: dayEmp.short,
            name: dayEmp.name,
            days: 0,
            hours: 0,
            dayRates: 0,
            dayParts: [],
          };
        }
        const row = totals[empId];
        row.short = dayEmp.short || row.short;
        row.name = dayEmp.name || row.name;
        row.days += 1;
        const dm = formatDayMonth(dateKey);
        if (dayEmp.dayRate) {
          row.dayRates += 1;
          row.dayParts.push({ dateKey, dm, label: "1 ημέρα" });
        } else {
          const h = Math.round(dayEmp.hours * 100) / 100;
          if (h > 0) {
            row.hours += h;
            row.dayParts.push({
              dateKey,
              dm,
              label: formatHoursBreakdown(h),
            });
          } else {
            row.dayParts.push({ dateKey, dm, label: "—" });
          }
        }
      });
    });
    return Object.values(totals)
      .map((r) => {
        const dayParts = r.dayParts
          .slice()
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        return {
          ...r,
          hours: Math.round(r.hours * 100) / 100,
          dayParts,
          dayBreakdown: dayParts.map((p) => `${p.dm} ${p.label}`).join(", "),
        };
      })
      .sort((a, b) => a.short.localeCompare(b.short, "el"));
  }

  function renderMonth() {
    const ym = els.monthPicker.value;
    els.monthBody.innerHTML = "";
    if (!ym) return;
    const rows = collectMonthRows(ym);
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5">Καμία καταχώρηση για αυτόν τον μήνα σε αυτό το tablet.</td>`;
      els.monthBody.appendChild(tr);
      return;
    }
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.short)}<br><span style="color:var(--muted);font-size:0.85rem">${escapeHtml(r.name || "")}</span></td>
        <td>${r.days}</td>
        <td>${r.hours ? formatHours(r.hours) : "—"}</td>
        <td>${r.dayRates || "—"}</td>
        <td style="font-size:0.85rem;max-width:14rem">${escapeHtml(r.dayBreakdown || "—")}</td>
      `;
      els.monthBody.appendChild(tr);
    });
  }

  function exportMonthPdf() {
    const ym = els.monthPicker.value;
    if (!ym) {
      showToast("Διαλέξτε μήνα");
      return;
    }
    const rows = collectMonthRows(ym);
    els.printRoot.innerHTML = `
      <h1>ΠΑΡΟΥΣΙΟΛΟΓΙΟ — STORE 311</h1>
      <p>Σύνοψη μήνα ${escapeHtml(ym)}</p>
      <table>
        <thead>
          <tr><th>Όνομα</th><th>Πλήρες</th><th>Ημέρες</th><th>Ώρες</th><th>Ημερομίσθια</th><th>Ανά ημέρα</th></tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.short)}</td><td>${escapeHtml(r.name || "")}</td><td>${r.days}</td><td>${r.hours || ""}</td><td>${r.dayRates || ""}</td><td>${escapeHtml(r.dayBreakdown || "")}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    window.print();
  }

  function exportMonthExcel() {
    const ym = els.monthPicker.value;
    if (!ym) {
      showToast("Διαλέξτε μήνα");
      return;
    }
    const rows = collectMonthRows(ym);
    const lines = [
      "Όνομα;Πλήρες;Ημέρες;Ώρες;Ημερομίσθια;Ανά ημέρα",
      ...rows.map(
        (r) =>
          `${csvCell(r.short)};${csvCell(r.name || "")};${r.days};${r.hours || ""};${r.dayRates || ""};${csvCell(r.dayBreakdown || "")}`
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `parousiologio-month-${ym}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Excel / CSV");
  }

  function csvCell(v) {
    const s = String(v ?? "");
    if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function emailMonth() {
    const ym = els.monthPicker.value;
    if (!ym) {
      showToast("Διαλέξτε μήνα");
      return;
    }
    const rows = collectMonthRows(ym);
    const lines = [
      `ΠΑΡΟΥΣΙΟΛΟΓΙΟ STORE 311 — μήνας ${ym}`,
      "",
      ...rows.map((r) => {
        const total =
          r.hours > 0
            ? `σύνολο ${formatHoursBreakdown(r.hours)}`
            : r.dayRates > 0
              ? `ημερομ. ${r.dayRates}`
              : `ημέρες ${r.days}`;
        const detail = r.dayBreakdown ? ` — ${r.dayBreakdown}` : "";
        return `${r.short}: ${total}${detail}`;
      }),
      "",
      "Σημείωση: mailto μόνο — όχι αυτόματη αποστολή χωρίς server.",
    ];
    const subject = encodeURIComponent(`Παρουσιολόγιο μήνας ${ym} — STORE 311`);
    let body = encodeURIComponent(lines.join("\n"));
    if (body.length > 1800) {
      body = encodeURIComponent(
        lines.slice(0, 40).join("\n") + "\n\n(κομμένο — χρησιμοποιήστε Excel/PDF)"
      );
    }
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showToast("Άνοιγμα email…");
  }

  function updateClocks() {
    const now = new Date();
    els.homeDate.textContent = formatLongDate(todayKey(now));
    els.homeTime.textContent = formatClock(now);
    if (els.dayClock) els.dayClock.textContent = formatClock(now);
  }

  function updateContinueVisibility() {
    const has =
      state.dateKey &&
      state.days[state.dateKey] &&
      Object.keys(state.days[state.dateKey].slots || {}).length > 0;
    els.btnContinue.hidden = !has;
    if (has) {
      els.btnContinue.textContent =
        state.dateKey === todayKey()
          ? "Συνέχεια σημερινής"
          : `Άνοιγμα ${state.dateKey}`;
    }
  }

  function collectDayRows() {
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
          hours: data.dayRate ? null : calcHours(data.arrival, data.departure),
          dayRate: !!data.dayRate,
          dayUnits: data.dayRate ? 1 : 0,
          notes: data.notes || "",
        });
      }
    });
    return rows;
  }

  function buildPrint() {
    const rows = collectDayRows();
    els.printRoot.innerHTML = `
      <h1>ΠΑΡΟΥΣΙΟΛΟΓΙΟ — STORE 311</h1>
      <p>${formatLongDate(state.dateKey)}</p>
      <p>${state.lateEntry ? "Εκπρόθεσμη καταχώρηση · " : ""}Αποθήκευση: localStorage σε αυτό το tablet</p>
      <table>
        <thead>
          <tr><th>Πόστο</th><th>Όνομα</th><th>Άφιξη</th><th>Αποχώρηση</th><th>Ώρες / 1</th><th>Σημειώσεις</th></tr>
        </thead>
        <tbody>
          ${rows
            .map((r) => {
              const unit = r.dayRate
                ? "1 ημέρα"
                : r.hours == null
                  ? ""
                  : String(r.hours);
              return `<tr><td>${escapeHtml(r.post)}</td><td>${escapeHtml(r.short)}</td><td>${escapeHtml(r.arrival || "")}</td><td>${escapeHtml(r.departure || "")}</td><td>${escapeHtml(unit)}</td><td>${escapeHtml(r.notes)}</td></tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function printDay() {
    buildPrint();
    window.print();
  }

  function dayPayload() {
    return {
      store: "STORE 311",
      dateKey: state.dateKey,
      lateEntry: !!state.lateEntry,
      exportedAt: new Date().toISOString(),
      storage: "localStorage on this tablet only",
      entries: collectDayRows(),
    };
  }

  function exportDayJson() {
    const payload = dayPayload();
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

  function emailDay() {
    const payload = dayPayload();
    const lines = [
      `ΠΑΡΟΥΣΙΟΛΟΓΙΟ STORE 311 — ${state.dateKey}`,
      state.lateEntry ? "Εκπρόθεσμη καταχώρηση" : "",
      "",
      ...payload.entries.map((r) => {
        const unit = r.dayRate
          ? "1 ημέρα"
          : `${r.arrival || "—"}→${r.departure || "—"} (${r.hours ?? "—"})`;
        return `${r.post}: ${r.short} ${unit}${r.notes ? " · " + r.notes : ""}`;
      }),
      "",
      "JSON:",
      JSON.stringify(payload),
      "",
      "Σημείωση: αυτό ανοίγει μόνο το email app (mailto). Αυτόματη αποστολή χωρίς server έρχεται αργότερα.",
    ].filter((x, i, arr) => !(x === "" && arr[i - 1] === ""));

    const subject = encodeURIComponent(
      `Παρουσιολόγιο ${state.dateKey} — STORE 311`
    );
    let body = encodeURIComponent(lines.join("\n"));
    // keep under common mailto length limits
    if (body.length > 1800) {
      body = encodeURIComponent(
        lines.slice(0, -3).join("\n") +
          "\n\n(JSON κομμένο — χρησιμοποιήστε Εξαγωγή ⬇ στο tablet)"
      );
    }
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showToast("Άνοιγμα email…");
  }

  function goHome() {
    persistNotesIfNeeded();
    updateContinueVisibility();
    setView("home");
  }

  function persistNotesIfNeeded() {
    if (state.view === "person" && state.activeSlot) persistNotes();
  }

  function registerPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.deferredInstall = e;
      els.btnInstall.hidden = false;
    });
    els.btnInstall.addEventListener("click", async () => {
      if (!state.deferredInstall) {
        showToast("Χρησιμοποιήστε «Προσθήκη στην αρχική οθόνη» στο Chrome");
        return;
      }
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      els.btnInstall.hidden = true;
    });
  }

  load();
  fillDeptSelect();
  updateClocks();
  updateContinueVisibility();
  registerPwa();
  setInterval(updateClocks, 1000);

  els.btnToday.addEventListener("click", startToday);
  els.btnContinue.addEventListener("click", continueDay);
  els.btnOtherDay.addEventListener("click", openDateSheet);
  els.btnMonth.addEventListener("click", openMonth);
  els.btnNames.addEventListener("click", openNames);
  els.btnBackHome.addEventListener("click", goHome);
  els.btnBackHome2.addEventListener("click", goHome);
  els.btnBackNames.addEventListener("click", goHome);
  els.btnBackMonth.addEventListener("click", goHome);
  els.btnBackDay.addEventListener("click", () => {
    persistNotes();
    showDayScreen();
  });
  els.btnArrive.addEventListener("click", stampArrive);
  els.btnLeave.addEventListener("click", stampLeave);
  els.btnEditArrive.addEventListener("click", () => openTimePicker("arrival"));
  els.btnEditLeave.addEventListener("click", () => openTimePicker("departure"));
  els.btnDayrate.addEventListener("click", toggleDayRate);
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
  els.btnCloseDate.addEventListener("click", closeDateSheet);
  els.datePicker.addEventListener("click", (e) => {
    if (e.target === els.datePicker) closeDateSheet();
  });
  els.btnOpenDate.addEventListener("click", openSelectedDate);
  els.btnClosePin.addEventListener("click", closePin);
  els.pinOverlay.addEventListener("click", (e) => {
    if (e.target === els.pinOverlay) closePin();
  });
  els.btnPinOk.addEventListener("click", submitPin);
  els.pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitPin();
  });
  els.btnPrint.addEventListener("click", printDay);
  els.btnExport.addEventListener("click", exportDayJson);
  els.btnEmail.addEventListener("click", emailDay);
  els.btnClearDay.addEventListener("click", clearDay);
  els.btnAddName.addEventListener("click", addEmployee);
  els.btnChangePin.addEventListener("click", changePin);
  els.adminSearch.addEventListener("input", renderAdminList);
  els.personNotes.addEventListener("change", persistNotes);
  els.personNotes.addEventListener("blur", persistNotes);
  els.monthPicker.addEventListener("change", renderMonth);
  els.btnMonthPdf.addEventListener("click", exportMonthPdf);
  els.btnMonthExcel.addEventListener("click", exportMonthExcel);
  els.btnMonthEmail.addEventListener("click", emailMonth);
  els.btnMonthEmail2.addEventListener("click", emailMonth);

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
