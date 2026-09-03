from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, ALLOWED_VEHICLE_TYPES, ALLOWED_FUEL_TYPES

import uuid
import random
import string

def generate_vin() -> str:
    """Generate a random 17-character uppercase alphanumeric VIN string."""
    allowed_chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
    return "".join(random.choices(allowed_chars, k=17))

def get_vehicles(
    db: Session,
    vehicle_code: Optional[str] = None,
    v_id: Optional[str] = None,
    vehicleNo: Optional[str] = None,
    license_plate: Optional[str] = None,
    number_plate: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    vehicleType: Optional[str] = None,
    fuel_type: Optional[str] = None,
    fuelType: Optional[str] = None,
    ward: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """Retrieve vehicles with filtering by vehicle_code, vehicleNo, vehicleType, fuelType, ward, or status and pagination."""
    query = select(Vehicle)
    target_code = vehicle_code or v_id
    if target_code:
        query = query.where(Vehicle.v_id.ilike(f"%{target_code}%"))
    target_plate = vehicleNo or license_plate or number_plate
    if target_plate:
        query = query.where(Vehicle.license_plate.ilike(f"%{target_plate}%"))
    target_type = vehicleType or vehicle_type
    if target_type:
        query = query.where(Vehicle.vehicle_type.ilike(f"%{target_type}%"))
    target_fuel = fuelType or fuel_type
    if target_fuel:
        query = query.where(Vehicle.fuel_type.ilike(f"%{target_fuel}%"))
    if ward is not None:
        query = query.where(Vehicle.ward == ward)
    if status_filter:
        query = query.where(Vehicle.status == status_filter)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query).all())

def get_vehicle_by_id(db: Session, v_id: str) -> Optional[Vehicle]:
    """Retrieve a single vehicle by its string primary key v_id or vehicle_code."""
    return db.get(Vehicle, v_id)

def create_vehicle(db: Session, vehicle_in: VehicleCreate) -> Vehicle:
    """Create a new vehicle record with strict domain validation and v_id/license_plate uniqueness checks."""
    v_id = vehicle_in.vehicle_code or vehicle_in.v_id or f"VH-{uuid.uuid4().hex[:6].upper()}"
    license_plate = vehicle_in.vehicleNo or vehicle_in.license_plate
    brand = vehicle_in.brand or vehicle_in.make or "Tata"
    vehicle_type = vehicle_in.vehicleType or vehicle_in.vehicle_type or "Refuse Compactor Vehicle"
    fuel_type = vehicle_in.fuelType or vehicle_in.fuel_type or "Diesel"
    service_due_freq = vehicle_in.serviceDueFreq if vehicle_in.serviceDueFreq is not None else (vehicle_in.service_due_freq or 30)
    service_due_km = vehicle_in.serviceDueKm if vehicle_in.serviceDueKm is not None else (vehicle_in.service_due_km or 5000)
    ward = vehicle_in.ward if vehicle_in.ward is not None else 1
    vin = vehicle_in.vin or generate_vin()

    if not license_plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle registration number (license plate / vehicleNo) is required."
        )

    # Server-side validation for allowed vehicle types
    if vehicle_type not in ALLOWED_VEHICLE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid vehicleType '{vehicle_type}'. Allowed types: {', '.join(ALLOWED_VEHICLE_TYPES)}"
        )

    # Server-side validation for allowed fuel types
    if fuel_type not in ALLOWED_FUEL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid fuelType '{fuel_type}'. Allowed fuel types: {', '.join(ALLOWED_FUEL_TYPES)}"
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
        brand=brand,
        make=brand,
        model=vehicle_type,
        year=vehicle_in.year or 2024,
        vin=vin,
        vehicle_type=vehicle_type,
        fuel_type=fuel_type,
        service_due_freq=service_due_freq,
        service_due_km=service_due_km,
        ward=ward,
        status=vehicle_in.status or "Active",
        current_mileage=vehicle_in.current_mileage or 0.0
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def update_vehicle(db: Session, v_id: str, vehicle_in: VehicleUpdate) -> Vehicle:
    """Update an existing vehicle record using string v_id."""
    db_vehicle = get_vehicle_by_id(db, v_id)
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )

    update_data = vehicle_in.model_dump(exclude_unset=True)

    # Validate vehicle_type if present in update
    vt = update_data.get("vehicleType") or update_data.get("vehicle_type")
    if vt:
        if vt not in ALLOWED_VEHICLE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid vehicleType '{vt}'. Allowed types: {', '.join(ALLOWED_VEHICLE_TYPES)}"
            )
        db_vehicle.vehicle_type = vt
        db_vehicle.model = vt

    # Validate fuel_type if present in update
    ft = update_data.get("fuelType") or update_data.get("fuel_type")
    if ft:
        if ft not in ALLOWED_FUEL_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid fuelType '{ft}'. Allowed fuel types: {', '.join(ALLOWED_FUEL_TYPES)}"
            )
        db_vehicle.fuel_type = ft

    if "brand" in update_data and update_data["brand"]:
        db_vehicle.brand = update_data["brand"]
        db_vehicle.make = update_data["brand"]
    elif "make" in update_data and update_data["make"]:
        db_vehicle.brand = update_data["make"]
        db_vehicle.make = update_data["make"]

    new_plate = update_data.get("vehicleNo") or update_data.get("license_plate") or update_data.get("number_plate")
    if new_plate and new_plate != db_vehicle.license_plate:
        existing = db.scalar(select(Vehicle).where(Vehicle.license_plate == new_plate))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with license plate '{new_plate}' already exists."
            )
        db_vehicle.license_plate = new_plate

    if "serviceDueFreq" in update_data and update_data["serviceDueFreq"] is not None:
        db_vehicle.service_due_freq = update_data["serviceDueFreq"]
    elif "service_due_freq" in update_data and update_data["service_due_freq"] is not None:
        db_vehicle.service_due_freq = update_data["service_due_freq"]

    if "serviceDueKm" in update_data and update_data["serviceDueKm"] is not None:
        db_vehicle.service_due_km = update_data["serviceDueKm"]
    elif "service_due_km" in update_data and update_data["service_due_km"] is not None:
        db_vehicle.service_due_km = update_data["service_due_km"]

    if "ward" in update_data and update_data["ward"] is not None:
        db_vehicle.ward = update_data["ward"]

    if "status" in update_data and update_data["status"]:
        db_vehicle.status = update_data["status"]

    if "current_mileage" in update_data and update_data["current_mileage"] is not None:
        db_vehicle.current_mileage = update_data["current_mileage"]

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


