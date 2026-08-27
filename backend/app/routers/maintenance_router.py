from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from app.services import maintenance_service

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("", response_model=List[MaintenanceResponse], status_code=status.HTTP_200_OK)
def list_maintenance_logs(
    vehicle_id: Optional[int] = Query(None, description="Filter logs by vehicle ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter logs by status (Scheduled, In Progress, Completed)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all maintenance logs with optional vehicle or status filter."""
    return maintenance_service.get_maintenance_logs(db, vehicle_id=vehicle_id, status_filter=status_filter, skip=skip, limit=limit)

@router.get("/{log_id}", response_model=MaintenanceResponse, status_code=status.HTTP_200_OK)
def get_maintenance_log(log_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific maintenance log."""
    log = maintenance_service.get_maintenance_log_by_id(db, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance log with ID {log_id} not found."
        )
    return log

@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(log_in: MaintenanceCreate, db: Session = Depends(get_db)):
    """Create a new vehicle maintenance service record."""
    return maintenance_service.create_maintenance_log(db, log_in)

@router.put("/{log_id}", response_model=MaintenanceResponse, status_code=status.HTTP_200_OK)
def update_maintenance_log(log_id: int, log_in: MaintenanceUpdate, db: Session = Depends(get_db)):
    """Update maintenance log details or progress."""
    return maintenance_service.update_maintenance_log(db, log_id, log_in)

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_log(log_id: int, db: Session = Depends(get_db)):
    """Delete a maintenance log record."""
    maintenance_service.delete_maintenance_log(db, log_id)
    return None
