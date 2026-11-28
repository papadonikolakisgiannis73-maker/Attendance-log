(() => {
  // Stable data keys — never rename/bump these on SW/cache updates.
  // Separate from tablet-demo (STORE 311) so both apps can share one device.
  const STORE_NAME = "Le Jardin";
  const STORAGE_KEY = "le-jardin-attendance-v1";
  const ROSTER_KEY = "le-jardin-roster-v1";
  const IDB_NAME = "le-jardin-offline-db";
  const IDB_STORE = "kv";
  const IDB_BACKUP_KEY = "full-backup-v1";
  const DEFAULT_PIN = "3111";
  const FREE_MANUAL_EDITS = 2;

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
    // Seed renames keyed by stable employee id (never wipe on boot).
    overrides: {},
    deactivatedIds: [],
    pin: DEFAULT_PIN,
    pickSlot: null,
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
    btnFullscreen: document.getElementById("btn-fullscreen"),
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
    btnBackupRaw: document.getElementById("btn-backup-raw"),
    newName: document.getElementById("new-name"),
    newShort: document.getElementById("new-short"),
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
    btnMonthJson: document.getElementById("btn-month-json"),
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

  // Business day rolls at 05:00 local (shop tablets, Europe/Athens).
  // Before 05:00 still counts as the previous calendar date.
  const DAY_ROLLOVER_HOUR = 5;

  function todayKey(d = new Date()) {
    const shifted = new Date(d.getTime());
    if (shifted.getHours() < DAY_ROLLOVER_HOUR) {
      shifted.setDate(shifted.getDate() - 1);
    }
    const y = shifted.getFullYear();
    const m = String(shifted.getMonth() + 1).padStart(2, "0");
    const day = String(shifted.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isDatePickerOpen() {
    return !!(els.datePicker && els.datePicker.classList.contains("open"));
  }

  /** Persist stale day and switch to business-today. Skips intentional lateEntry and open date picker. */
  function rollToBusinessToday() {
    const today = todayKey();
    if (!state.dateKey || state.dateKey === today) return false;
    if (isDatePickerOpen()) return false;
    // Admin late-entry for another date stays until they leave / start today.
    if (state.lateEntry) return false;

    persistCurrentDayIntoHistory();
    if (!state.days[today]) state.days[today] = emptyDay();
    loadDayIntoState(today);
    state.lateEntry = false;
    state.activeSlot = null;
    save();
    return true;
  }

  /** Auto-correct after 05:00 boundary (clock / focus / visibility / stamp). */
  function ensureBusinessDay() {
    if (!rollToBusinessToday()) return false;
    if (state.view === "day" || state.view === "person") {
      els.dayDate.textContent = formatLongDate(state.dateKey);
      els.lateBanner.hidden = !state.lateEntry;
      renderBoard();
      setView("day");
    }
    updateContinueVisibility();
    showToast("Η ημέρα άλλαξε σε σήμερα");
    return true;
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
    if (!state.days[key]) state.days[key] = emptyDay();
    const day = state.days[key];
    state.dateKey = key;
    state.slots = day.slots || {};
    day.slots = state.slots;
    state.lateEntry = !!day.lateEntry;
  }

  function attendancePayload() {
    persistCurrentDayIntoHistory();
    return {
      currentDateKey: state.dateKey,
      days: state.days,
    };
  }

  function rosterPayload() {
    return {
      customEmployees: state.customEmployees,
      overrides: state.overrides,
      deactivatedIds: state.deactivatedIds,
      pin: state.pin,
    };
  }

  function rosterRichness(roster) {
    if (!roster || typeof roster !== "object") return 0;
    const custom = Array.isArray(roster.customEmployees)
      ? roster.customEmployees.length
      : 0;
    const deactivated = Array.isArray(roster.deactivatedIds)
      ? roster.deactivatedIds.length
      : 0;
    const overrides =
      roster.overrides && typeof roster.overrides === "object"
        ? Object.keys(roster.overrides).length
        : 0;
    const pinBonus =
      roster.pin && String(roster.pin) !== DEFAULT_PIN ? 1 : 0;
    return custom + deactivated + overrides + pinBonus;
  }

  function pickRicherRoster(a, b) {
    const ra = rosterRichness(a);
    const rb = rosterRichness(b);
    if (rb > ra) return b;
    if (ra > 0) return a;
    return a || b || null;
  }

  function normalizeOverrides(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out = {};
    Object.keys(raw).forEach((id) => {
      const row = raw[id];
      if (!row || typeof row !== "object") return;
      const name = row.name != null ? String(row.name).trim() : "";
      const short = row.short != null ? String(row.short).trim() : "";
      if (!name && !short) return;
      out[id] = {
        name: name || short,
        short: short || name.split(/\s+/)[0] || name,
      };
      if (typeof row.dayRate === "boolean") out[id].dayRate = row.dayRate;
    });
    return out;
  }

  function fullBackupPayload() {
    return {
      version: 1,
      store: STORE_NAME,
      savedAt: new Date().toISOString(),
      attendance: attendancePayload(),
      roster: rosterPayload(),
    };
  }

  function countStampedSlots(days) {
    if (!days || typeof days !== "object") return 0;
    let n = 0;
    Object.values(days).forEach((day) => {
      Object.values((day && day.slots) || {}).forEach((slot) => {
        if (!slot) return;
        if (slot.empId || slot.arrival || slot.departure || slot.dayRate) n += 1;
      });
    });
    return n;
  }

  function safeParseJson(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function writeLocalAttendance(payload) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function writeLocalRoster(payload) {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(payload));
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("no-idb"));
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb-open-failed"));
    });
  }

  function idbGet(key) {
    return openIdb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, "readonly");
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(key);
          req.onsuccess = () => {
            db.close();
            resolve(req.result || null);
          };
          req.onerror = () => {
            db.close();
            reject(req.error);
          };
        })
    );
  }

  function idbSet(key, value) {
    return openIdb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, "readwrite");
          const store = tx.objectStore(IDB_STORE);
          const req = store.put(value, key);
          req.onsuccess = () => {
            db.close();
            resolve();
          };
          req.onerror = () => {
            db.close();
            reject(req.error);
          };
        })
    );
  }

  function mirrorBackupToIdb() {
    return idbSet(IDB_BACKUP_KEY, fullBackupPayload()).catch(() => null);
  }

  function requestPersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    } catch (_) {
      /* ignore */
    }
  }

  function save() {
    const payload = attendancePayload();
    try {
      writeLocalAttendance(payload);
    } catch (_) {
      showToast("Αποθήκευση localStorage απέτυχε — δοκιμάστε αντίγραφο JSON");
    }
    mirrorBackupToIdb();
  }

  function saveRoster() {
    const payload = rosterPayload();
    try {
      writeLocalRoster(payload);
    } catch (_) {
      showToast("Αποθήκευση ονομάτων απέτυχε");
    }
    mirrorBackupToIdb();
  }

  function applyAttendanceData(data) {
    if (!data || !data.days || typeof data.days !== "object") return false;
    state.days = data.days;
    const key = data.currentDateKey || todayKey();
    loadDayIntoState(key);
    return true;
  }

  function applyRosterData(data) {
    if (!data || typeof data !== "object") return false;
    const seedIds = new Set((window.EMPLOYEES || []).map((e) => e.id));
    const incoming = Array.isArray(data.customEmployees)
      ? data.customEmployees
      : [];
    const custom = [];
    const overrides = normalizeOverrides(data.overrides);
    incoming.forEach((row) => {
      if (!row || !row.id) return;
      if (seedIds.has(row.id) && !overrides[row.id]) {
        overrides[row.id] = {
          name: String(row.name || "").trim(),
          short: String(row.short || row.name || "")
            .trim()
            .split(/\s+/)[0],
        };
        if (typeof row.dayRate === "boolean") {
          overrides[row.id].dayRate = row.dayRate;
        }
        return;
      }
      custom.push(row);
    });
    state.customEmployees = custom;
    state.overrides = overrides;
    state.deactivatedIds = Array.isArray(data.deactivatedIds)
      ? data.deactivatedIds
      : [];
    if (data.pin) state.pin = String(data.pin);
    return true;
  }

  function readLocalAttendance() {
    const data = safeParseJson(localStorage.getItem(STORAGE_KEY));
    if (data && data.days) return data;
    return null;
  }

  function readLocalRoster() {
    const data = safeParseJson(localStorage.getItem(ROSTER_KEY));
    return data && typeof data === "object" ? data : null;
  }

  async function load() {
    requestPersistentStorage();
    let attendance = readLocalAttendance();
    let roster = readLocalRoster();
    let idbBackup = null;
    let idbReadOk = false;
    try {
      idbBackup = await idbGet(IDB_BACKUP_KEY);
      idbReadOk = true;
    } catch (_) {
      idbBackup = null;
      idbReadOk = false;
    }

    const lsCount = countStampedSlots(attendance && attendance.days);
    const idbCount = countStampedSlots(
      idbBackup && idbBackup.attendance && idbBackup.attendance.days
    );

    if ((!attendance || lsCount === 0) && idbBackup && idbBackup.attendance && idbCount > 0) {
      attendance = idbBackup.attendance;
      try {
        writeLocalAttendance(attendance);
      } catch (_) {
        /* still use in-memory */
      }
    } else if (attendance && idbCount > lsCount) {
      attendance = idbBackup.attendance;
      try {
        writeLocalAttendance(attendance);
      } catch (_) {
        /* ignore */
      }
    }

    // Prefer richer roster — never let empty/default LS wipe IDB renames/adds.
    const idbRoster = idbBackup && idbBackup.roster ? idbBackup.roster : null;
    const chosenRoster = pickRicherRoster(roster, idbRoster);
    if (chosenRoster && chosenRoster !== roster) {
      roster = chosenRoster;
      try {
        writeLocalRoster(roster);
      } catch (_) {
        /* ignore */
      }
    } else {
      roster = chosenRoster;
    }

    if (attendance) applyAttendanceData(attendance);
    if (roster) applyRosterData(roster);

    try {
      writeLocalAttendance(attendancePayload());
      writeLocalRoster(rosterPayload());
    } catch (_) {
      /* ignore */
    }
    const localRich =
      rosterRichness(rosterPayload()) > 0 ||
      countStampedSlots(attendancePayload().days) > 0;
    if (idbReadOk || localRich) {
      await mirrorBackupToIdb();
    }
  }

  async function exportRawBackup() {
    const backup = fullBackupPayload();
    const text = JSON.stringify(backup, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    await deliverBlob({
      blob,
      filename: `le-jardin-backup-${todayKey()}.json`,
      mime: "application/json",
      text,
      startLabel: "Ετοιμασία αντιγράφου…",
      successLabel: "Αντίγραφο JSON αποθηκεύτηκε",
    });
  }

  function flushPersist() {
    try {
      persistNotesIfNeeded();
      const payload = attendancePayload();
      writeLocalAttendance(payload);
      writeLocalRoster(rosterPayload());
    } catch (_) {
      /* ignore */
    }
    mirrorBackupToIdb();
  }

  function isDayRateEligible(empOrSlot) {
    if (!empOrSlot) return false;
    if (empOrSlot.dayRate === true || empOrSlot.dayRateFlag === true) return true;
    if (empOrSlot.dayRateEligible === true) return true;
    return false;
  }

  function allEmployees(includeInactive = false) {
    const byId = new Map();
    (window.EMPLOYEES || []).forEach((e) => {
      const over = state.overrides[e.id] || {};
      byId.set(e.id, {
        ...e,
        ...over,
        id: e.id,
        source: "seed",
        active: !state.deactivatedIds.includes(e.id),
        dayRate:
          typeof over.dayRate === "boolean" ? over.dayRate : !!e.dayRate,
        renamed: !!(over.name || over.short),
      });
    });
    state.customEmployees.forEach((e) => {
      if (!e || !e.id) return;
      if (byId.has(e.id)) {
        const prev = byId.get(e.id);
        byId.set(e.id, {
          ...prev,
          name: e.name || prev.name,
          short: e.short || prev.short,
          dayRate:
            typeof e.dayRate === "boolean" ? e.dayRate : prev.dayRate,
          renamed: true,
          active:
            e.active === false
              ? false
              : !state.deactivatedIds.includes(e.id),
        });
        return;
      }
      byId.set(e.id, {
        ...e,
        source: "custom",
        active: e.active !== false,
        dayRate: !!e.dayRate,
        renamed: false,
      });
    });
    const merged = Array.from(byId.values());
    if (includeInactive) return merged;
    return merged.filter((e) => e.active);
  }

  function showToast(msg, ms = 2500) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), ms);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function tryAnchorDownload(url, filename) {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (_) {
      return false;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  /**
   * Android Chrome / installed PWA often ignore <a download> + blob URLs
   * (and immediate revokeObjectURL can cancel the download). Chain:
   * anchor download → Web Share(File) → open tab → clipboard «αντιγράφηκε».
   */
  async function deliverBlob({
    blob,
    filename,
    mime,
    text,
    startLabel,
    successLabel,
  }) {
    showToast(startLabel || "Ετοιμασία αρχείου…", 3000);
    const type = mime || blob.type || "application/octet-stream";
    const url = URL.createObjectURL(blob);
    let keepAliveMs = 4000;

    try {
      tryAnchorDownload(url, filename);
      await sleep(300);

      const file = new File([blob], filename, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          showToast(successLabel || "Έτοιμο — μοιράστηκε", 3500);
          return "shared";
        } catch (err) {
          if (err && err.name === "AbortError") {
            showToast("Ακυρώθηκε", 2500);
            return "aborted";
          }
        }
      }

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      const android = /Android/i.test(navigator.userAgent || "");

      // Desktop browsers usually honor <a download>; toast success there.
      if (!android && !standalone) {
        showToast(successLabel || "Αποθηκεύτηκε", 3000);
        return "download";
      }

      let win = null;
      try {
        win = window.open(url, "_blank", "noopener,noreferrer");
      } catch (_) {
        win = null;
      }
      if (win) {
        keepAliveMs = 60000;
        showToast("Άνοιξε καρτέλα — Αποθήκευση / Κοινή χρήση", 4500);
        return "tab";
      }

      const payload =
        text != null
          ? text
          : typeof blob.text === "function"
            ? await blob.text()
            : "";
      if (payload && (await copyText(payload))) {
        showToast("αντιγράφηκε — επικολλήστε σε αρχείο", 4500);
        return "clipboard";
      }

      showToast("Αποτυχία εξαγωγής — δοκιμάστε Chrome", 4000);
      return "fail";
    } catch (_) {
      showToast("Αποτυχία εξαγωγής", 4000);
      return "fail";
    } finally {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {
          /* ignore */
        }
      }, keepAliveMs);
    }
  }

  function setView(view) {
    state.view = view;
    Object.entries(els.screens).forEach(([name, el]) => {
      el.classList.toggle("active", name === view);
    });
  }

  function usedEmpIds(exceptSlot) {
    const used = new Set();
    Object.entries(state.slots).forEach(([key, slot]) => {
      if (key !== exceptSlot && slot && slot.empId) used.add(slot.empId);
    });
    return used;
  }

  function filteredEmployees(query) {
    const used = usedEmpIds(state.pickSlot);
    const q = (query || "").trim().toLocaleLowerCase("el");
    return allEmployees(false)
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

  function nextSlotKey() {
    let i = 0;
    while (state.slots[`flat-${i}`]) i += 1;
    return `flat-${i}`;
  }

  function openPicker(slotKey, mode = "new") {
    state.pickSlot = slotKey;
    state.pickMode = mode;
    els.pickerTitle.textContent =
      mode === "change" ? "Αλλαγή ονόματος" : "Επιλογή ονόματος";
    els.pickerSub.textContent = "Προσωπικό Le Jardin";
    els.pickerSearch.value = "";
    renderNameList();
    els.picker.classList.add("open");
    setTimeout(() => els.pickerSearch.focus(), 80);
  }

  function closePicker() {
    els.picker.classList.remove("open");
    state.pickSlot = null;
    state.pickMode = "new";
  }

  function renderNameList() {
    const list = filteredEmployees(els.pickerSearch.value);
    els.nameList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "sheet-sub";
      empty.textContent = "Δεν βρέθηκαν διαθέσιμα ονόματα.";
      els.nameList.appendChild(empty);
      return;
    }
    list.forEach((emp) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "name-item";
      const tag = emp.dayRate ? " · ημερομίσθιο" : "";
      btn.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)}${tag}</span>`;
      btn.addEventListener("click", () => assignEmployee(emp));
      els.nameList.appendChild(btn);
    });
  }

  function assignEmployee(emp) {
    const key = state.pickSlot || nextSlotKey();
    const existing = state.slots[key];
    if (state.pickMode === "change" && existing) {
      state.slots[key] = {
        ...existing,
        empId: emp.id,
        short: emp.short,
        name: emp.name,
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
    if (els.personPost) {
      els.personPost.hidden = true;
      els.personPost.textContent = "";
    }
    els.personName.textContent = slot.short;
    els.personDept.textContent = slot.name || "";
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
    if (ensureBusinessDay()) return;
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
    if (ensureBusinessDay()) return;
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
    openPicker(state.activeSlot, "change");
  }

  function removePerson() {
    if (!state.activeSlot) return;
    if (!confirm("Αφαίρεση αυτού του ατόμου από τη λίστα ημέρας;")) return;
    delete state.slots[state.activeSlot];
    save();
    state.activeSlot = null;
    renderBoard();
    setView("day");
    showToast("Αφαιρέθηκε");
  }

  function showDayScreen() {
    const rolled = rollToBusinessToday();
    els.dayDate.textContent = formatLongDate(state.dateKey);
    els.lateBanner.hidden = !state.lateEntry;
    renderBoard();
    setView("day");
    updateContinueVisibility();
    if (rolled) showToast("Η ημέρα άλλαξε σε σήμερα");
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
    // Past date without lateEntry auto-corrects to business-today on the day board.
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

  function sortedSlotEntries() {
    return Object.entries(state.slots)
      .filter(([, data]) => data && data.empId)
      .sort((a, b) =>
        String(a[1].short || "").localeCompare(String(b[1].short || ""), "el")
      );
  }

  function renderBoard() {
    els.board.innerHTML = "";
    const section = document.createElement("section");
    section.className = "post flat-roster";
    const slotsEl = document.createElement("div");
    slotsEl.className = "slots";

    sortedSlotEntries().forEach(([key, data]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot filled";
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
      slotsEl.appendChild(btn);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "slot";
    addBtn.innerHTML = `<span class="slot-empty">＋ Προσθήκη</span>`;
    addBtn.addEventListener("click", () => openPicker(nextSlotKey(), "new"));
    slotsEl.appendChild(addBtn);

    section.appendChild(slotsEl);
    els.board.appendChild(section);
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
          e.name.toLocaleLowerCase("el").includes(q)
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
        emp.dayRate ? "ημερομίσθιο" : null,
        emp.source === "custom" ? "δικό σας" : null,
        emp.renamed ? "μετονομασία" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      main.innerHTML = `<strong>${escapeHtml(emp.short)}</strong><span>${escapeHtml(emp.name)}${tags ? " · " + escapeHtml(tags) : ""}</span>`;
      const actions = document.createElement("div");
      actions.className = "admin-item-actions";
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "btn btn-ghost btn-sm";
      renameBtn.textContent = "Μετονομασία";
      renameBtn.addEventListener("click", () => renameEmployee(emp));
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
      actions.appendChild(renameBtn);
      actions.appendChild(action);
      row.appendChild(main);
      row.appendChild(actions);
      els.adminList.appendChild(row);
    });
  }

  function renameEmployee(emp) {
    const nextName = window.prompt("Πλήρες όνομα", emp.name || "");
    if (nextName == null) return;
    const name = String(nextName).trim();
    if (!name) {
      showToast("Γράψτε όνομα");
      return;
    }
    const nextShort = window.prompt(
      "Σύντομο όνομα (εμφάνιση)",
      emp.short || name.split(/\s+/)[0]
    );
    if (nextShort == null) return;
    const short =
      String(nextShort).trim() || name.split(/\s+/)[0] || name;
    const upperName = name.toLocaleUpperCase("el");
    const upperShort = short.toLocaleUpperCase("el");

    if (emp.source === "custom") {
      const found = state.customEmployees.find((e) => e.id === emp.id);
      if (found) {
        found.name = upperName;
        found.short = upperShort;
      }
    } else {
      state.overrides[emp.id] = {
        ...(state.overrides[emp.id] || {}),
        name: upperName,
        short: upperShort,
      };
    }
    saveRoster();
    renderAdminList();
    showToast(`Μετονομάστηκε: ${upperShort}`);
  }

  function addEmployee() {
    const name = (els.newName.value || "").trim();
    if (!name) {
      showToast("Γράψτε όνομα");
      return;
    }
    const short = (els.newShort.value || "").trim() || name.split(/\s+/)[0];
    const id = `C${Date.now().toString(36).toUpperCase()}`;
    state.customEmployees.push({
      id,
      name: name.toLocaleUpperCase("el"),
      short: short.toLocaleUpperCase("el"),
      dayRate: !!els.newDayrate.checked,
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
            id: empId,
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

  function monthPayload(ym) {
    const rows = collectMonthRows(ym);
    return {
      store: STORE_NAME,
      yearMonth: ym,
      month: Number(String(ym).split("-")[1]),
      exportedAt: new Date().toISOString(),
      format: "payroll-month-v1",
      employees: rows.map((r) => ({
        id: r.id,
        short: r.short,
        name: r.name,
        daysCount: r.days,
        hours: r.hours,
        dayRates: r.dayRates,
        dayBreakdown: r.dayBreakdown,
        days: (r.dayParts || []).map((p) => {
          const day = Number(String(p.dateKey || "").split("-")[2]);
          const dayRate = p.label === "1 ημέρα";
          let hours = null;
          if (dayRate) hours = 1;
          else {
            const m = String(p.label || "").match(/(\d+)(?::(\d{2}))?/);
            if (m) {
              hours = Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
              hours = Math.round(hours * 100) / 100;
            }
          }
          return {
            dateKey: p.dateKey,
            day,
            label: p.label,
            dayRate,
            hours,
          };
        }),
      })),
    };
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
      <h1>ΠΑΡΟΥΣΙΟΛΟΓΙΟ — ${escapeHtml(STORE_NAME)}</h1>
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

  async function exportMonthExcel() {
    const ym = els.monthPicker.value;
    if (!ym) {
      showToast("Διαλέξτε μήνα");
      return;
    }
    const rows = collectMonthRows(ym);
    const empty = !rows.length;
    const lines = [
      "Κωδικός;Όνομα;Πλήρες;Ημέρες;Ώρες;Ημερομίσθια;Ανά ημέρα",
      ...rows.map(
        (r) =>
          `${csvCell(r.id || "")};${csvCell(r.short)};${csvCell(r.name || "")};${r.days};${r.hours || ""};${r.dayRates || ""};${csvCell(r.dayBreakdown || "")}`
      ),
    ];
    const text = "\uFEFF" + lines.join("\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    await deliverBlob({
      blob,
      filename: `le-jardin-month-${ym}.csv`,
      mime: "text/csv;charset=utf-8",
      text,
      startLabel: empty ? "Κενός μήνας — ετοιμασία CSV…" : "Ετοιμασία Excel / CSV…",
      successLabel: "Excel / CSV",
    });
  }

  async function exportMonthJson() {
    const ym = els.monthPicker.value;
    if (!ym) {
      showToast("Διαλέξτε μήνα");
      return;
    }
    const payload = monthPayload(ym);
    const empty = !payload.employees || !payload.employees.length;
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    await deliverBlob({
      blob,
      filename: `le-jardin-month-${ym}.json`,
      mime: "application/json",
      text,
      startLabel: empty ? "Κενός μήνας — ετοιμασία JSON…" : "Ετοιμασία JSON μισθοδ.…",
      successLabel: "JSON μισθοδοσίας",
    });
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
      `ΠΑΡΟΥΣΙΟΛΟΓΙΟ ${STORE_NAME} — μήνας ${ym}`,
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
    const subject = encodeURIComponent(`Παρουσιολόγιο μήνας ${ym} — ${STORE_NAME}`);
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
    ensureBusinessDay();
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
    return sortedSlotEntries().map(([key, data]) => ({
      slot: key,
      empId: data.empId,
      short: data.short,
      name: data.name,
      arrival: data.arrival,
      departure: data.departure,
      hours: data.dayRate ? null : calcHours(data.arrival, data.departure),
      dayRate: !!data.dayRate,
      dayUnits: data.dayRate ? 1 : 0,
      notes: data.notes || "",
    }));
  }

  function buildPrint() {
    const rows = collectDayRows();
    els.printRoot.innerHTML = `
      <h1>ΠΑΡΟΥΣΙΟΛΟΓΙΟ — ${escapeHtml(STORE_NAME)}</h1>
      <p>${formatLongDate(state.dateKey)}</p>
      <p>${state.lateEntry ? "Εκπρόθεσμη καταχώρηση · " : ""}Αποθήκευση: localStorage + IndexedDB σε αυτό το tablet</p>
      <table>
        <thead>
          <tr><th>Όνομα</th><th>Άφιξη</th><th>Αποχώρηση</th><th>Ώρες / 1</th><th>Σημειώσεις</th></tr>
        </thead>
        <tbody>
          ${rows
            .map((r) => {
              const unit = r.dayRate
                ? "1 ημέρα"
                : r.hours == null
                  ? ""
                  : String(r.hours);
              return `<tr><td>${escapeHtml(r.short)}</td><td>${escapeHtml(r.arrival || "")}</td><td>${escapeHtml(r.departure || "")}</td><td>${escapeHtml(unit)}</td><td>${escapeHtml(r.notes)}</td></tr>`;
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
      store: STORE_NAME,
      dateKey: state.dateKey,
      lateEntry: !!state.lateEntry,
      exportedAt: new Date().toISOString(),
      storage: "localStorage + IndexedDB mirror on this tablet",
      entries: collectDayRows(),
    };
  }

  async function exportDayJson() {
    const payload = dayPayload();
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    await deliverBlob({
      blob,
      filename: `le-jardin-${state.dateKey}.json`,
      mime: "application/json",
      text,
      startLabel: "Ετοιμασία JSON…",
      successLabel: "Εξαγωγή JSON",
    });
  }

  function emailDay() {
    const payload = dayPayload();
    const lines = [
      `ΠΑΡΟΥΣΙΟΛΟΓΙΟ ${STORE_NAME} — ${state.dateKey}`,
      state.lateEntry ? "Εκπρόθεσμη καταχώρηση" : "",
      "",
      ...payload.entries.map((r) => {
        const unit = r.dayRate
          ? "1 ημέρα"
          : `${r.arrival || "—"}→${r.departure || "—"} (${r.hours ?? "—"})`;
        return `${r.short}: ${unit}${r.notes ? " · " + r.notes : ""}`;
      }),
      "",
      "JSON:",
      JSON.stringify(payload),
      "",
      "Σημείωση: αυτό ανοίγει μόνο το email app (mailto). Αυτόματη αποστολή χωρίς server έρχεται αργότερα.",
    ].filter((x, i, arr) => !(x === "" && arr[i - 1] === ""));

    const subject = encodeURIComponent(
      `Παρουσιολόγιο ${state.dateKey} — ${STORE_NAME}`
    );
    let body = encodeURIComponent(lines.join("\n"));
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

  function isStandaloneDisplay() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.navigator.standalone === true
    );
  }

  function isDocumentFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }

  function updateFullscreenButton() {
    if (!els.btnFullscreen) return;
    // Offer fullscreen helper when running as installed app / PWA without OS fullscreen.
    // Does not replace Android screen pinning (lock task).
    const show =
      isStandaloneDisplay() &&
      !isDocumentFullscreen() &&
      !!(document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen);
    els.btnFullscreen.hidden = !show;
  }

  function tryEnterFullscreen() {
    const root = document.documentElement;
    const req =
      root.requestFullscreen ||
      root.webkitRequestFullscreen ||
      root.msRequestFullscreen;
    if (!req || isDocumentFullscreen()) return Promise.resolve(false);
    try {
      const result = req.call(root);
      return Promise.resolve(result).then(() => true).catch(() => false);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  function closeAnyOverlay() {
    if (els.pinOverlay && els.pinOverlay.classList.contains("open")) {
      closePin();
      return true;
    }
    if (els.picker && els.picker.classList.contains("open")) {
      closePicker();
      return true;
    }
    if (els.timePicker && els.timePicker.classList.contains("open")) {
      closeTimePicker();
      return true;
    }
    if (els.datePicker && els.datePicker.classList.contains("open")) {
      closeDateSheet();
      return true;
    }
    return false;
  }

  function navigateBackInApp() {
    if (closeAnyOverlay()) return;
    if (state.view === "person") {
      persistNotesIfNeeded();
      showDayScreen();
      return;
    }
    if (state.view === "day" || state.view === "names" || state.view === "month") {
      goHome();
      return;
    }
    // Already on home — stay; soft history trap keeps browser from exiting the PWA.
  }

  function setupKioskGuards() {
    // Soft web hardening only. True Android lock-task / screen pin is OS-level
    // (see ../kiosk/). Do not fake lock-task from JavaScript.
    try {
      if (!history.state || !history.state.kiosk) {
        history.replaceState({ kiosk: true, view: state.view || "home" }, "");
      }
      history.pushState({ kiosk: true, view: state.view || "home" }, "");
    } catch (_) {
      /* ignore */
    }

    window.addEventListener("popstate", () => {
      navigateBackInApp();
      try {
        history.pushState({ kiosk: true, view: state.view || "home" }, "");
      } catch (_) {
        /* ignore */
      }
    });

    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
    updateFullscreenButton();

    // First staff tap: try browser fullscreen when installed as app (gesture required).
    let triedFs = false;
    document.addEventListener(
      "pointerdown",
      () => {
        if (triedFs || !isStandaloneDisplay() || isDocumentFullscreen()) return;
        triedFs = true;
        tryEnterFullscreen().finally(updateFullscreenButton);
      },
      { passive: true, once: true }
    );
  }

  function registerPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    if (isStandaloneDisplay()) {
      if (els.btnInstall) els.btnInstall.hidden = true;
    } else {
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        state.deferredInstall = e;
        if (els.btnInstall) els.btnInstall.hidden = false;
      });
    }
    window.addEventListener("appinstalled", () => {
      state.deferredInstall = null;
      if (els.btnInstall) els.btnInstall.hidden = true;
      updateFullscreenButton();
      showToast("Εγκαταστάθηκε ως εφαρμογή");
    });
    if (els.btnInstall) {
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
    if (els.btnFullscreen) {
      els.btnFullscreen.addEventListener("click", async () => {
        const ok = await tryEnterFullscreen();
        updateFullscreenButton();
        if (!ok) {
          showToast("Για κλείδωμα tablet: καρφίτσωμα οθόνης (οδηγίες kiosk)");
        }
      });
    }
    setupKioskGuards();
  }

  function bindUi() {
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
    if (els.btnBackupRaw) {
      els.btnBackupRaw.addEventListener("click", exportRawBackup);
    }
    els.adminSearch.addEventListener("input", renderAdminList);
    els.personNotes.addEventListener("change", persistNotes);
    els.personNotes.addEventListener("blur", persistNotes);
    els.monthPicker.addEventListener("change", renderMonth);
    els.btnMonthPdf.addEventListener("click", exportMonthPdf);
    els.btnMonthExcel.addEventListener("click", exportMonthExcel);
    if (els.btnMonthJson) {
      els.btnMonthJson.addEventListener("click", exportMonthJson);
    }
    els.btnMonthEmail.addEventListener("click", emailMonth);
    els.btnMonthEmail2.addEventListener("click", emailMonth);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPersist();
      else ensureBusinessDay();
    });
    window.addEventListener("focus", () => ensureBusinessDay());
    window.addEventListener("pagehide", flushPersist);
  }

  window.__DEMO__ = {
    state,
    startToday,
    continueDay,
    renderBoard,
    save,
    setView,
    openPerson,
    calcHours,
    formatHours,
    allEmployees,
    exportRawBackup,
    flushPersist,
    STORE_NAME,
    todayKey,
    ensureBusinessDay,
    rollToBusinessToday,
  };

  load()
    .catch(() => null)
    .then(() => bindUi());
})();
