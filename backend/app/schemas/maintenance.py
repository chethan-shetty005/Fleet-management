from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from pydantic import model_validator

class MaintenanceBase(BaseModel):
    vehicle_id: str = Field(..., description="String vehicle ID (v_id) undergoing maintenance", example="VH001")
    v_id: Optional[str] = Field(None, description="Alias for vehicle_id", example="VH001")
    service_type: str = Field(..., min_length=2, max_length=50, example="Oil Change")
    description: Optional[str] = Field(None, example="Routine synthetic oil change and filter replacement")
    cost: float = Field(0.0, ge=0.0, example=150.0)
    service_date: date = Field(default_factory=date.today)
    status: str = Field("Scheduled", example="Scheduled")  # Scheduled, In Progress, Completed
    performed_by: Optional[str] = Field(None, example="Quick Lube Center")

    @model_validator(mode='before')
    @classmethod
    def populate_vehicle_alias(cls, data):
        if isinstance(data, dict):
            if not data.get("vehicle_id") and data.get("v_id"):
                data["vehicle_id"] = data.get("v_id")
            elif not data.get("v_id") and data.get("vehicle_id"):
                data["v_id"] = data.get("vehicle_id")
        return data

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    vehicle_id: Optional[str] = Field(None, example="VH001")
    v_id: Optional[str] = Field(None, example="VH001")
    service_type: Optional[str] = Field(None, min_length=2, max_length=50, example="Oil Change")
    description: Optional[str] = Field(None, example="Routine maintenance")
    cost: Optional[float] = Field(None, ge=0.0, example=150.0)
    service_date: Optional[date] = Field(None)
    status: Optional[str] = Field(None, example="Completed")
    performed_by: Optional[str] = Field(None, example="Quick Lube")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "VH001",
                "service_type": "Engine Repair",
                "description": "Routine synthetic oil change and injector check",
                "cost": 350.0,
                "status": "Completed",
                "performed_by": "Fleet Care Services"
            }
        }
    )

class MaintenanceResponse(MaintenanceBase):
    id: int
    v_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

