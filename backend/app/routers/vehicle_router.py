from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleStatusUpdate, VehicleResponse
from app.services import vehicle_service

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.get("", response_model=List[VehicleResponse], status_code=status.HTTP_200_OK)
def list_vehicles(
    vehicle_code: Optional[str] = Query(None, description="Search or filter vehicles by vehicle code/ID"),
    v_id: Optional[str] = Query(None, description="Filter vehicles by vehicle string ID (v_id)"),
    vehicleNo: Optional[str] = Query(None, description="Search or filter vehicles by vehicle registration number"),
    license_plate: Optional[str] = Query(None, description="Search or filter vehicles by license plate"),
    number_plate: Optional[str] = Query(None, include_in_schema=False, description="Legacy alias for license_plate"),
    vehicleType: Optional[str] = Query(None, description="Filter vehicles by vehicle type (Pushcart, EV Auto, Tata Ace, Tractor, Refuse Compactor Vehicle)"),
    vehicle_type: Optional[str] = Query(None, description="Alias for vehicleType"),
    fuelType: Optional[str] = Query(None, description="Filter vehicles by fuel type (Petrol, Diesel, Electric Charge)"),
    fuel_type: Optional[str] = Query(None, description="Alias for fuelType"),
    ward: Optional[int] = Query(None, description="Filter vehicles by ward number"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter vehicles by status (Active, Inactive, Maintenance, Out of Service)"),
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit size"),
    db: Session = Depends(get_db)
):
    """List all vehicles with optional vehicle_code, vehicleNo, vehicleType, fuelType, ward, status filtering and pagination."""
    return vehicle_service.get_vehicles(
        db,
        vehicle_code=vehicle_code,
        v_id=v_id,
        vehicleNo=vehicleNo,
        license_plate=license_plate,
        number_plate=number_plate,
        vehicle_type=vehicle_type,
        vehicleType=vehicleType,
        fuel_type=fuel_type,
        fuelType=fuelType,
        ward=ward,
        status_filter=status_filter,
        skip=skip,
        limit=limit
    )

@router.get("/{v_id}", response_model=VehicleResponse, status_code=status.HTTP_200_OK)
def get_vehicle(v_id: str, db: Session = Depends(get_db)):
    """Retrieve a single vehicle by its string ID (v_id or vehicle_code)."""
    vehicle = vehicle_service.get_vehicle_by_id(db, v_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )
    return vehicle

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_in: VehicleCreate, db: Session = Depends(get_db)):
    """Add a new vehicle to the fleet."""
    return vehicle_service.create_vehicle(db, vehicle_in)

@router.put("/{v_id}", response_model=VehicleResponse, status_code=status.HTTP_200_OK)
def update_vehicle_status(v_id: str, status_in: VehicleStatusUpdate, db: Session = Depends(get_db)):
    """Update vehicle status ONLY (Active, Inactive, Maintenance, Out of Service)."""
    return vehicle_service.update_vehicle(db, v_id, VehicleUpdate(status=status_in.status))

@router.patch("/{v_id}", response_model=VehicleResponse, status_code=status.HTTP_200_OK)
def patch_vehicle(v_id: str, vehicle_in: VehicleUpdate, db: Session = Depends(get_db)):
    """Patch/alter any created vehicle fields (retains previous data for unprovided fields)."""
    return vehicle_service.update_vehicle(db, v_id, vehicle_in)

@router.delete("/{v_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(v_id: str, db: Session = Depends(get_db)):
    """Delete a vehicle record from the database."""
    vehicle_service.delete_vehicle(db, v_id)
    return None

