#!/usr/bin/env python3
"""
Εισαγωγή ωρών από εξαγωγή tablet (CSV/JSON) στο ΜΙΣΘΟΔΟΣΙΑ 2026.xlsx.

Κλειδί αντιστοίχισης: Κωδικός εργαζομένου (E001…), όχι θέση στήλης.
Οι χειροκίνητες αλλαγές διατηρούνται από προεπιλογή (keep-manual).

Παραδείγματα:
  python import_hours.py --xlsx ΜΙΣΘΟΔΟΣΙΑ.xlsx --export parousiologio-month-2026-11.json
  python import_hours.py --xlsx ΜΙΣΘΟΔΟΣΙΑ.xlsx --export month.csv --force
  python import_hours.py --xlsx ΜΙΣΘΟΔΟΣΙΑ.xlsx --remap-snapshot
  python import_hours.py --xlsx ΜΙΣΘΟΔΟΣΙΑ.xlsx --remap-apply
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sys
import unicodedata
from copy import copy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from openpyxl import load_workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    print("Χρειάζεται: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


# --- Δομή φύλλου μήνα (σταθερή σε όλα τα 2026_xx_*) ---
# (τμήμα, γραμμή κωδικών, πρώτη ημέρα, τελευταία ημέρα, πρώτη στήλη, τελευταία στήλη)
DEPT_BLOCKS = [
    ("SERVICE", 15, 18, 48, 2, 25),
    ("ΜΠΟΥΦΕ-ΜΠΑΡ", 53, 56, 86, 2, 10),
    ("ΥΠΕΥΘΥΝΟΙ", 91, 94, 124, 2, 6),
    ("DJ", 129, 132, 162, 2, 6),
    ("ΚΟΥΖΙΝΑ", 167, 170, 200, 2, 14),
    ("ΥΠΟΔΟΧΗ", 205, 208, 238, 2, 20),
]

MONTH_SHEETS = {
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
}

META_SHEET = "_IMPORT_META"
SNAP_SHEET = "_ΩΡΕΣ_SNAPSHOT"
CATALOG_START = 6
DAY_RATE_DEPTS = {"ΥΠΕΥΘΥΝΟΙ", "DJ"}  # συνήθως 1/ημέρα στο workbook


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "").strip()


def norm_key(s: str) -> str:
    s = nfc(s).upper()
    s = s.replace("Ά", "Α").replace("Έ", "Ε").replace("Ή", "Η")
    s = s.replace("Ί", "Ι").replace("Ό", "Ο").replace("Ύ", "Υ").replace("Ώ", "Ω")
    s = s.replace("Ϊ", "Ι").replace("Ϋ", "Υ")
    s = re.sub(r"\s+", " ", s)
    return s


def parse_hours_label(label: str) -> float | None:
    """Parse '9 ώρες' / '7:30 ώρες' / '1 ημέρα' / bare number."""
    if label is None:
        return None
    s = nfc(str(label)).lower()
    if not s or s in {"—", "-", "n/a"}:
        return None
    if "ημέρ" in s or "ημερ" in s:
        return 1.0
    m = re.search(r"(\d+)[:\.](\d{1,2})", s)
    if m:
        h = int(m.group(1))
        mins = int(m.group(2))
        if mins < 60:
            return round(h + mins / 60.0, 2)
    m = re.search(r"(\d+(?:[.,]\d+)?)", s)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def parse_day_breakdown(text: str) -> dict[int, float]:
    """'1/11 9 ώρες, 5/11 7:30 ώρες' → {1: 9.0, 5: 7.5}"""
    out: dict[int, float] = {}
    if not text:
        return out
    parts = re.split(r"\s*,\s*", nfc(text))
    for part in parts:
        m = re.match(r"(\d{1,2})/(\d{1,2})\s+(.+)", part.strip())
        if not m:
            continue
        day = int(m.group(1))
        hours = parse_hours_label(m.group(3))
        if hours is not None:
            out[day] = hours
    return out


def load_catalog(wb) -> list[dict[str, Any]]:
    ws = wb["ΚΑΤΑΛΟΓΟΣ"]
    rows = []
    for r in range(CATALOG_START, ws.max_row + 1):
        code = ws.cell(r, 1).value
        if not code:
            continue
        code = str(code).strip()
        name = nfc(str(ws.cell(r, 2).value or ""))
        dept = nfc(str(ws.cell(r, 3).value or ""))
        short = nfc(str(ws.cell(r, 4).value or ""))
        active = nfc(str(ws.cell(r, 7).value or "")).upper()
        rows.append(
            {
                "row": r,
                "code": code,
                "name": name,
                "dept": dept,
                "short": short,
                "active": active == "ΝΑΙ",
            }
        )
    return rows


def active_by_dept(catalog: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Ίδια λογική με στήλη H του ΚΑΤΑΛΟΓΟΥ: σειρά εμφάνισης ενεργών ανά τμήμα."""
    by: dict[str, list[dict[str, Any]]] = {}
    for row in catalog:
        if not row["active"]:
            continue
        by.setdefault(row["dept"], []).append(row)
    return by


