from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.fuel import FuelRecordCreate, FuelRecordResponse
from app.services import fuel_service

router = APIRouter(prefix="/fuel", tags=["Fuel Records"])

@router.get("", response_model=List[FuelRecordResponse])
def get_fuel_records(db: Session = Depends(get_db)):
    records = fuel_service.get_all_fuel_records(db)
    return [
        FuelRecordResponse(
            id=r.record_id,
            date=r.date,
            vehicleNo=r.vehicle_no,
            fuelType=r.fuel_type,
            liters=r.liters,
            amount=r.amount,
            createdAt=r.created_at
        ) for r in records
    ]

@router.post("", response_model=FuelRecordResponse, status_code=status.HTTP_201_CREATED)
def create_fuel_record(record_in: FuelRecordCreate, db: Session = Depends(get_db)):
    r = fuel_service.create_fuel_record(db, record_in)
    return FuelRecordResponse(
        id=r.record_id,
        date=r.date,
        vehicleNo=r.vehicle_no,
        fuelType=r.fuel_type,
        liters=r.liters,
        amount=r.amount,
        createdAt=r.created_at
    )

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fuel_record(record_id: str, db: Session = Depends(get_db)):
    success = fuel_service.delete_fuel_record(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fuel record not found")
    return None
