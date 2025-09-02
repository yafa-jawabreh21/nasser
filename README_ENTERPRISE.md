# Harmah Fusion — Enterprise (No Docker) — v2

إصدار مؤسسي مدمج يشمل:
- Core + Vision + EVM + Procurement + IFRS15 + Academy.
- **PMO**: Portfolio, KPIs, Risk Register, Timeline.
- **Education**: Courses, Students, Enrollments, Attendance.
- **Seed Engine** لتوليد *آلاف الاستخدامات الوهمية* ببيانات مؤرخة 2022–2025.

## تشغيل محلي
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
./run_local.sh
```

## نشر — Google App Engine (Standard) (بدون Docker)
```bash
gcloud init
gcloud app create --region=us-central
gcloud app deploy appengine/app.yaml
```

## ملء البيانات الضخمة (وهمية)
1) شغّل الـAPI محليًا أو بعد النشر.
2) ولّد ملفات CSV:
```bash
python seeds/generate_seed.py
```
3) حمّلها في الذاكرة:
- كمسؤول (Bearer token)، استدعِ:
  - `POST /api/admin/seed/load`  (يحمل الملفات الكبيرة ويحتفظ بها في ذاكرة العملية)
  - `POST /api/admin/seed/clear` لمسحها.

> ملاحظة: هذه البنية **بدون قاعدة بيانات** لتبسيط النشر السريع. لو رغبت PostgreSQL، أضفها لاحقًا بسهولة.
