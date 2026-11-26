# Attendance Log

Εσωτερικό σύστημα παρουσιών προσωπικού για επιχειρήσεις εστίασης.

## Offline tablet PWAs (GitHub Pages)

- STORE 311 (με πόστα): https://papadonikolakisgiannis73-maker.github.io/Attendance-log/tablet-demo/
- Le Jardin (επίπεδη λίστα, χωρίς πόστα): https://papadonikolakisgiannis73-maker.github.io/Attendance-log/le-jardin/

## Μισθοδοσία — εισαγωγή ωρών

Από το tablet (Μήνας → **JSON μισθοδ.**) προς το `ΜΙΣΘΟΔΟΣΙΑ 2026.xlsx`:

```bash
cd payroll-import
pip install -r requirements.txt
python3 import_hours.py --xlsx "ΜΙΣΘΟΔΟΣΙΑ 2026.xlsx" --export parousiologio-month-YYYY-MM.json
```

Λεπτομέρειες, overrides και ασφαλής προσθήκη/αφαίρεση ατόμου: [`payroll-import/README.md`](payroll-import/README.md).

© 2025 Giannis Papadonikolakis All rights reserved.