def column_map_for_month(catalog: list[dict[str, Any]]) -> dict[str, tuple[str, int, int, int]]:
    """
    code → (dept, col, day_row_start, day_row_end)
    Στήλη = θέση ενεργού στο τμήμα (1→B, 2→C, …).
    """
    by = active_by_dept(catalog)
    mapping: dict[str, tuple[str, int, int, int]] = {}
    for dept, code_row, day1, day_n, col_first, col_last in DEPT_BLOCKS:
        people = by.get(dept, [])
        max_slots = col_last - col_first + 1
        for i, person in enumerate(people[:max_slots]):
            col = col_first + i
            mapping[person["code"]] = (dept, col, day1, day_n)
    return mapping


def ensure_meta_sheet(wb) -> None:
    if META_SHEET in wb.sheetnames:
        return
    ws = wb.create_sheet(META_SHEET)
    headers = [
        "Μήνας",
        "Κωδικός",
        "Ημέρα",
        "Τελευταία_εισαγωγή",
        "Κλειδωμένο",
        "Σημείωση",
        "Ενημερώθηκε",
    ]
    for i, h in enumerate(headers, 1):
        cell = ws.cell(1, i, h)
        cell.font = Font(bold=True)
    ws.sheet_state = "hidden"


def meta_key(month: int, code: str, day: int) -> str:
    return f"{month}|{code}|{day}"


def read_meta(wb) -> dict[str, dict[str, Any]]:
    ensure_meta_sheet(wb)
    ws = wb[META_SHEET]
    out: dict[str, dict[str, Any]] = {}
    for r in range(2, ws.max_row + 1):
        month = ws.cell(r, 1).value
        code = ws.cell(r, 2).value
        day = ws.cell(r, 3).value
        if month is None or code is None or day is None:
            continue
        try:
            month_i = int(month)
            day_i = int(day)
        except (TypeError, ValueError):
            continue
        out[meta_key(month_i, str(code).strip(), day_i)] = {
            "row": r,
            "imported": ws.cell(r, 4).value,
            "locked": nfc(str(ws.cell(r, 5).value or "")).upper() in {"ΝΑΙ", "NAI", "YES", "Y", "1", "TRUE"},
            "note": ws.cell(r, 6).value,
        }
    return out


def write_meta_row(
    wb,
    month: int,
    code: str,
    day: int,
    imported: Any,
    locked: bool | None = None,
    note: str | None = None,
) -> None:
    ensure_meta_sheet(wb)
    ws = wb[META_SHEET]
    meta = read_meta(wb)
    k = meta_key(month, code, day)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if k in meta:
        r = meta[k]["row"]
    else:
        r = ws.max_row + 1
        if ws.cell(r, 1).value is not None:
            r = ws.max_row + 1
        ws.cell(r, 1, month)
        ws.cell(r, 2, code)
        ws.cell(r, 3, day)
    ws.cell(r, 4, imported)
    if locked is not None:
        ws.cell(r, 5, "ΝΑΙ" if locked else "ΟΧΙ")
    elif ws.cell(r, 5).value is None:
        ws.cell(r, 5, "ΟΧΙ")
    if note is not None:
        ws.cell(r, 6, note)
    ws.cell(r, 7, now)


