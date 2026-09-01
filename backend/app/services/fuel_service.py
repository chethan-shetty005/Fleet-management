from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.fuel import FuelRecord
from app.schemas.fuel import FuelRecordCreate

INITIAL_SEED_RECORDS = [
    {"record_id": "FR-2025-0845", "date": "27 Aug 2025", "vehicle_no": "KA01EV1111", "fuel_type": "Electric", "liters": 95.0, "amount": 2850.0},
    {"record_id": "FR-2025-0844", "date": "27 Aug 2025", "vehicle_no": "KA01PT2222", "fuel_type": "Petrol", "liters": 85.0, "amount": 8925.0},
    {"record_id": "FR-2025-0843", "date": "26 Aug 2025", "vehicle_no": "KA01HB3333", "fuel_type": "Hybrid", "liters": 65.0, "amount": 4875.0},
    {"record_id": "FR-2025-0842", "date": "27 Aug 2025", "vehicle_no": "KA01AB1234", "fuel_type": "Diesel", "liters": 120.0, "amount": 7200.0},
    {"record_id": "FR-2025-0841", "date": "27 Aug 2025", "vehicle_no": "KA01CD5678", "fuel_type": "Diesel", "liters": 150.0, "amount": 9000.0},
    {"record_id": "FR-2025-0840", "date": "26 Aug 2025", "vehicle_no": "KA01EF9012", "fuel_type": "Diesel", "liters": 80.0, "amount": 4800.0},
    {"record_id": "FR-2025-0839", "date": "26 Aug 2025", "vehicle_no": "KA01GH3456", "fuel_type": "CNG", "liters": 110.0, "amount": 6600.0},
    {"record_id": "FR-2025-0838", "date": "25 Aug 2025", "vehicle_no": "KA01IJ7890", "fuel_type": "Diesel", "liters": 90.0, "amount": 5400.0},
    {"record_id": "FR-2025-0837", "date": "25 Aug 2025", "vehicle_no": "KA01KL2345", "fuel_type": "Diesel", "liters": 135.0, "amount": 8100.0}
]

def get_all_fuel_records(db: Session) -> List[FuelRecord]:
    stmt = select(FuelRecord).order_by(FuelRecord.id.desc())
    records = list(db.scalars(stmt).all())
    if not records:
        for seed in INITIAL_SEED_RECORDS:
            obj = FuelRecord(**seed)
            db.add(obj)
        db.commit()
        records = list(db.scalars(stmt).all())
    return records

def create_fuel_record(db: Session, record_in: FuelRecordCreate) -> FuelRecord:
    rec_id = record_in.id or f"FR-2025-{int(datetime.now().timestamp() % 10000):04d}"
    rec_date = record_in.date or datetime.now().strftime("%d %b %Y")
    
    db_obj = FuelRecord(
        record_id=rec_id,
        date=rec_date,
        vehicle_no=record_in.vehicleNo,
        fuel_type=record_in.fuelType,
        liters=record_in.liters,
        amount=record_in.amount
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_fuel_record(db: Session, record_id: str) -> bool:
    stmt = select(FuelRecord).where((FuelRecord.record_id == record_id) | (FuelRecord.id == int(record_id) if record_id.isdigit() else False))
    db_obj = db.scalar(stmt)
    if db_obj:
        db.delete(db_obj)
        db.commit()
        return True
    return False
