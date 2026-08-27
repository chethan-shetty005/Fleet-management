from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate

def get_vehicles(db: Session, status_filter: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Vehicle]:
    """Retrieve all vehicles with optional status filtering and pagination."""
    query = select(Vehicle)
    if status_filter:
        query = query.where(Vehicle.status == status_filter)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query).all())

def get_vehicle_by_id(db: Session, vehicle_id: int) -> Optional[Vehicle]:
    """Retrieve a single vehicle by its database primary key ID."""
    return db.get(Vehicle, vehicle_id)

def create_vehicle(db: Session, vehicle_in: VehicleCreate) -> Vehicle:
    """Create a new vehicle record with VIN and license plate uniqueness checks."""
    # Check duplicate VIN
    existing_vin = db.scalar(select(Vehicle).where(Vehicle.vin == vehicle_in.vin))
    if existing_vin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with VIN '{vehicle_in.vin}' already exists."
        )

    # Check duplicate license plate
    existing_plate = db.scalar(select(Vehicle).where(Vehicle.license_plate == vehicle_in.license_plate))
    if existing_plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with license plate '{vehicle_in.license_plate}' already exists."
        )

    db_vehicle = Vehicle(**vehicle_in.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def update_vehicle(db: Session, vehicle_id: int, vehicle_in: VehicleUpdate) -> Vehicle:
    """Update an existing vehicle record."""
    db_vehicle = get_vehicle_by_id(db, vehicle_id)
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {vehicle_id} not found."
        )

    update_data = vehicle_in.model_dump(exclude_unset=True)

    # Check VIN conflict if updated
    if "vin" in update_data and update_data["vin"] != db_vehicle.vin:
        existing = db.scalar(select(Vehicle).where(Vehicle.vin == update_data["vin"]))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with VIN '{update_data['vin']}' already exists."
            )

    # Check license plate conflict if updated
    if "license_plate" in update_data and update_data["license_plate"] != db_vehicle.license_plate:
        existing = db.scalar(select(Vehicle).where(Vehicle.license_plate == update_data["license_plate"]))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with license plate '{update_data['license_plate']}' already exists."
            )

    for field, value in update_data.items():
        setattr(db_vehicle, field, value)

    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def delete_vehicle(db: Session, vehicle_id: int) -> None:
    """Delete a vehicle by ID."""
    db_vehicle = get_vehicle_by_id(db, vehicle_id)
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {vehicle_id} not found."
        )
    db.delete(db_vehicle)
    db.commit()