def detect_manual_locks(wb, month: int, catalog: list[dict[str, Any]]) -> int:
    """
    Σύγκριση τρέχουσας τιμής κελιού με τελευταία εισαγωγή.
    Αν διαφέρει → Κλειδωμένο=ΝΑΙ (χειροκίνητο override).
    """
    sheet_name = MONTH_SHEETS[month]
    if sheet_name not in wb.sheetnames:
        raise SystemExit(f"Λείπει φύλλο {sheet_name}")
    ws = wb[sheet_name]
    colmap = column_map_for_month(catalog)
    meta = read_meta(wb)
    locked_n = 0
    for code, (dept, col, day1, day_n) in colmap.items():
        for day in range(1, day_n - day1 + 2):
            row = day1 + day - 1
            current = ws.cell(row, col).value
            k = meta_key(month, code, day)
            if k not in meta:
                continue
            imported = meta[k]["imported"]
            # normalize compare
            cur_n = None if current in (None, "") else float(current) if isinstance(current, (int, float)) else current
            imp_n = None if imported in (None, "") else float(imported) if isinstance(imported, (int, float)) else imported
            if cur_n != imp_n and not (cur_n is None and imp_n is None):
                write_meta_row(wb, month, code, day, imported, locked=True, note="χειροκίνητο")
                locked_n += 1
            elif meta[k]["locked"]:
                locked_n += 1
    return locked_n


def resolve_month_from_export(data: dict[str, Any], explicit: int | None) -> int:
    if explicit:
        return explicit
    ym = data.get("yearMonth") or data.get("ym") or data.get("month")
    if isinstance(ym, str) and re.match(r"^\d{4}-\d{2}$", ym):
        return int(ym.split("-")[1])
    if isinstance(ym, int) and 1 <= ym <= 12:
        return ym
    # from filename hints handled by caller
    raise SystemExit("Δεν βρέθηκε μήνας — δώσε --month 1..12")


