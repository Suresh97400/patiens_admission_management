# Patient Admission Management App

A web app for hospital staff to manage admitted patients: add, view, filter, search, edit, delete and discharge.

**Live app:** `<paste your frontend link here>`
**Backend API:** `<paste your backend link here>/docs`

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), plain CSS |
| Backend | Python, FastAPI, Pydantic (validation), SQLAlchemy |
| Database | PostgreSQL in production (data persists across restarts); SQLite file for local development |
| Hosting | Frontend on Vercel, backend on Render, database on Neon (all free tiers) |

## Features
1. Add a patient
2. View list of all patients
3. Filter by Ward, Department and Doctor (plus Status)
4. Search patients by name
5. Edit a patient
6. Delete a patient (with confirmation)
7. Mark a patient as Discharged
8. Responsive design: table on desktop/tablet, cards on mobile

## Validation (frontend AND backend)
| Field | Rule |
|---|---|
| Name | Required, letters only |
| Age | Required, whole number 0-120 |
| Gender, Ward, Department, Doctor | Required, must be one of the listed options |
| Admission date | Required, valid date, cannot be in the future |

The backend rejects invalid data with HTTP 400 and a clear message, e.g.
`{ "error": "Validation failed: Age must be a whole number between 0 and 120", "errors": { "age": "Age must be a whole number between 0 and 120" } }`

## Run locally

Requires Python 3.9+ and Node 18+. No database setup needed: SQLite is used automatically.

**Backend**
```
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

**Frontend** (new terminal)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (the dev server proxies `/api` to the backend).

## Environment variables
No secrets are stored in this repo. Set these in the hosting dashboards (see `.env.example` files).

| Where | Variable | Purpose |
|---|---|---|
| Backend | `DATABASE_URL` | Postgres connection string. If unset, local SQLite is used |
| Backend | `FRONTEND_ORIGINS` | Deployed frontend URL(s), comma-separated, for CORS |
| Frontend | `VITE_API_URL` | Deployed backend URL |

## Deployment
1. **Database (Neon):** create a free Postgres project and copy the connection string.
2. **Backend (Render):** New Web Service from this repo. Root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Add `DATABASE_URL` and `FRONTEND_ORIGINS`.
3. **Frontend (Vercel):** import the repo, root directory `frontend`, framework Vite. Add `VITE_API_URL` = the Render URL (no trailing slash).
4. Put the Vercel URL into Render's `FRONTEND_ORIGINS`, then redeploy the backend.

## API
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/options` | Dropdown values |
| GET | `/api/patients?search=&ward=&department=&doctor=&status=` | List, search and filter |
| POST | `/api/patients` | Add a patient |
| PUT | `/api/patients/{id}` | Edit a patient |
| PATCH | `/api/patients/{id}/discharge` | Mark as discharged |
| DELETE | `/api/patients/{id}` | Delete a patient |

## Project structure
```
backend/    main.py (routes, error handling), schemas.py (validation), database.py (DB setup)
frontend/   src/App.jsx, src/components/ (PatientList, PatientForm, Modal), src/api.js, src/validation.js
docs/screenshots/   screenshots used below
```

## Screenshots
Add your own screenshots to `docs/screenshots/` and keep these lines:

![Desktop list](docs/screenshots/desktop.png)
![Add patient form with validation errors](docs/screenshots/form-validation.png)
![Mobile view](docs/screenshots/mobile.png)
