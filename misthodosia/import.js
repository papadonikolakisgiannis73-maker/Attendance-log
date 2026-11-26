/**
 * Browser port of payroll-import/import_hours.py
 * Matches by employee code (E0xx), writes day hours, preserves manual overrides via _IMPORT_META.
 * Uses xlsx-populate so formulas/tables in ΜΙΣΘΟΔΟΣΙΑ survive the round-trip.
 */
(function (global) {
  "use strict";

  const DEPT_BLOCKS = [
    ["SERVICE", 15, 18, 48, 2, 25],
    ["ΜΠΟΥΦΕ-ΜΠΑΡ", 53, 56, 86, 2, 10],
    ["ΥΠΕΥΘΥΝΟΙ", 91, 94, 124, 2, 6],
    ["DJ", 129, 132, 162, 2, 6],
    ["ΚΟΥΖΙΝΑ", 167, 170, 200, 2, 14],
    ["ΥΠΟΔΟΧΗ", 205, 208, 238, 2, 20],
  ];

  const MONTH_SHEETS = {
    1: "2026_01_ΙΑΝ",
    2: "2026_02_ΦΕΒ",
    3: "2026_03_ΜΑΡ",
    4: "2026_04_ΑΠΡ",
    5: "2026_05_ΜΑΙ",
    6: "2026_06_ΙΟΥΝ",
    7: "2026_07_ΙΟΥΛ",
    8: "2026_08_ΑΥΓ",
    9: "2026_09_ΣΕΠ",
    10: "2026_10_ΟΚΤ",
    11: "2026_11_ΝΟΕ",
    12: "2026_12_ΔΕΚ",
  };

  const META_SHEET = "_IMPORT_META";
  const CATALOG_START = 6;
  const DAY_RATE_DEPTS = new Set(["ΥΠΕΥΘΥΝΟΙ", "DJ"]);

  function nfc(s) {
    return String(s == null ? "" : s)
      .normalize("NFC")
      .trim();
  }

  function normKey(s) {
    let t = nfc(s).toUpperCase();
    t = t
      .replace(/Ά/g, "Α")
      .replace(/Έ/g, "Ε")
      .replace(/Ή/g, "Η")
      .replace(/Ί/g, "Ι")
      .replace(/Ό/g, "Ο")
      .replace(/Ύ/g, "Υ")
      .replace(/Ώ/g, "Ω")
      .replace(/Ϊ/g, "Ι")
      .replace(/Ϋ/g, "Υ");
    return t.replace(/\s+/g, " ");
  }

  function colLetter(n) {
    let s = "";
    let x = n;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }

  function parseHoursLabel(label) {
    if (label == null) return null;
    const s = nfc(String(label)).toLowerCase();
    if (!s || s === "—" || s === "-" || s === "n/a") return null;
    if (s.includes("ημέρ") || s.includes("ημερ")) return 1.0;
    let m = s.match(/(\d+)[:.](\d{1,2})/);
    if (m) {
      const h = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      if (mins < 60) return Math.round((h + mins / 60) * 100) / 100;
    }
    m = s.match(/(\d+(?:[.,]\d+)?)/);
    if (m) return parseFloat(m[1].replace(",", "."));
    return null;
  }

  function parseDayBreakdown(text) {
    const out = {};
    if (!text) return out;
    const parts = nfc(String(text)).split(/\s*,\s*/);
    for (const part of parts) {
      const m = part.trim().match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
      if (!m) continue;
      const day = parseInt(m[1], 10);
      const hours = parseHoursLabel(m[3]);
      if (hours != null) out[day] = hours;
    }
    return out;
  }

  function roundHalfHour(h) {
    if (h <= 0) return 0;
    const stepped = Math.round(h * 2) / 2;
    return Math.min(13, Math.max(0, stepped));
  }

  function unwrap(v) {
    if (v == null) return null;
    if (typeof v === "object") {
      if (Object.prototype.hasOwnProperty.call(v, "text")) return v.text;
      if (Object.prototype.hasOwnProperty.call(v, "error")) return null;
      if (Object.prototype.hasOwnProperty.call(v, "result")) return v.result;
    }
    return v;
  }

  function cellVal(sheet, row, col) {
    return unwrap(sheet.cell(row, col).value());
  }

  function setVal(sheet, row, col, value) {
    sheet.cell(row, col).value(value);
  }

  function sheetMaxRow(sheet, col, start) {
    let max = start || 1;
    // usedRange can be null on empty sheets
    try {
      const ur = sheet.usedRange();
      if (ur && ur.endCell) {
        max = Math.max(max, ur.endCell.rowNumber());
      }
    } catch (e) {
      /* ignore */
    }
    // scan a bit further for sparse meta
    for (let r = max; r < max + 50; r++) {
      if (cellVal(sheet, r, col == null ? 1 : col) != null) max = r;
    }
    return max;
  }

  function loadCatalog(wb) {
    const ws = wb.sheet("ΚΑΤΑΛΟΓΟΣ");
    if (!ws) throw new Error("Λείπει το φύλλο ΚΑΤΑΛΟΓΟΣ στο Excel.");
    const rows = [];
    const maxRow = Math.max(sheetMaxRow(ws, 1, CATALOG_START), CATALOG_START);
    for (let r = CATALOG_START; r <= maxRow; r++) {
      const rawCode = cellVal(ws, r, 1);
      if (rawCode == null || rawCode === "") continue;
      const code = String(rawCode).trim();
      const name = nfc(String(cellVal(ws, r, 2) || ""));
      const dept = nfc(String(cellVal(ws, r, 3) || ""));
      const short = nfc(String(cellVal(ws, r, 4) || ""));
      const active = nfc(String(cellVal(ws, r, 7) || "")).toUpperCase();
      rows.push({
        row: r,
        code,
        name,
        dept,
        short,
        active: active === "ΝΑΙ",
      });
    }
    return rows;
  }

  function activeByDept(catalog) {
    const by = {};
    for (const row of catalog) {
      if (!row.active) continue;
      if (!by[row.dept]) by[row.dept] = [];
      by[row.dept].push(row);
    }
    return by;
  }

  function columnMapForMonth(catalog) {
    const by = activeByDept(catalog);
    const mapping = {};
    for (const [dept, , day1, dayN, colFirst, colLast] of DEPT_BLOCKS) {
      const people = by[dept] || [];
      const maxSlots = colLast - colFirst + 1;
      for (let i = 0; i < Math.min(people.length, maxSlots); i++) {
        const col = colFirst + i;
        mapping[people[i].code] = { dept, col, day1, dayN };
      }
    }
    return mapping;
  }

  function ensureMetaSheet(wb) {
    let ws = wb.sheet(META_SHEET);
    if (ws) return ws;
    ws = wb.addSheet(META_SHEET);
    const headers = [
      "Μήνας",
      "Κωδικός",
      "Ημέρα",
      "Τελευταία_εισαγωγή",
      "Κλειδωμένο",
      "Σημείωση",
      "Ενημερώθηκε",
    ];
    headers.forEach((h, i) => {
      const cell = ws.cell(1, i + 1);
      cell.value(h);
      cell.style("bold", true);
    });
    ws.hidden(true);
    return ws;
  }

  function metaKey(month, code, day) {
    return `${month}|${code}|${day}`;
  }

  function readMeta(wb) {
    const ws = ensureMetaSheet(wb);
    const out = {};
    const maxRow = Math.max(sheetMaxRow(ws, 1, 1), 1);
    for (let r = 2; r <= maxRow; r++) {
      const month = cellVal(ws, r, 1);
      const code = cellVal(ws, r, 2);
      const day = cellVal(ws, r, 3);
      if (month == null || code == null || day == null) continue;
      const monthI = parseInt(month, 10);
      const dayI = parseInt(day, 10);
      if (!Number.isFinite(monthI) || !Number.isFinite(dayI)) continue;
      const lockedRaw = nfc(String(cellVal(ws, r, 5) || "")).toUpperCase();
      out[metaKey(monthI, String(code).trim(), dayI)] = {
        row: r,
        imported: cellVal(ws, r, 4),
        locked: ["ΝΑΙ", "NAI", "YES", "Y", "1", "TRUE"].includes(lockedRaw),
        note: cellVal(ws, r, 6),
      };
    }
    return out;
  }

  function writeMetaRow(wb, month, code, day, imported, locked, note) {
    const ws = ensureMetaSheet(wb);
    const meta = readMeta(wb);
    const k = metaKey(month, code, day);
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    let r;
    if (meta[k]) {
      r = meta[k].row;
    } else {
      r = Math.max(sheetMaxRow(ws, 1, 1), 1) + 1;
      if (cellVal(ws, r, 1) != null) r += 1;
      setVal(ws, r, 1, month);
      setVal(ws, r, 2, code);
      setVal(ws, r, 3, day);
    }
    setVal(ws, r, 4, imported);
    if (locked !== undefined && locked !== null) {
      setVal(ws, r, 5, locked ? "ΝΑΙ" : "ΟΧΙ");
    } else if (cellVal(ws, r, 5) == null) {
      setVal(ws, r, 5, "ΟΧΙ");
    }
    if (note !== undefined && note !== null) setVal(ws, r, 6, note);
    setVal(ws, r, 7, now);
  }

  function normalizeCompare(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return v;
    const n = Number(v);
    if (!Number.isNaN(n) && String(v).trim() !== "") return n;
    return v;
  }

  function detectManualLocks(wb, month, catalog) {
    const sheetName = MONTH_SHEETS[month];
    const ws = wb.sheet(sheetName);
    if (!ws) throw new Error(`Λείπει φύλλο ${sheetName}`);
    const colmap = columnMapForMonth(catalog);
    const meta = readMeta(wb);
    let lockedN = 0;
    for (const [code, info] of Object.entries(colmap)) {
      const { col, day1, dayN } = info;
      for (let day = 1; day <= dayN - day1 + 1; day++) {
        const row = day1 + day - 1;
        const current = cellVal(ws, row, col);
        const k = metaKey(month, code, day);
        if (!meta[k]) continue;
        const imported = meta[k].imported;
        const curN = normalizeCompare(current);
        const impN = normalizeCompare(imported);
        if (curN !== impN && !(curN == null && impN == null)) {
          writeMetaRow(wb, month, code, day, imported, true, "χειροκίνητο");
          lockedN += 1;
        } else if (meta[k].locked) {
          lockedN += 1;
        }
      }
    }
    return lockedN;
  }

  function exportPeople(data) {
    const people = [];
    if (data && Array.isArray(data.employees)) {
      for (const emp of data.employees) {
        const days = {};
        for (const d of emp.days || []) {
          if (d && typeof d === "object" && !Array.isArray(d)) {
            let day = d.day != null ? d.day : d.d;
            if (day == null && d.dateKey) {
              day = parseInt(String(d.dateKey).split("-")[2], 10);
            }
            let hours = d.hours;
            if (hours == null && d.dayRate) hours = 1.0;
            if (hours == null && d.label) hours = parseHoursLabel(d.label);
            if (day != null && hours != null) days[parseInt(day, 10)] = Number(hours);
          } else if (Array.isArray(d) && d.length >= 2) {
            days[parseInt(d[0], 10)] = Number(d[1]);
          }
        }
        if (!Object.keys(days).length && emp.dayBreakdown) {
          Object.assign(days, parseDayBreakdown(emp.dayBreakdown));
        }
        people.push({
          id: String(emp.id || emp.empId || "").trim() || null,
          short: nfc(String(emp.short || "")),
          name: nfc(String(emp.name || "")),
          days,
          dayRates: parseInt(emp.dayRates || 0, 10) || 0,
          hours: emp.hours,
        });
      }
      return people;
    }

    for (const row of (data && data.rows) || []) {
      const eid =
        row["Κωδικός"] ||
        row["ΚΩΔΙΚΟΣ"] ||
        row.id ||
        row.empId ||
        row.Id ||
        "";
      const short = row["Όνομα"] || row.short || row["Σύντομο"] || "";
      const name = row["Πλήρες"] || row.name || row["Ονοματεπώνυμο"] || "";
      const breakdown =
        row["Ανά ημέρα"] || row.dayBreakdown || row["Ανά_ημέρα"] || "";
      people.push({
        id: String(eid).trim() || null,
        short: nfc(String(short)),
        name: nfc(String(name)),
        days: parseDayBreakdown(String(breakdown)),
        dayRates:
          parseInt(Number(row["Ημερομίσθια"] || row.dayRates || 0) || 0, 10) ||
          0,
        hours: row["Ώρες"] || row.hours,
      });
    }
    return people;
  }

  function matchPerson(person, catalog) {
    const active = catalog.filter((c) => c.active);
    if (person.id) {
      const pid = String(person.id).trim().toUpperCase();
      for (const c of active) {
        if (c.code.toUpperCase() === pid) return c;
      }
      for (const c of catalog) {
        if (c.code.toUpperCase() === pid) return c;
      }
    }
    const candidates = [];
    const pShort = normKey(person.short || "");
    const pName = normKey(person.name || "");
    for (const c of active) {
      const cShort = normKey(c.short);
      const cName = normKey(c.name);
      let score = 0;
      if (pShort && pShort === cShort) score = 100;
      else if (pName && pName === cName) score = 95;
      else if (pShort && (cName.includes(pShort) || pName.includes(cShort))) score = 70;
      else if (pName && pShort && cName.includes(pShort)) score = 60;
      if (score) candidates.push([score, c]);
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b[0] - a[0]);
    if (candidates.length > 1 && candidates[0][0] === candidates[1][0]) return null;
    return candidates[0][1];
  }

  function resolveMonth(data, filename) {
    if (data && data.month != null) {
      const m = parseInt(data.month, 10);
      if (m >= 1 && m <= 12) return m;
    }
    const ym = (data && (data.yearMonth || data.ym || data.month)) || "";
    if (typeof ym === "string" && /^\d{4}-\d{2}$/.test(ym)) {
      return parseInt(ym.split("-")[1], 10);
    }
    if (filename) {
      let m = String(filename).match(/(20\d{2})-(\d{2})/);
      if (m) return parseInt(m[2], 10);
      m = String(filename).match(/_(\d{2})_/);
      if (m) {
        const v = parseInt(m[1], 10);
        if (v >= 1 && v <= 12) return v;
      }
    }
    return null;
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { format: "csv", rows: [] };
    const delim = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delim).map((h) => nfc(h.replace(/^"|"$/g, "")));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map((c) => c.replace(/^"|"$/g, ""));
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] != null ? cols[idx] : "";
      });
      rows.push(row);
    }
    return { format: "csv", rows };
  }

  function parseExportText(text, filename) {
    const raw = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!raw) throw new Error("Κενό αρχείο / κείμενο εξαγωγής.");
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return { rows: data };
      return data;
    }
    const lower = (filename || "").toLowerCase();
    if (lower.endsWith(".csv") || raw.includes("Κωδικός") || raw.includes(";")) {
      return parseCsv(raw);
    }
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return { rows: data };
      return data;
    } catch (e) {
      return parseCsv(raw);
    }
  }

  function applyImport(wb, month, people, force) {
    ensureMetaSheet(wb);
    const catalog = loadCatalog(wb);
    const colmap = columnMapForMonth(catalog);
    const sheetName = MONTH_SHEETS[month];
    const ws = wb.sheet(sheetName);
    if (!ws) throw new Error(`Λείπει φύλλο μήνα: ${sheetName}`);

    if (!force) detectManualLocks(wb, month, catalog);
    const meta = readMeta(wb);

    const report = {
      month,
      sheetName,
      matched: [],
      unmatched: [],
      skipped_locked: [],
      written: 0,
      overflow_dept: [],
    };

    for (const person of people) {
      const cat = matchPerson(person, catalog);
      if (!cat) {
        report.unmatched.push({
          id: person.id,
          short: person.short,
          name: person.name,
        });
        continue;
      }
      const code = cat.code;
      if (!colmap[code]) {
        report.overflow_dept.push({
          code,
          dept: cat.dept,
          name: cat.name,
        });
        continue;
      }
      const { dept, col, day1, dayN } = colmap[code];
      report.matched.push({
        code,
        name: cat.name,
        dept,
        col: colLetter(col),
      });

      const days = person.days || {};
      for (const [dayStr, hours] of Object.entries(days)) {
        const day = parseInt(dayStr, 10);
        if (day < 1 || day > dayN - day1 + 1) continue;
        const row = day1 + day - 1;
        const value = roundHalfHour(Number(hours));
        if (DAY_RATE_DEPTS.has(dept) && value > 1) {
          // same as Python: leave as-is
        }
        const k = metaKey(month, code, day);
        const locked = !!(meta[k] && meta[k].locked);
        if (locked && !force) {
          report.skipped_locked.push({
            code,
            day,
            kept: cellVal(ws, row, col),
          });
          continue;
        }
        setVal(ws, row, col, value);
        writeMetaRow(wb, month, code, day, value, force ? false : null, null);
        report.written += 1;
      }
    }
    return report;
  }

  async function runImport({ xlsxBuffer, exportText, exportFilename, force }) {
    const data = parseExportText(exportText, exportFilename);
    const people = exportPeople(data);
    if (!people.length) throw new Error("Καμία γραμμή στην εξαγωγή.");
    if (people.every((p) => !p.days || !Object.keys(p.days).length)) {
      throw new Error(
        "Δεν υπάρχουν ώρες ανά ημέρα. Χρησιμοποίησε «JSON μισθοδ.» από το tablet."
      );
    }
    const month = resolveMonth(data, exportFilename);
    if (!month) {
      throw new Error("Δεν βρέθηκε μήνας στο JSON. Επίλεξε αρχείο με yearMonth.");
    }

    const XlsxPopulate = global.XlsxPopulate;
    if (!XlsxPopulate) throw new Error("Δεν φορτώθηκε η βιβλιοθήκη Excel.");

    const wb = await XlsxPopulate.fromDataAsync(xlsxBuffer);
    const report = applyImport(wb, month, people, !!force);
    const outBuf = await wb.outputAsync();
    const outName = `ΜΙΣΘΟΔΟΣΙΑ-2026-${String(month).padStart(2, "0")}-με-ώρες.xlsx`;
    return { report, outBuf, outName, month };
  }

  global.MisthodosiaImport = {
    runImport,
    parseExportText,
    exportPeople,
    resolveMonth,
    MONTH_SHEETS,
  };
})(typeof window !== "undefined" ? window : globalThis);