def load_export(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
        if isinstance(data, list):
            return {"rows": data}
        return data

    # CSV (; or ,)
    sample = text[:2000]
    dialect = csv.Sniffer().sniff(sample, delimiters=";,\t")
    reader = csv.DictReader(text.splitlines(), dialect=dialect)
    rows = []
    for raw in reader:
        # normalize headers
        row = {nfc(k): v for k, v in raw.items() if k}
        rows.append(row)
    return {"format": "csv", "rows": rows}


def export_people(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Κανονικοποίηση γραμμών εξαγωγής σε {id, short, name, days: {day: hours}}."""
    people: list[dict[str, Any]] = []

    # Structured month JSON
    if "employees" in data:
        for emp in data["employees"]:
            days: dict[int, float] = {}
            for d in emp.get("days") or []:
                if isinstance(d, dict):
                    day = d.get("day") or d.get("d")
                    if day is None and d.get("dateKey"):
                        day = int(str(d["dateKey"]).split("-")[2])
                    hours = d.get("hours")
                    if hours is None and d.get("dayRate"):
                        hours = 1.0
                    if hours is None and d.get("label"):
                        hours = parse_hours_label(d["label"])
                    if day is not None and hours is not None:
                        days[int(day)] = float(hours)
                elif isinstance(d, (list, tuple)) and len(d) >= 2:
                    days[int(d[0])] = float(d[1])
            # also accept dayBreakdown string
            if not days and emp.get("dayBreakdown"):
                days = parse_day_breakdown(emp["dayBreakdown"])
            people.append(
                {
                    "id": str(emp.get("id") or emp.get("empId") or "").strip() or None,
                    "short": nfc(str(emp.get("short") or "")),
                    "name": nfc(str(emp.get("name") or "")),
                    "days": days,
                    "dayRates": int(emp.get("dayRates") or 0),
                    "hours": emp.get("hours"),
                }
            )
        return people

    # CSV / flat rows
    for row in data.get("rows") or []:
        # try common header names
        eid = (
            row.get("Κωδικός")
            or row.get("ΚΩΔΙΚΟΣ")
            or row.get("id")
            or row.get("empId")
            or row.get("Id")
            or ""
        )
        short = row.get("Όνομα") or row.get("short") or row.get("Σύντομο") or ""
        name = row.get("Πλήρες") or row.get("name") or row.get("Ονοματεπώνυμο") or ""
        breakdown = row.get("Ανά ημέρα") or row.get("dayBreakdown") or row.get("Ανά_ημέρα") or ""
        days = parse_day_breakdown(str(breakdown))
        # If only totals and no breakdown, cannot fill day grid
        people.append(
            {
                "id": str(eid).strip() or None,
                "short": nfc(str(short)),
                "name": nfc(str(name)),
                "days": days,
                "dayRates": int(float(row.get("Ημερομίσθια") or row.get("dayRates") or 0) or 0),
                "hours": row.get("Ώρες") or row.get("hours"),
            }
        )
    return people


def match_person(
    person: dict[str, Any], catalog: list[dict[str, Any]]
) -> dict[str, Any] | None:
    active = [c for c in catalog if c["active"]]
    if person.get("id"):
        pid = str(person["id"]).strip().upper()
        for c in active:
            if c["code"].upper() == pid:
                return c
        # inactive fallback
        for c in catalog:
            if c["code"].upper() == pid:
                return c

    # name / short match
    candidates = []
    p_short = norm_key(person.get("short") or "")
    p_name = norm_key(person.get("name") or "")
    for c in active:
        c_short = norm_key(c["short"])
        c_name = norm_key(c["name"])
        score = 0
        if p_short and p_short == c_short:
            score = 100
        elif p_name and p_name == c_name:
            score = 95
        elif p_short and (p_short in c_name or c_short in p_name):
            score = 70
        elif p_name and (p_short and p_short in c_name):
            score = 60
        if score:
            candidates.append((score, c))
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[0])
    # ambiguous?
    if len(candidates) > 1 and candidates[0][0] == candidates[1][0]:
        return None
    return candidates[0][1]


def round_half_hour(h: float) -> float:
    """Workbook dropdown: 0, 0.5, … 13."""
    if h <= 0:
        return 0.0
    stepped = round(h * 2) / 2.0
    return min(13.0, max(0.0, stepped))


def apply_import(
    wb,
    month: int,
    people: list[dict[str, Any]],
    *,
    force: bool,
    dry_run: bool,
) -> dict[str, Any]:
    catalog = load_catalog(wb)
    colmap = column_map_for_month(catalog)
    sheet_name = MONTH_SHEETS[month]
    ws = wb[sheet_name]

    if not force and not dry_run:
        detect_manual_locks(wb, month, catalog)

    meta = read_meta(wb)
    report = {
        "matched": [],
        "unmatched": [],
        "skipped_locked": [],
        "written": 0,
        "cleared": 0,
        "overflow_dept": [],
    }

    # Active codes that appear in export — for optional clear of other days? No: only write provided days.

    for person in people:
        cat = match_person(person, catalog)
        if not cat:
            report["unmatched"].append(
                {"id": person.get("id"), "short": person.get("short"), "name": person.get("name")}
            )
            continue
        code = cat["code"]
        if code not in colmap:
            report["overflow_dept"].append(
                {"code": code, "dept": cat["dept"], "name": cat["name"]}
            )
            continue
        dept, col, day1, day_n = colmap[code]
        report["matched"].append({"code": code, "name": cat["name"], "dept": dept, "col": get_column_letter(col)})

        days = person.get("days") or {}
        # Day-rate staff: if export only has dayRates count without breakdown, skip day fill
        for day, hours in days.items():
            if day < 1 or day > (day_n - day1 + 1):
                continue
            row = day1 + day - 1
            value = round_half_hour(float(hours))
            # ΥΠΕΥΘΥΝΟΙ/DJ often expect 1 per day when dayRate
            if dept in DAY_RATE_DEPTS and value > 1 and abs(value - round(value)) < 1e-6:
                # keep hours if they switched to hourly; else if value looks like hours>1 leave as-is
                pass

            k = meta_key(month, code, day)
            locked = meta.get(k, {}).get("locked", False)
            if locked and not force:
                report["skipped_locked"].append({"code": code, "day": day, "kept": ws.cell(row, col).value})
                continue

            if dry_run:
                report["written"] += 1
                continue

            ws.cell(row, col, value)
            write_meta_row(wb, month, code, day, value, locked=False if force else None)
            report["written"] += 1

    return report


def snapshot_hours(wb, month: int | None = None) -> int:
    """Αποθήκευση όλων των ωρών με κλειδί κωδικού (πριν αλλαγή ΚΑΤΑΛΟΓΟΥ)."""
    if SNAP_SHEET in wb.sheetnames:
        del wb[SNAP_SHEET]
    ws = wb.create_sheet(SNAP_SHEET)
    ws.append(["Μήνας", "Κωδικός", "Ημέρα", "Ώρες", "Τμήμα", "Στήλη"])
    catalog = load_catalog(wb)
    months = [month] if month else list(MONTH_SHEETS.keys())
    n = 0
    for m in months:
        sheet_name = MONTH_SHEETS[m]
        if sheet_name not in wb.sheetnames:
            continue
        mws = wb[sheet_name]
        colmap = column_map_for_month(catalog)
        for code, (dept, col, day1, day_n) in colmap.items():
            for day in range(1, day_n - day1 + 2):
                row = day1 + day - 1
                val = mws.cell(row, col).value
                if val is None or val == "":
                    continue
                ws.append([m, code, day, val, dept, get_column_letter(col)])
                n += 1
    ws.sheet_state = "hidden"
    return n


def apply_snapshot(wb, month: int | None = None) -> dict[str, int]:
    """Επαναφορά ωρών από snapshot στις τρέχουσες στήλες ανά κωδικό."""
    if SNAP_SHEET not in wb.sheetnames:
        raise SystemExit("Δεν υπάρχει _ΩΡΕΣ_SNAPSHOT — τρέξε πρώτα --remap-snapshot")
    sws = wb[SNAP_SHEET]
    catalog = load_catalog(wb)
    colmap = column_map_for_month(catalog)
    restored = 0
    missing = 0
    # Clear target month day cells for codes we will restore? Only overwrite snapshot cells.
    for r in range(2, sws.max_row + 1):
        m = sws.cell(r, 1).value
        code = str(sws.cell(r, 2).value or "").strip()
        day = sws.cell(r, 3).value
        val = sws.cell(r, 4).value
        if m is None or not code or day is None:
            continue
        m = int(m)
        day = int(day)
        if month and m != month:
            continue
        if code not in colmap:
            missing += 1
            continue
        dept, col, day1, day_n = colmap[code]
        if day < 1 or day > (day_n - day1 + 1):
            continue
        ws = wb[MONTH_SHEETS[m]]
        ws.cell(day1 + day - 1, col, val)
        write_meta_row(wb, m, code, day, val)
        restored += 1
    return {"restored": restored, "missing_code": missing}


def guess_month_from_path(path: Path) -> int | None:
    m = re.search(r"(20\d{2})-(\d{2})", path.name)
    if m:
        return int(m.group(2))
    m = re.search(r"_(\d{2})_", path.name)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 12:
            return val
    return None


def print_report(report: dict[str, Any]) -> None:
    print(f"Γράφτηκαν κελιά: {report['written']}")
    print(f"Αντιστοιχίστηκαν: {len(report['matched'])}")
    for m in report["matched"][:20]:
        print(f"  {m['code']} {m['name']} → {m['dept']} στήλη {m['col']}")
    if len(report["matched"]) > 20:
        print(f"  … +{len(report['matched']) - 20}")
    if report["unmatched"]:
        print("ΔΕΝ βρέθηκαν στον ΚΑΤΑΛΟΓΟ:")
        for u in report["unmatched"]:
            print(f"  id={u.get('id')} short={u.get('short')} name={u.get('name')}")
    if report["skipped_locked"]:
        print(f"Κλειδωμένα (χειροκίνητα) που κρατήθηκαν: {len(report['skipped_locked'])}")
    if report["overflow_dept"]:
        print("Ενεργοί χωρίς θέση στο τμήμα (γέμισαν οι στήλες):")
        for o in report["overflow_dept"]:
            print(f"  {o['code']} {o['name']} ({o['dept']})")


def prepare_workbook(src: Path, dest: Path) -> None:
    shutil.copy2(src, dest)
    wb = load_workbook(dest)
    ensure_meta_sheet(wb)
    # Add short note on ΟΔΗΓΙΕΣ
    if "ΟΔΗΓΙΕΣ" in wb.sheetnames:
        ws = wb["ΟΔΗΓΙΕΣ"]
        # find first empty-ish row near end
        note_row = ws.max_row + 2
        ws.cell(
            note_row,
            1,
            "13. ΕΙΣΑΓΩΓΗ ΑΠΟ TABLET: χρησιμοποίησε το payroll-import/import_hours.py "
            "(ώρες ανά κωδικό). Χειροκίνητες αλλαγές → μην τις σβήνει το re-import "
            "(προεπιλογή keep-manual). Πριν προσθέσεις/βγάλεις άτομο από ΚΑΤΑΛΟΓΟ: "
            "--remap-snapshot και μετά --remap-apply.",
        )
    wb.save(dest)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Εισαγωγή ωρών tablet → ΜΙΣΘΟΔΟΣΙΑ xlsx")
    p.add_argument("--xlsx", required=True, help="Διαδρομή ΜΙΣΘΟΔΟΣΙΑ .xlsx (θα ενημερωθεί)")
    p.add_argument("--export", help="CSV ή JSON εξαγωγή μήνα από tablet")
    p.add_argument("--month", type=int, choices=range(1, 13), help="Μήνας 1–12")
    p.add_argument(
        "--force",
        action="store_true",
        help="Ξαναγράφει και τα κλειδωμένα/χειροκίνητα κελιά",
    )
    p.add_argument("--dry-run", action="store_true", help="Χωρίς αποθήκευση")
    p.add_argument(
        "--out",
        help="Αποθήκευση σε νέο αρχείο (αλλιώς ενημερώνει το --xlsx)",
    )
    p.add_argument(
        "--remap-snapshot",
        action="store_true",
        help="Αποθήκευσε ώρες ανά κωδικό (πριν αλλαγή ΚΑΤΑΛΟΓΟΥ)",
    )
    p.add_argument(
        "--remap-apply",
        action="store_true",
        help="Επαναφορά ωρών από snapshot στις νέες στήλες",
    )
    p.add_argument(
        "--prepare",
        action="store_true",
        help="Αντίγραφο με φύλλο _IMPORT_META (χρειάζεται --out)",
    )
    p.add_argument(
        "--mark-locks",
        action="store_true",
        help="Μόνο σήμανση χειροκίνητων overrides για --month",
    )
    args = p.parse_args(argv)

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        print(f"Δεν βρέθηκε: {xlsx}", file=sys.stderr)
        return 1

    if args.prepare:
        if not args.out:
            print("--prepare χρειάζεται --out", file=sys.stderr)
            return 1
        prepare_workbook(xlsx, Path(args.out))
        print(f"Έτοιμο: {args.out}")
        return 0

    wb = load_workbook(xlsx)
    ensure_meta_sheet(wb)

    if args.remap_snapshot:
        n = snapshot_hours(wb, args.month)
        if not args.dry_run:
            out = Path(args.out) if args.out else xlsx
            wb.save(out)
        print(f"Snapshot: {n} κελιά → φύλλο {SNAP_SHEET}")
        return 0

    if args.remap_apply:
        stats = apply_snapshot(wb, args.month)
        if not args.dry_run:
            out = Path(args.out) if args.out else xlsx
            wb.save(out)
        print(f"Remap: αποκαταστάθηκαν {stats['restored']}, χωρίς θέση {stats['missing_code']}")
        return 0

    if args.mark_locks:
        if not args.month:
            print("--mark-locks χρειάζεται --month", file=sys.stderr)
            return 1
        n = detect_manual_locks(wb, args.month, load_catalog(wb))
        if not args.dry_run:
            out = Path(args.out) if args.out else xlsx
            wb.save(out)
        print(f"Κλειδωμένα κελιά: {n}")
        return 0

    if not args.export:
        print("Δώσε --export (CSV/JSON) ή --remap-snapshot / --remap-apply / --prepare", file=sys.stderr)
        return 1

    export_path = Path(args.export)
    data = load_export(export_path)
    month = args.month or data.get("month")
    if not month:
        ym = data.get("yearMonth") or data.get("ym")
        if isinstance(ym, str) and re.match(r"^\d{4}-\d{2}$", ym):
            month = int(ym.split("-")[1])
        else:
            month = guess_month_from_path(export_path)
    if not month:
        print("Δώσε --month", file=sys.stderr)
        return 1
    month = int(month)

    people = export_people(data)
    if not people:
        print("Καμία γραμμή στην εξαγωγή", file=sys.stderr)
        return 1

    # Warn if no day breakdown
    if all(not p.get("days") for p in people):
        print(
            "ΠΡΟΣΟΧΗ: δεν υπάρχουν ώρες ανά ημέρα στην εξαγωγή. "
            "Χρησιμοποίησε JSON μήνα από το tablet (κουμπί Excel/JSON με Ανά ημέρα) "
            "ή νεότερη εξαγωγή με στήλη «Ανά ημέρα».",
            file=sys.stderr,
        )
        return 1

    report = apply_import(wb, month, people, force=args.force, dry_run=args.dry_run)
    print_report(report)

    if not args.dry_run:
        out = Path(args.out) if args.out else xlsx
        wb.save(out)
        print(f"Αποθηκεύτηκε: {out}")
    else:
        print("(dry-run — δεν αποθηκεύτηκε)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
