(function () {
  "use strict";

  const jsonFile = document.getElementById("json-file");
  const jsonPaste = document.getElementById("json-paste");
  const xlsxFile = document.getElementById("xlsx-file");
  const xlsxName = document.getElementById("xlsx-name");
  const forceEl = document.getElementById("force");
  const btnGo = document.getElementById("btn-go");
  const statusEl = document.getElementById("status");
  const reportEl = document.getElementById("report");

  let exportText = "";
  let exportFilename = "";
  let xlsxBuffer = null;
  let xlsxOrigName = "";

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function refreshReady() {
    const hasExport = !!(exportText && exportText.trim());
    const hasXlsx = !!xlsxBuffer;
    btnGo.disabled = !(hasExport && hasXlsx);
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Αποτυχία ανάγνωσης αρχείου."));
      reader.readAsText(file, "UTF-8");
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Αποτυχία ανάγνωσης Excel."));
      reader.readAsArrayBuffer(file);
    });
  }

  function downloadBuffer(buf, filename) {
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function formatReport(report) {
    const lines = [];
    lines.push(`Μήνας: ${report.month} · φύλλο ${report.sheetName}`);
    lines.push(`Γράφτηκαν κελιά: ${report.written}`);
    lines.push(`Αντιστοιχίστηκαν: ${report.matched.length}`);
    for (const m of report.matched.slice(0, 25)) {
      lines.push(`  ${m.code} ${m.name} → ${m.dept} στήλη ${m.col}`);
    }
    if (report.matched.length > 25) {
      lines.push(`  … +${report.matched.length - 25}`);
    }
    if (report.unmatched.length) {
      lines.push("ΔΕΝ βρέθηκαν στον ΚΑΤΑΛΟΓΟ:");
      for (const u of report.unmatched) {
        lines.push(`  id=${u.id || "—"} ${u.short || ""} ${u.name || ""}`);
      }
    }
    if (report.skipped_locked.length) {
      lines.push(
        `Κλειδωμένα (χειροκίνητα) που κρατήθηκαν: ${report.skipped_locked.length}`
      );
    }
    if (report.overflow_dept.length) {
      lines.push("Ενεργοί χωρίς θέση στο τμήμα:");
      for (const o of report.overflow_dept) {
        lines.push(`  ${o.code} ${o.name} (${o.dept})`);
      }
    }
    return lines.join("\n");
  }

  jsonFile.addEventListener("change", async () => {
    const file = jsonFile.files && jsonFile.files[0];
    if (!file) return;
    try {
      exportText = await readFileAsText(file);
      exportFilename = file.name;
      jsonPaste.value = "";
      setStatus(`JSON: ${file.name}`, "ok");
      reportEl.hidden = true;
    } catch (e) {
      exportText = "";
      exportFilename = "";
      setStatus(e.message || "Σφάλμα JSON", "err");
    }
    refreshReady();
  });

  jsonPaste.addEventListener("input", () => {
    const t = jsonPaste.value.trim();
    if (t) {
      exportText = t;
      exportFilename = "paste.json";
      jsonFile.value = "";
      setStatus("JSON από επικόλληση", "ok");
      reportEl.hidden = true;
    } else if (!(jsonFile.files && jsonFile.files[0])) {
      exportText = "";
      exportFilename = "";
    }
    refreshReady();
  });

  xlsxFile.addEventListener("change", async () => {
    const file = xlsxFile.files && xlsxFile.files[0];
    if (!file) {
      xlsxBuffer = null;
      xlsxOrigName = "";
      xlsxName.hidden = true;
      refreshReady();
      return;
    }
    try {
      xlsxBuffer = await readFileAsArrayBuffer(file);
      xlsxOrigName = file.name;
      xlsxName.hidden = false;
      xlsxName.textContent = "Έτοιμο: " + file.name;
      setStatus("Excel έτοιμο", "ok");
      reportEl.hidden = true;
    } catch (e) {
      xlsxBuffer = null;
      xlsxOrigName = "";
      xlsxName.hidden = true;
      setStatus(e.message || "Σφάλμα Excel", "err");
    }
    refreshReady();
  });

  btnGo.addEventListener("click", async () => {
    if (btnGo.disabled) return;
    btnGo.disabled = true;
    setStatus("Επεξεργασία… περίμενε λίγο", "");
    reportEl.hidden = true;
    try {
      const result = await MisthodosiaImport.runImport({
        xlsxBuffer,
        exportText,
        exportFilename,
        force: forceEl.checked,
      });
      const outName = xlsxOrigName
        ? xlsxOrigName.replace(/\.xlsx$/i, "") + "-με-ώρες.xlsx"
        : result.outName;
      downloadBuffer(result.outBuf, outName);
      setStatus(
        `Έτοιμο — κατέβηκε το αρχείο (${result.report.written} κελιά).`,
        "ok"
      );
      reportEl.hidden = false;
      reportEl.textContent = formatReport(result.report);
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Κάτι πήγε στραβά", "err");
    } finally {
      refreshReady();
    }
  });

  refreshReady();
})();
