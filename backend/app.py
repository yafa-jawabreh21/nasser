
import os, math, random, csv
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from jose import jwt, JWTError
from pydantic import BaseModel, Field, constr
import pandas as pd

APP_NAME = os.getenv("APP_NAME", "Harmah Fusion Enterprise")
SECRET_KEY = os.getenv("SECRET_KEY", "change_me_to_a_long_random_string")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "240"))
ALLOWED = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

app = FastAPI(title=APP_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED if ALLOWED != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-XSS-Protection"] = "1; mode=block"
    resp.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return resp

# ===== Auth =====
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_at: int

class LoginIn(BaseModel):
    email: constr(min_length=5, max_length=200)
    password: constr(min_length=6, max_length=128)

class User(BaseModel):
    email: str
    full_name: str
    role: str

DEMO_USER = {
    "email": "admin@superior-overseas.com",
    "full_name": "Nasser Jawabreh",
    "role": "admin",
    "password": "Admin123!"
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALG)
    return encoded_jwt, int(expire.timestamp())

def get_current_user(request: Request) -> User:
    auth = request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])
        email: str = payload.get("sub")
        full_name: str = payload.get("name", "")
        role: str = payload.get("role", "user")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return User(email=email, full_name=full_name, role=role)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(*roles):
    def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dependency

@app.get("/api/healthz")
def healthz():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.post("/api/auth/login", response_model=Token)
def login(body: LoginIn):
    if body.email.strip().lower() == DEMO_USER["email"] and body.password == DEMO_USER["password"]:
        token, exp = create_access_token({"sub": DEMO_USER["email"], "name": DEMO_USER["full_name"], "role": DEMO_USER["role"]})
        return {"access_token": token, "token_type": "bearer", "expires_at": exp}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# ===== Routers =====
core = APIRouter(prefix="/api/core", tags=["core"])
evm = APIRouter(prefix="/api/evm", tags=["evm"])
proc = APIRouter(prefix="/api/procurement", tags=["procurement"])
vision = APIRouter(prefix="/api/vision", tags=["vision"])
ifrs = APIRouter(prefix="/api/ifrs15", tags=["ifrs15"])
acad = APIRouter(prefix="/api/academy", tags=["academy"])
rep = APIRouter(prefix="/api/reports", tags=["reports"])
pmo = APIRouter(prefix="/api/pmo", tags=["pmo"])
edu = APIRouter(prefix="/api/edu", tags=["education"])
admin = APIRouter(prefix="/api/admin", tags=["admin"])

# ===== In-memory seed store =====
SEED = {
    "projects": [], "tasks": [], "risks": [], "issues": [], "kpis": [],
    "students": [], "courses": [], "enrollments": [], "attendance": [],
}

# ---- Core demo projects ----
class Project(BaseModel):
    id: int
    name: str
    owner: str
    budget: float
    start_date: str
    end_date: str

SAMPLE_PROJECTS = [
    {"id": 1, "name": "King Salman Park", "owner": "RCRC", "budget": 1250000000.0, "start_date":"2024-01-01","end_date":"2026-12-31"},
    {"id": 2, "name": "Diriyah Gate", "owner": "DGDA", "budget": 2000000000.0, "start_date":"2023-06-01","end_date":"2027-12-31"},
    {"id": 3, "name": "Qiddiya", "owner": "QIC", "budget": 3500000000.0, "start_date":"2024-05-15","end_date":"2028-06-30"},
]

@core.get("/projects", response_model=List[Project])
def get_projects(user: User = Depends(require_roles("admin","pm","qa","finance","procurement"))):
    return SAMPLE_PROJECTS if not SEED["projects"] else SEED["projects"][:50]

# ---- EVM / Procurement (كما في نسخة Fusion السابقة) ----
class EVMInput(BaseModel):
    boq_csv: str
    progress_csv: str

@evm.post("/run")
def evm_run(body: EVMInput, user: User = Depends(require_roles("admin","pm"))):
    from io import StringIO
    try:
        boq = pd.read_csv(StringIO(body.boq_csv))
        prg = pd.read_csv(StringIO(body.progress_csv))
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")
    boq["LineTotal"] = boq["Qty"] * boq["UnitPrice"]
    BAC = float(boq["LineTotal"].sum())
    latest = prg["Period"].max()
    latest_progress = prg[prg["Period"] == latest].groupby("ItemCode")["QtyDone"].sum().reset_index()
    merged = boq.merge(latest_progress, on="ItemCode", how="left").fillna({"QtyDone":0})
    merged["Percent"] = (merged["QtyDone"] / merged["Qty"]).clip(0,1)
    merged["EV"] = merged["Percent"] * merged["LineTotal"]
    EV = float(merged["EV"].sum())
    AC = float(prg[prg["Period"] <= latest]["AC"].sum())
    periods = sorted(prg["Period"].unique())
    PV = BAC * (periods.index(latest)+1)/len(periods)
    SPI = (EV / PV) if PV>0 else None
    CPI = (EV / AC) if AC>0 else None
    EAC = BAC / CPI if CPI and CPI>0 else None
    ETC = EAC - AC if EAC else None
    TCPI = (BAC - EV)/ (EAC - AC) if (EAC and EAC>AC and BAC>EV) else None
    return {"BAC":round(BAC,2),"EV":round(EV,2),"AC":round(AC,2),"PV":round(PV,2),
            "SPI":round(SPI,3) if SPI is not None else None,
            "CPI":round(CPI,3) if CPI is not None else None,
            "EAC":round(EAC,2) if EAC is not None else None,
            "ETC":round(ETC,2) if ETC is not None else None,
            "TCPI":round(TCPI,3) if TCPI is not None else None,
            "latest_period": latest}

