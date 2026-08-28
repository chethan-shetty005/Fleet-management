from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.maintenance import MaintenanceLog
from app.models.vehicle import Vehicle
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate

def get_maintenance_logs(
    db: Session,
    vehicle_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[MaintenanceLog]:
    """Retrieve all maintenance logs with optional string vehicle_id (v_id) or status filter."""
    query = select(MaintenanceLog)
    if vehicle_id:
        query = query.where(MaintenanceLog.vehicle_id == vehicle_id)
    if status_filter:
        query = query.where(MaintenanceLog.status == status_filter)
    query = query.offset(skip).limit(limit)
    return list(db.scalars(query).all())

def get_maintenance_log_by_id(db: Session, log_id: int) -> Optional[MaintenanceLog]:
    """Retrieve a single maintenance log by ID."""
    return db.get(MaintenanceLog, log_id)

def create_maintenance_log(db: Session, log_in: MaintenanceCreate) -> MaintenanceLog:
    """Create a new maintenance log record for a vehicle."""
    v_id = log_in.vehicle_id or log_in.v_id
    vehicle = db.get(Vehicle, v_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{v_id}' not found."
        )

    log_data = log_in.model_dump()
    log_data["vehicle_id"] = v_id
    if "v_id" in log_data:
        del log_data["v_id"]

    db_log = MaintenanceLog(**log_data)
    
    # Business Logic Rule: If maintenance is "In Progress", set vehicle status to "Maintenance"
    if db_log.status == "In Progress":
        vehicle.status = "Maintenance"

    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def update_maintenance_log(db: Session, log_id: int, log_in: MaintenanceUpdate) -> MaintenanceLog:
    """Update a maintenance log record and adjust vehicle status if maintenance completes."""
    db_log = get_maintenance_log_by_id(db, log_id)
    if not db_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance log with ID {log_id} not found."
        )

    update_data = log_in.model_dump(exclude_unset=True)

    new_v_id = update_data.get("vehicle_id") or update_data.get("v_id")
    if new_v_id:
        update_data["vehicle_id"] = new_v_id
        if "v_id" in update_data:
            del update_data["v_id"]

    for field, value in update_data.items():
        if hasattr(db_log, field):
            setattr(db_log, field, value)

    # Business logic status coordination
    vehicle = db.get(Vehicle, db_log.vehicle_id)
    if vehicle:
        if db_log.status == "In Progress":
            vehicle.status = "Maintenance"
        elif db_log.status == "Completed" and vehicle.status == "Maintenance":
            vehicle.status = "Active"

    db.commit()
    db.refresh(db_log)
    return db_log

def delete_maintenance_log(db: Session, log_id: int) -> None:
    """Delete a maintenance log by ID."""
    db_log = get_maintenance_log_by_id(db, log_id)
    if not db_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance log with ID {log_id} not found."
        )
    db.delete(db_log)
    db.commit()

