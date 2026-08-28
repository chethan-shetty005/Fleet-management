from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate

import uuid
import random
import string

def generate_vin() -> str:
    """Generate a random 17-character uppercase alphanumeric VIN string."""
    allowed_chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
    return "".join(random.choices(allowed_chars, k=17))

def get_vehicles(
    db: Session,
    license_plate: Optional[str] = None,
    number_plate: Optional[str] = None,
    v_id: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """Retrieve vehicles with optional license_plate, v_id, vehicle_type, or status filtering and pagination."""
    query = select(Vehicle)
    target_plate = license_plate or number_plate
    if target_plate:
        query = query.where(Vehicle.license_plate.ilike(f"%{target_plate}%"))
    if v_id:
        query = query.where(Vehicle.v_id == v_id)
    if vehicle_type:
        query = query.where(Vehicle.vehicle_type.ilike(f"%{vehicle_type}%"))
    if status_filter:
        query = query.where(Vehicle.status == status_filter)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query).all())

def get_vehicle_by_id(db: Session, v_id: str) -> Optional[Vehicle]:
    """Retrieve a single vehicle by its string primary key v_id."""
    return db.get(Vehicle, v_id)

def create_vehicle(db: Session, vehicle_in: VehicleCreate) -> Vehicle:
    """Create a new vehicle record with random VIN generation and v_id/license_plate uniqueness checks."""
    v_id = vehicle_in.v_id or f"VH-{uuid.uuid4().hex[:6].upper()}"
    license_plate = vehicle_in.license_plate or getattr(vehicle_in, "number_plate", None)
    vin = vehicle_in.vin or generate_vin()

    if not license_plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License plate is required."
        )

    # Check duplicate v_id
    existing_v_id = db.scalar(select(Vehicle).where(Vehicle.v_id == v_id))
    if existing_v_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with ID '{v_id}' already exists."
        )

    # Check duplicate license_plate
    existing_plate = db.scalar(select(Vehicle).where(Vehicle.license_plate == license_plate))
    if existing_plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with license plate '{license_plate}' already exists."
        )

    db_vehicle = Vehicle(
        v_id=v_id,
        license_plate=license_plate,
        vin=vin,
        make=vehicle_in.make,
        model=vehicle_in.model,
        year=vehicle_in.year,
        vehicle_type=vehicle_in.vehicle_type,
        fuel_type=vehicle_in.fuel_type,
        status=vehicle_in.status,
        current_mileage=vehicle_in.current_mileage
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def update_vehicle(db: Session, v_id: str, vehicle_in: VehicleUpdate) -> Vehicle:
    """Update an existing vehicle record using string v_id (preserves previous values for skipped/null fields)."""
    db_vehicle = get_vehicle_by_id(db, v_id)
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )

    # Dump input data, excluding fields that were not explicitly set
    update_data = vehicle_in.model_dump(exclude_unset=True)

    # Reject or prevent updating immutable VIN
    if "vin" in update_data:
        if update_data["vin"] and update_data["vin"] != db_vehicle.vin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VIN is immutable and cannot be updated or modified."
            )
        update_data.pop("vin", None)

    # Check v_id conflict if updated
    if "v_id" in update_data and update_data["v_id"]:
        if update_data["v_id"] != db_vehicle.v_id:
            existing = db.scalar(select(Vehicle).where(Vehicle.v_id == update_data["v_id"]))
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle with ID '{update_data['v_id']}' already exists."
                )
        else:
            update_data.pop("v_id", None)

    # Check license_plate conflict if updated
    new_plate = update_data.get("license_plate") or update_data.get("number_plate")
    if new_plate:
        if new_plate != db_vehicle.license_plate:
            existing = db.scalar(select(Vehicle).where(Vehicle.license_plate == new_plate))
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle with license plate '{new_plate}' already exists."
                )
            update_data["license_plate"] = new_plate
        else:
            update_data.pop("license_plate", None)

    if "number_plate" in update_data:
        update_data.pop("number_plate", None)

    for field, value in update_data.items():
        if hasattr(db_vehicle, field) and value is not None:
            setattr(db_vehicle, field, value)

    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def delete_vehicle(db: Session, v_id: str) -> None:
    """Delete a vehicle by string v_id."""
    db_vehicle = get_vehicle_by_id(db, v_id)
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )
    db.delete(db_vehicle)
    db.commit()

