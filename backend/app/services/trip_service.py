from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.trip import TripCreate, TripUpdate

def get_trips(
    db: Session,
    vehicle_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Trip]:
    """Retrieve all trips with optional filtering by string vehicle_id (v_id) or status."""
    query = select(Trip)
    if vehicle_id:
        query = query.where(Trip.vehicle_id == vehicle_id)
    if status_filter:
        query = query.where(Trip.status == status_filter)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query).all())

def get_trip_by_id(db: Session, trip_id: int) -> Optional[Trip]:
    """Retrieve a single trip by ID."""
    return db.get(Trip, trip_id)

def create_trip(db: Session, trip_in: TripCreate) -> Trip:
    """Dispatch/create a new trip after verifying assigned vehicle existence."""
    v_id = trip_in.vehicle_id or trip_in.v_id
    # Verify vehicle exists
    vehicle = db.get(Vehicle, v_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )

    # Check duplicate trip number
    existing_trip = db.scalar(select(Trip).where(Trip.trip_number == trip_in.trip_number))
    if existing_trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trip with trip_number '{trip_in.trip_number}' already exists."
        )

    trip_data = trip_in.model_dump()
    trip_data["vehicle_id"] = v_id
    if "v_id" in trip_data:
        del trip_data["v_id"]

    db_trip = Trip(**trip_data)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

def update_trip(db: Session, trip_id: int, trip_in: TripUpdate) -> Trip:
    """Update a trip record and automatically adjust vehicle current_mileage if completed."""
    db_trip = get_trip_by_id(db, trip_id)
    if not db_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found."
        )

    update_data = trip_in.model_dump(exclude_unset=True)

    new_v_id = update_data.get("vehicle_id") or update_data.get("v_id")
    if new_v_id:
        if new_v_id != db_trip.vehicle_id:
            vehicle = db.get(Vehicle, new_v_id)
            if not vehicle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vehicle with ID '{new_v_id}' not found."
                )
            update_data["vehicle_id"] = new_v_id
        else:
            update_data.pop("vehicle_id", None)
            
    if "v_id" in update_data:
        update_data.pop("v_id", None)

    # Check trip_number conflict if updated
    if "trip_number" in update_data:
        if update_data["trip_number"] != db_trip.trip_number:
            existing = db.scalar(select(Trip).where(Trip.trip_number == update_data["trip_number"]))
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Trip with trip_number '{update_data['trip_number']}' already exists."
                )
        else:
            update_data.pop("trip_number", None)

    old_status = db_trip.status
    old_distance = db_trip.distance_miles

    for field, value in update_data.items():
        if hasattr(db_trip, field) and value is not None:
            setattr(db_trip, field, value)

    # Business Logic Rule: When a trip is marked Completed, update vehicle mileage
    new_status = db_trip.status
    new_distance = db_trip.distance_miles
    if new_status == "Completed":
        vehicle = db.get(Vehicle, db_trip.vehicle_id)
        if vehicle:
            # If transitioned from non-completed to completed, add distance
            if old_status != "Completed":
                vehicle.current_mileage += new_distance
            # If distance changed while completed, update delta
            elif new_distance != old_distance:
                vehicle.current_mileage += (new_distance - old_distance)

    db.commit()
    db.refresh(db_trip)
    return db_trip

def delete_trip(db: Session, trip_id: int) -> None:
    """Delete a trip by ID."""
    db_trip = get_trip_by_id(db, trip_id)
    if not db_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found."
        )
    db.delete(db_trip)
    db.commit()

