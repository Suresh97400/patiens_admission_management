import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, insert, select, update
from sqlalchemy.engine import Connection
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import get_db, init_db, patients
from schemas import LABELS, OPTIONS, PatientIn


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Patient Admission API", lifespan=lifespan)

# FRONTEND_ORIGINS = comma-separated list of deployed frontend URLs (set in the host's dashboard)
origins = ["http://localhost:5173", "http://127.0.0.1:5173"] + [
    o.strip().rstrip("/") for o in os.environ.get("FRONTEND_ORIGINS", "").split(",") if o.strip()
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


# ---------- error handling: always {"error": "...", "errors": {field: message}} ----------
@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc: RequestValidationError):
    errors = {}
    for err in exc.errors():
        loc = err.get("loc", ())
        field = loc[-1] if len(loc) > 1 and loc[0] == "body" and isinstance(loc[-1], str) else None
        if field is None:
            if loc and loc[0] == "body":
                errors["_"] = "Request body must be a valid JSON object"
            else:
                errors["_"] = f"Invalid value for '{loc[-1] if loc else 'request'}'"
        elif err["type"] == "missing":
            errors[field] = f"{LABELS.get(field, field)} is required"
        elif "ctx" in err and "error" in err["ctx"]:
            errors[field] = str(err["ctx"]["error"])
        else:
            errors[field] = err["msg"]
    return JSONResponse(
        status_code=400,
        content={"error": "Validation failed: " + "; ".join(errors.values()), "errors": errors},
    )


@app.exception_handler(StarletteHTTPException)
async def http_handler(request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail), "errors": {}})


@app.exception_handler(Exception)
async def unhandled_handler(request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Something went wrong on the server", "errors": {}})


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, "errors": {}})


def to_dict(row) -> dict:
    d = dict(row._mapping)
    d["admission_date"] = d["admission_date"].isoformat()
    return d


def find(conn: Connection, patient_id: int):
    return conn.execute(select(patients).where(patients.c.id == patient_id)).first()


# ---------- routes ----------
@app.get("/api/options")
def get_options():
    return OPTIONS


@app.get("/api/patients")
def list_patients(
    search: str = "", ward: str = "", department: str = "", doctor: str = "", status: str = "",
    conn: Connection = Depends(get_db),
):
    stmt = select(patients)
    term = search.strip()
    if term:
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = stmt.where(patients.c.name.ilike(f"%{escaped}%", escape="\\"))
    for column, value in (("ward", ward), ("department", department), ("doctor", doctor), ("status", status)):
        if value:
            stmt = stmt.where(patients.c[column] == value)
    stmt = stmt.order_by(patients.c.admission_date.desc(), patients.c.id.desc())
    return [to_dict(r) for r in conn.execute(stmt)]


@app.post("/api/patients", status_code=201)
def create_patient(p: PatientIn, conn: Connection = Depends(get_db)):
    result = conn.execute(insert(patients).values(**p.model_dump()))
    new_id = result.inserted_primary_key[0]
    conn.commit()
    return to_dict(find(conn, new_id))


@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, p: PatientIn, conn: Connection = Depends(get_db)):
    if not find(conn, patient_id):
        return error(404, "Patient not found")
    values = p.model_dump()
    if "status" not in p.model_fields_set:  # editing without a status keeps the current one
        values.pop("status")
    conn.execute(update(patients).where(patients.c.id == patient_id).values(**values))
    conn.commit()
    return to_dict(find(conn, patient_id))


@app.patch("/api/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int, conn: Connection = Depends(get_db)):
    existing = find(conn, patient_id)
    if not existing:
        return error(404, "Patient not found")
    if existing.status == "Discharged":
        return error(400, "Patient is already discharged")
    conn.execute(update(patients).where(patients.c.id == patient_id).values(status="Discharged"))
    conn.commit()
    return to_dict(find(conn, patient_id))


@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int, conn: Connection = Depends(get_db)):
    if not find(conn, patient_id):
        return error(404, "Patient not found")
    conn.execute(delete(patients).where(patients.c.id == patient_id))
    conn.commit()
    return {"message": "Patient deleted", "id": patient_id}


# Optional: serve the built React app (run `npm run build` in /frontend) from the same server
DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