class NeedItem(BaseModel):
    ItemCode: str
    Description: str
    NeededOn: str
    LeadDays: int = 15
    Qty: float

class ProcurementInput(BaseModel):
    schedule: List[NeedItem]

@proc.post("/trigger")
def procurement_trigger(inp: ProcurementInput, user: User = Depends(require_roles("admin","pm","procurement"))):
    warn = []
    today = datetime.utcnow().date()
    for it in inp.schedule:
        needed = datetime.fromisoformat(it.NeededOn).date()
        trigger_day = needed - timedelta(days=it.LeadDays)
        if today >= trigger_day:
            warn.append({"ItemCode": it.ItemCode, "Description": it.Description, "Qty": it.Qty,
                         "NeededOn": it.NeededOn, "Trigger": str(trigger_day),
                         "Status": "☠️ DELAY RISK" if today > trigger_day else "Trigger Now"})
    return {"count": len(warn), "alerts": warn}

# ---- Vision ----
class Sector(BaseModel):
    id: int
    name: str
    plan: float = Field(ge=0, le=100)
    actual: float = Field(ge=0, le=100)

VISION_SAMPLE = [
    {"id":1,"name":"Housing","plan":62.0,"actual":54.0},
    {"id":2,"name":"Tourism","plan":48.0,"actual":52.0},
    {"id":3,"name":"Transport","plan":70.0,"actual":65.0},
    {"id":4,"name":"Industry","plan":40.0,"actual":33.0},
]

@vision.get("/overview")
def vision_overview(user: User = Depends(require_roles("admin","pm","qa","finance"))):
    out = []
    for s in VISION_SAMPLE:
        gap = round(s["actual"]-s["plan"],2)
        status = "Ahead" if gap>0 else ("OnTrack" if gap==0 else "Behind")
        rec = "Accelerate enabling & unlock bottlenecks" if gap<0 else "Sustain momentum"
        out.append({**s, "gap":gap, "status":status, "recommendation": rec})
    overall = round(sum([s["actual"] for s in VISION_SAMPLE])/len(VISION_SAMPLE),2)
    return {"sectors": out, "overall_actual_avg": overall, "generated_at": datetime.utcnow().isoformat()}

# ---- IFRS15 ----
class ItemPlan(BaseModel):
    name: str
    price: float
    method: str = Field(pattern="^(point|over_time)$")
    start: Optional[str] = None
    end: Optional[str] = None

class IFRSInput(BaseModel):
    contract_id: str
    items: List[ItemPlan]

@ifrs.post("/schedule")
def ifrs_schedule(inp: IFRSInput, user: User = Depends(require_roles("admin","finance"))):
    rows = []
    for it in inp.items:
        if it.method == "point":
            rows.append({"contract_id": inp.contract_id, "item": it.name, "period": it.start or "now", "amount": round(it.price,2)})
        else:
            if not it.start or not it.end:
                raise HTTPException(400, f"Item {it.name}: start/end required for over_time")
            y1,m1 = map(int, it.start.split("-")); y2,m2 = map(int, it.end.split("-"))
            total_months = (y2 - y1)*12 + (m2 - m1) + 1
            if total_months <= 0:
                raise HTTPException(400, f"Item {it.name}: invalid period")
            monthly = round(it.price/total_months, 2)
            y,m = y1,m1
            for _ in range(total_months):
                rows.append({"contract_id": inp.contract_id, "item": it.name, "period": f"{y:04d}-{m:02d}", "amount": monthly})
                m += 1
                if m>12: m=1; y+=1
    agg = {}
    for r in rows: agg[r["period"]] = agg.get(r["period"],0.0) + r["amount"]
    series = [{"period":k, "revenue":round(v,2)} for k,v in sorted(agg.items())]
    total = round(sum([r["amount"] for r in rows]),2)
    return {"contract_id": inp.contract_id, "total": total, "series": series, "lines": rows}

# ---- Academy ----
class HVACConvert(BaseModel):
    value: float
    direction: str = Field(pattern="^(kw_to_tr|tr_to_kw)$")

