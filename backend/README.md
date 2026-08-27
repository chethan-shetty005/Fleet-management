# Fleet Management REST API Backend

A clean, layered Python FastAPI backend designed for a **Fleet Management Dashboard application**.

This application follows enterprise REST API standards, strict type hinting with Pydantic v2, and SQLAlchemy 2.0 ORM database abstraction over SQLite (`fleet.db`).

---

## 🏗️ Architecture & Component Layers

```text
Frontend (React + TypeScript)
        │
        │ HTTP REST (JSON)
        ▼
Layer 1: FastAPI Application & Routers (app/routers/)
        │ - Handles HTTP requests & response status codes
        │ - Parameter parsing & Dependency Injection (No business logic)
        ▼
Layer 2: Pydantic Schemas (app/schemas/)
        │ - Input request validation & output serialization
        │ - Strict field constraints & JSON Schema generation
        ▼
Layer 3: Service Layer (app/services/)
        │ - Pure business logic, DB transactions, mileage auto-updates
        ▼
Layer 4: Models & ORM Layer (app/models/)
        │ - SQLAlchemy 2.0 ORM Entities, FK relationships
        ▼
Layer 5: Database Layer (app/database/ & SQLite)
        │ - Engine connection, SessionLocal generator (get_db)
```

---

## 📁 Project Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entrypoint, CORS, startup lifecycle
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # Centralized Pydantic Settings (.env configuration)
│   ├── database/
│   │   ├── __init__.py
│   │   ├── session.py             # Engine, SessionLocal, get_db dependency generator
│   │   └── base.py                # Base declarative ORM class
│   ├── models/
│   │   ├── __init__.py
│   │   ├── vehicle.py             # Vehicle ORM Entity
│   │   ├── trip.py                # Trip ORM Entity (FK -> Vehicle)
│   │   └── maintenance.py         # MaintenanceLog ORM Entity (FK -> Vehicle)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── vehicle.py             # Vehicle Pydantic request/response schemas
│   │   ├── trip.py                # Trip Pydantic request/response schemas
│   │   ├── maintenance.py         # Maintenance Log Pydantic schemas
│   │   └── analytics.py           # Fleet overview KPI response schema
│   ├── services/
│   │   ├── __init__.py
│   │   ├── vehicle_service.py     # Vehicle CRUD & uniqueness validations
│   │   ├── trip_service.py        # Trip dispatching & mileage calculation
│   │   ├── maintenance_service.py # Service logging & status sync
│   │   └── analytics_service.py   # Aggregated KPI metric calculations
│   └── routers/
│       ├── __init__.py
│       ├── vehicle_router.py      # REST Endpoints for /api/v1/vehicles
│       ├── trip_router.py         # REST Endpoints for /api/v1/trips
│       ├── maintenance_router.py  # REST Endpoints for /api/v1/maintenance
│       └── analytics_router.py    # REST Endpoints for /api/v1/analytics/overview
├── fleet.db                       # SQLite Database file (Auto-created)
├── seed_data.py                   # Data seeding script
├── test_api.py                    # Integration test suite
├── requirements.txt               # Dependencies list
└── README.md                      # Backend documentation
```

---

## 🛢️ Database Schema & Entities

The backend manages 3 core domain entities:

1. **Vehicles (`vehicles`)**:
   - `id` (PK), `vin` (Unique), `license_plate` (Unique), `make`, `model`, `year`, `fuel_type`, `status` (`Active`, `Maintenance`, `Out of Service`), `current_mileage`, `created_at`, `updated_at`.
2. **Trips (`trips`)**:
   - `id` (PK), `trip_number` (Unique), `vehicle_id` (FK -> `vehicles.id`), `start_location`, `end_location`, `start_time`, `end_time`, `status` (`Scheduled`, `In Progress`, `Completed`, `Cancelled`), `distance_miles`, `fuel_consumed_gallons`.
3. **Maintenance Logs (`maintenance_logs`)**:
   - `id` (PK), `vehicle_id` (FK -> `vehicles.id`), `service_type`, `description`, `cost`, `service_date`, `status` (`Scheduled`, `In Progress`, `Completed`), `performed_by`.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Seed Sample Data
```bash
python seed_data.py
```

### 3. Run Integration Tests
```bash
python test_api.py
```

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

---

## 📖 API Documentation & Swagger

Once the server is running, explore interactive API endpoints and schemas:
* **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **OpenAPI Spec**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

---

## 🐘 Future-proofing for PostgreSQL

The backend uses SQLite (`sqlite:///./fleet.db`) for lightweight local storage without requiring external database services.
To switch to PostgreSQL in production:
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/fleet_db
   ```
2. Install `psycopg2-binary`: `pip install psycopg2-binary`.
No code or layer changes are required!
