import math
import re
from datetime import date, datetime, timedelta, timezone

from pydantic import BaseModel, ConfigDict, field_validator

OPTIONS = {
    "genders": ["Male", "Female", "Other"],
    "wards": ["General Ward", "ICU", "Pediatric Ward", "Maternity Ward", "Emergency"],
    "departments": ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine", "Gynecology"],
    "doctors": ["Dr. Anita Rao", "Dr. Rahul Mehta", "Dr. Sneha Iyer", "Dr. Vikram Singh", "Dr. Priya Nair"],
    "statuses": ["Admitted", "Discharged"],
}

LABELS = {
    "name": "Name", "age": "Age", "gender": "Gender", "ward": "Ward", "department": "Department",
    "doctor": "Doctor", "admission_date": "Admission date", "status": "Status",
}

IST = timezone(timedelta(hours=5, minutes=30))  # hospital runs on Indian time
NAME_RE = re.compile(r"^[^\W\d_]+(?: [^\W\d_]+)*$")  # letters only, single spaces between words
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def today() -> date:
    return datetime.now(IST).date()


class PatientIn(BaseModel):
    """Request body for create/update. Every rule has a human-readable message."""

    model_config = ConfigDict(extra="ignore")

    name: str
    age: int
    gender: str
    ward: str
    department: str
    doctor: str
    admission_date: date
    status: str = "Admitted"

    @field_validator("name", mode="before")
    @classmethod
    def check_name(cls, v):
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Name is required")
        v = " ".join(v.split())
        if not NAME_RE.match(v):
            raise ValueError("Name must contain letters only (no numbers or symbols)")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer")
        return v

    @field_validator("age", mode="before")
    @classmethod
    def check_age(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ValueError("Age is required")
        if isinstance(v, bool) or not isinstance(v, (int, float, str)):
            raise ValueError("Age must be a number")
        try:
            n = float(v)
        except ValueError:
            raise ValueError("Age must be a number")
        if not math.isfinite(n) or n != int(n) or not 0 <= n <= 120:
            raise ValueError("Age must be a whole number between 0 and 120")
        return int(n)

    @field_validator("gender", "ward", "department", "doctor", mode="before")
    @classmethod
    def check_choice(cls, v, info):
        label = LABELS[info.field_name]
        if v is None or v == "":
            raise ValueError(f"{label} is required")
        allowed = OPTIONS[info.field_name + "s"]
        if v not in allowed:
            raise ValueError(f"{label} must be one of: {', '.join(allowed)}")
        return v

    @field_validator("admission_date", mode="before")
    @classmethod
    def check_date(cls, v):
        if v is None or v == "":
            raise ValueError("Admission date is required")
        msg = "Admission date must be a valid date (YYYY-MM-DD)"
        if not isinstance(v, str) or not DATE_RE.fullmatch(v):
            raise ValueError(msg)
        try:
            d = date.fromisoformat(v)
        except ValueError:
            raise ValueError(msg)
        if d > today():
            raise ValueError("Admission date cannot be in the future")
        return d

    @field_validator("status", mode="before")
    @classmethod
    def check_status(cls, v):
        if v is None or v == "":
            return "Admitted"
        if v not in OPTIONS["statuses"]:
            raise ValueError("Status must be Admitted or Discharged")
        return v
