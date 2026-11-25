import os
from datetime import date

from sqlalchemy import Column, Date, Integer, MetaData, String, Table, create_engine, inspect
from sqlalchemy.pool import NullPool


def _load_dotenv() -> None:
    """Load backend/.env for local runs without overriding real environment variables."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


_load_dotenv()


def database_url() -> str:
    """DATABASE_URL (Postgres in production). Falls back to a local SQLite file for development."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        base_dir = "/tmp" if os.environ.get("VERCEL") else os.path.dirname(__file__)
        return "sqlite:///" + os.path.join(base_dir, "patients.db")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


URL = database_url()
engine_kwargs = {
    "connect_args": {"check_same_thread": False} if URL.startswith("sqlite") else {},
}
if os.environ.get("VERCEL") and not URL.startswith("sqlite"):
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(URL, **engine_kwargs)

metadata = MetaData()
patients = Table(
    "patients",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), nullable=False),
    Column("age", Integer, nullable=False),
    Column("gender", String(20), nullable=False),
    Column("ward", String(50), nullable=False),
    Column("department", String(50), nullable=False),
    Column("doctor", String(100), nullable=False),
    Column("admission_date", Date, nullable=False),
    Column("status", String(20), nullable=False, default="Admitted"),
)


_db_initialized = False


def get_db():
    """FastAPI dependency: one connection per request. Endpoints commit explicitly."""
    if not _db_initialized:
        init_db()
    with engine.connect() as conn:
        yield conn


def init_db() -> None:
    """Create the table if missing. Sample rows are added only when the table is first created."""
    global _db_initialized
    existed = inspect(engine).has_table("patients")
    metadata.create_all(engine)
    if existed:
        _db_initialized = True
        return
    with engine.begin() as conn:
        conn.execute(
            patients.insert(),
            [
                dict(name="Asha Verma", age=54, gender="Female", ward="ICU", department="Cardiology",
                     doctor="Dr. Anita Rao", admission_date=date(2026, 11, 20), status="Admitted"),
                dict(name="Rohan Das", age=31, gender="Male", ward="General Ward", department="Orthopedics",
                     doctor="Dr. Vikram Singh", admission_date=date(2026, 11, 18), status="Admitted"),
                dict(name="Meera Nair", age=8, gender="Female", ward="Pediatric Ward", department="Pediatrics",
                     doctor="Dr. Sneha Iyer", admission_date=date(2026, 11, 10), status="Discharged"),
            ],
        )
    _db_initialized = True
