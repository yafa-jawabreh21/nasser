
# Generate large fake usage CSVs (2022-2025) for PMO + Education modules
import os, random, csv, datetime as dt, string

BASE = os.path.join(os.path.dirname(__file__), "..", "backend", "data")
os.makedirs(BASE, exist_ok=True)

random.seed(42)

def rand_name():
    first = ["Ali","Omar","Hassan","Youssef","Nasser","Khalid","Fahad","Rami","Tariq","Majed","Reem","Lama","Huda","Aisha","Mona","Noor"]
    last = ["AlHarbi","AlQahtani","AlMutairi","Jawabreh","AlGhamdi","AlShahrani","AlOtaibi","AlEnazi","AlZahrani","AlDosari"]
    return random.choice(first) + " " + random.choice(last)

def rand_course():
    subj = ["Math","Physics","Chemistry","Biology","Arabic","English","IT","Electronics","HVAC","Project Mgmt","Finance","Accounting"]
    lvl = ["101","201","301","401","Lab","Seminar"]
    return random.choice(subj) + " " + random.choice(lvl)

# --- Education ---
N_STUDENTS = 2000
N_COURSES = 120
N_ENROLL = 20000
N_ATT = 80000

students = [{"student_id": f"S{100000+i}", "name": rand_name(), "year": random.randint(1,4)} for i in range(N_STUDENTS)]
courses = [{"course_id": f"C{2000+i}", "title": rand_course(), "credits": random.choice([2,3,4])} for i in range(N_COURSES)]

def rand_date(start_year=2022, end_year=2025):
    start = dt.date(start_year,1,1)
    end = dt.date(end_year,9,1)
    delta = (end - start).days
    d = start + dt.timedelta(days=random.randint(0, delta))
    return d.isoformat()

enrollments = []
for i in range(N_ENROLL):
    st = random.choice(students)["student_id"]
    co = random.choice(courses)["course_id"]
    enrollments.append({"enrollment_id": f"E{i+1}", "student_id": st, "course_id": co, "enrolled_on": rand_date()})

attendance = []
for i in range(N_ATT):
    st = random.choice(students)["student_id"]
    co = random.choice(courses)["course_id"]
    attendance.append({"student_id": st, "course_id": co, "date": rand_date(), "present": random.choice([0,1])})

# --- PMO ---
N_PROJECTS = 120
projects = []
for i in range(N_PROJECTS):
    start = dt.date(2022,1,1) + dt.timedelta(days=random.randint(0, 700))
    duration = random.randint(120, 800)
    end = start + dt.timedelta(days=duration)
    projects.append({"id": i+1, "name": f"Project-{i+1}", "owner": random.choice(["Public","Private","PPP"]), "budget": round(random.uniform(1e6, 3e9),2), "start_date": start.isoformat(), "end_date": end.isoformat()})

# Tasks timeline (50k)
tasks = []
task_id = 1
for p in projects:
    n = random.randint(120, 520)
    for _ in range(n):
        sd = dt.date.fromisoformat(p["start_date"]) + dt.timedelta(days=random.randint(0, 300))
        ed = sd + dt.timedelta(days=random.randint(5, 120))
        tasks.append({"task_id": task_id, "project_id": p["id"], "title": f"T{task_id}", "start": sd.isoformat(), "end": ed.isoformat(), "status": random.choice(["Open","In-Progress","Done","Blocked"])})
        task_id += 1

# Risks (5k) + Issues (4k)
risks = [{"risk_id": i+1, "project_id": random.choice(projects)["id"], "title": f"Risk-{i+1}", "severity": random.choice(["L","M","H","C"]), "prob": random.randint(1,5)} for i in range(5000)]
issues = [{"issue_id": i+1, "project_id": random.choice(projects)["id"], "title": f"Issue-{i+1}", "severity": random.choice(["L","M","H"]), "open_date": rand_date()} for i in range(4000)]

kpis = [{"name":"SPI","value": round(random.uniform(0.7,1.1),2), "target": 1.0},
        {"name":"CPI","value": round(random.uniform(0.7,1.1),2), "target": 1.0},
        {"name":"OnTime%","value": random.randint(60,95), "target": 90}]

def write_csv(name, rows, fieldnames):
    path = os.path.join(BASE, f"{name}.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows: w.writerow(r)

write_csv("students", students, ["student_id","name","year"])
write_csv("courses", courses, ["course_id","title","credits"])
write_csv("enrollments", enrollments, ["enrollment_id","student_id","course_id","enrolled_on"])
write_csv("attendance", attendance, ["student_id","course_id","date","present"])

write_csv("projects", projects, ["id","name","owner","budget","start_date","end_date"])
write_csv("tasks", tasks, ["task_id","project_id","title","start","end","status"])
write_csv("risks", risks, ["risk_id","project_id","title","severity","prob"])
write_csv("issues", issues, ["issue_id","project_id","title","severity","open_date"])
write_csv("kpis", kpis, ["name","value","target"])

print("Seed CSVs generated at:", BASE)
