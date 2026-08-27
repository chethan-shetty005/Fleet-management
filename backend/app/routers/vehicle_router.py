from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services import vehicle_service

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.get("", response_model=List[VehicleResponse], status_code=status.HTTP_200_OK)
def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter vehicles by status (Active, Maintenance, Out of Service)"),
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit size"),
    db: Session = Depends(get_db)
):
    """List all vehicles with optional status filtering and pagination."""
    return vehicle_service.get_vehicles(db, status_filter=status_filter, skip=skip, limit=limit)

@router.get("/{vehicle_id}", response_model=VehicleResponse, status_code=status.HTTP_200_OK)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Retrieve a single vehicle by ID."""
    vehicle = vehicle_service.get_vehicle_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {vehicle_id} not found."
        )
    return vehicle

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_in: VehicleCreate, db: Session = Depends(get_db)):
    """Add a new vehicle to the fleet."""
    return vehicle_service.create_vehicle(db, vehicle_in)

@router.put("/{vehicle_id}", response_model=VehicleResponse, status_code=status.HTTP_200_OK)
def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db: Session = Depends(get_db)):
    """Update an existing vehicle's information, status, or mileage."""
    return vehicle_service.update_vehicle(db, vehicle_id, vehicle_in)

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Delete a vehicle record from the database."""
    vehicle_service.delete_vehicle(db, vehicle_id)
    return None
