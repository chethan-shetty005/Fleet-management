from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class MaintenanceBase(BaseModel):
    vehicle_id: int = Field(..., description="ID of the vehicle undergoing maintenance")
    service_type: str = Field(..., min_length=2, max_length=50, example="Oil Change")
    description: Optional[str] = Field(None, example="Routine synthetic oil change and filter replacement")
    cost: float = Field(0.0, ge=0.0, example=150.0)
    service_date: date = Field(default_factory=date.today)
    status: str = Field("Scheduled", example="Scheduled")  # Scheduled, In Progress, Completed
    performed_by: Optional[str] = Field(None, example="Quick Lube Center")

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    service_type: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    cost: Optional[float] = Field(None, ge=0.0)
    service_date: Optional[date] = None
    status: Optional[str] = None
    performed_by: Optional[str] = None

class MaintenanceResponse(MaintenanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
