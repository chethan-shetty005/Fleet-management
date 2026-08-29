from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceStatusUpdate, MaintenanceResponse
from app.services import maintenance_service

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("", response_model=List[MaintenanceResponse], status_code=status.HTTP_200_OK)
def list_maintenance_logs(
    log_id: Optional[str] = Query(None, description="Filter logs by string log_id (e.g. MNT-1001)"),
    vehicle_id: Optional[str] = Query(None, description="Filter logs by vehicle string ID (v_id)"),
    v_id: Optional[str] = Query(None, description="Filter logs by vehicle string ID (v_id)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter logs by status (Scheduled, In Progress, Completed)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all maintenance logs with optional log_id, vehicle, or status filter."""
    target_vehicle_id = v_id or vehicle_id
    return maintenance_service.get_maintenance_logs(
        db,
        log_id=log_id,
        vehicle_id=target_vehicle_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit
    )

@router.get("/{log_id}", response_model=MaintenanceResponse, status_code=status.HTTP_200_OK)
def get_maintenance_log(log_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific maintenance log by string log_id or numeric ID string."""
    log = maintenance_service.get_maintenance_log_by_id(db, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance log '{log_id}' not found."
        )
    return log

@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(log_in: MaintenanceCreate, db: Session = Depends(get_db)):
    """Create a new vehicle maintenance service record."""
    return maintenance_service.create_maintenance_log(db, log_in)

@router.put("/{log_id}", response_model=MaintenanceResponse, status_code=status.HTTP_200_OK)
def update_maintenance_status(log_id: str, status_in: MaintenanceStatusUpdate, db: Session = Depends(get_db)):
    """Update maintenance log status ONLY (Scheduled, In Progress, Completed)."""
    return maintenance_service.update_maintenance_log(db, log_id, MaintenanceUpdate(status=status_in.status))

@router.patch("/{log_id}", response_model=MaintenanceResponse, status_code=status.HTTP_200_OK)
def patch_maintenance_log(log_id: str, log_in: MaintenanceUpdate, db: Session = Depends(get_db)):
    """Patch/alter any created maintenance log fields (retains previous data for unprovided fields)."""
    return maintenance_service.update_maintenance_log(db, log_id, log_in)

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_log(log_id: str, db: Session = Depends(get_db)):
    """Delete a maintenance log record by log_id or ID."""
    maintenance_service.delete_maintenance_log(db, log_id)
    return None
