from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.services import trip_service

router = APIRouter(prefix="/trips", tags=["Trips"])

@router.get("", response_model=List[TripResponse], status_code=status.HTTP_200_OK)
def list_trips(
    trip_number: Optional[str] = Query(None, description="Filter trips by string trip_number (e.g. KA-TRIP-1001)"),
    vehicle_id: Optional[str] = Query(None, description="Filter trips by vehicle string ID (v_id)"),
    v_id: Optional[str] = Query(None, description="Filter trips by vehicle string ID (v_id)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter trips by status (Scheduled, In Progress, Completed, Cancelled)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all trips with optional filtering by trip_number, vehicle, or status."""
    target_vehicle_id = v_id or vehicle_id
    return trip_service.get_trips(
        db,
        trip_number=trip_number,
        vehicle_id=target_vehicle_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit
    )

@router.get("/{trip_id}", response_model=TripResponse, status_code=status.HTTP_200_OK)
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific trip by string trip_number or ID string."""
    trip = trip_service.get_trip_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found."
        )
    return trip

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(trip_in: TripCreate, db: Session = Depends(get_db)):
    """Create/dispatch a new vehicle trip."""
    return trip_service.create_trip(db, trip_in)

@router.put("/{trip_id}", response_model=TripResponse, status_code=status.HTTP_200_OK)
@router.patch("/{trip_id}", response_model=TripResponse, status_code=status.HTTP_200_OK)
def update_trip(trip_id: str, trip_in: TripUpdate, db: Session = Depends(get_db)):
    """Update trip status, distance, or details (auto-updates vehicle mileage on completion)."""
    return trip_service.update_trip(db, trip_id, trip_in)

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: str, db: Session = Depends(get_db)):
    """Delete a trip record by trip_number or string ID."""
    trip_service.delete_trip(db, trip_id)
    return None