@acad.post("/hvac/convert")
def hvac_convert(inp: HVACConvert, user: User = Depends(require_roles("admin","qa","pm","academy"))):
    if inp.direction == "kw_to_tr":
        return {"ton_refrigeration": round(inp.value/3.517, 4)}
    else:
        return {"kW": round(inp.value*3.517, 4)}

class ThreePhase(BaseModel):
    power_kw: float
    voltage_v: float
    pf: float = Field(gt=0, le=1.0)

@acad.post("/electrical/three_phase_current")
def three_phase(inp: ThreePhase, user: User = Depends(require_roles("admin","qa","pm","academy"))):
    i = (inp.power_kw*1000.0) / (1.73205 * inp.voltage_v * inp.pf)
    return {"current_a": round(i, 3)}

# ---- PMO ----
class PMOKPI(BaseModel):
    name: str
    value: float
    target: float

@pmo.get("/portfolio")
def pmo_portfolio(user: User = Depends(require_roles("admin","pmo","pm"))):
    return {"count_projects": len(SEED["projects"]) or 3,
            "count_tasks": len(SEED["tasks"]),
            "count_risks": len(SEED["risks"]),
            "count_issues": len(SEED["issues"])}

@pmo.get("/kpis")
def pmo_kpis(user: User = Depends(require_roles("admin","pmo","pm"))):
    if SEED["kpis"]:
        return SEED["kpis"][:20]
    return [{"name":"SPI","value":0.92,"target":1.0},{"name":"CPI","value":0.88,"target":1.0},{"name":"OnTime%","value":72,"target":90}]

@pmo.get("/risk_register")
def pmo_risk_register(limit: int = 50, user: User = Depends(require_roles("admin","pmo","pm"))):
    return SEED["risks"][:min(limit, len(SEED["risks"]))]

@pmo.get("/timeline")
def pmo_timeline(limit: int = 200, user: User = Depends(require_roles("admin","pmo","pm"))):
    return SEED["tasks"][:min(limit, len(SEED["tasks"]))]

# ---- Education ----
@edu.get("/courses")
def edu_courses(limit: int = 50, user: User = Depends(require_roles("admin","edu","academy"))):
    return SEED["courses"][:min(limit, len(SEED["courses"]))]

@edu.get("/students")
def edu_students(limit: int = 50, user: User = Depends(require_roles("admin","edu","academy"))):
    return SEED["students"][:min(limit, len(SEED["students"]))]

@edu.get("/enrollments")
def edu_enrollments(limit: int = 100, user: User = Depends(require_roles("admin","edu","academy"))):
    return SEED["enrollments"][:min(limit, len(SEED["enrollments"]))]

@edu.get("/attendance")
def edu_attendance(limit: int = 100, user: User = Depends(require_roles("admin","edu","academy"))):
    return SEED["attendance"][:min(limit, len(SEED["attendance"]))]

# ---- Reports ----
@rep.get("/demo")
def report_demo(user: User = Depends(require_roles("admin","pm","qa","pmo"))):
    html = f"""<!doctype html>
<html lang="ar" dir="rtl"><meta charset="utf-8" />
<title>تقرير — {APP_NAME}</title>
<body style="font-family:Tahoma,Arial;margin:40px">
<h2>تقرير {APP_NAME}</h2>
<p>تاريخ: {datetime.utcnow().isoformat()} UTC</p>
<ul>
 <li>PMO Projects: {len(SEED["projects"]) or 3}</li>
 <li>Education Students: {len(SEED["students"])}</li>
 <li>وحدات: Core/EVM/Proc/Vision/IFRS15/Academy/PMO/Education</li>
</ul>
</body></html>"""
    return PlainTextResponse(content=html, media_type="text/html")

# ---- Admin: load/clear seed into memory from CSVs ----
class SeedAction(BaseModel):
    path: str | None = None

@admin.post("/seed/load")
def admin_seed_load(user: User = Depends(require_roles("admin"))):
    base = os.path.join(os.path.dirname(__file__), "data")
    def load_csv(name):
        p = os.path.join(base, f"{name}.csv")
        if not os.path.exists(p): return []
        import csv
        with open(p, "r", encoding="utf-8") as f:
            return list(csv.DictReader(f))
    for name in ["projects","tasks","risks","issues","kpis","students","courses","enrollments","attendance"]:
        SEED[name] = load_csv(name)
    return {"loaded": {k: len(v) for k,v in SEED.items()}}

@admin.post("/seed/clear")
def admin_seed_clear(user: User = Depends(require_roles("admin"))):
    for k in SEED.keys(): SEED[k] = []
    return {"cleared": True}

# Root
@app.get("/")
def root():
    return {"name": APP_NAME, "ok": True}

# Mount routers
app.include_router(core); app.include_router(evm); app.include_router(proc)
app.include_router(vision); app.include_router(ifrs); app.include_router(acad)
app.include_router(pmo); app.include_router(edu); app.include_router(rep); app.include_router(admin)
