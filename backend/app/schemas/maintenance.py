from datetime import datetime, date
from typing import Optional, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_serializer

class MaintenanceBase(BaseModel):
    log_id: Optional[str] = Field(None, example="MNT-1001", description="String maintenance log identifier")
    vehicle_id: str = Field(..., description="Vehicle string ID (v_id) undergoing maintenance", example="VH001")
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
        return data

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    log_id: Optional[str] = Field(None, example="MNT-1001")
    vehicle_id: Optional[str] = Field(None, example="VH001")
    service_type: Optional[str] = Field(None, min_length=2, max_length=50, example="Oil Change")
    description: Optional[str] = Field(None, example="Routine maintenance")
    cost: Optional[float] = Field(None, ge=0.0, example=150.0)
    service_date: Optional[date] = Field(None)
    status: Optional[str] = Field(None, example="Completed")
    performed_by: Optional[str] = Field(None, example="Quick Lube")

    @model_validator(mode='before')
    @classmethod
    def populate_vehicle_alias(cls, data):
        if isinstance(data, dict):
            if not data.get("vehicle_id") and data.get("v_id"):
                data["vehicle_id"] = data.get("v_id")
        return data

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "log_id": "MNT-1001",
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
    id: Union[int, str] = Field(..., description="Maintenance log ID (serialized as string in response)")
    log_id: str = Field(..., description="Maintenance log string identifier")
    v_id: str
    created_at: datetime
    updated_at: datetime

    @field_serializer('id')
    def serialize_id(self, v: Union[int, str]) -> str:
        return str(v)

    @model_validator(mode='before')
    @classmethod
    def populate_log_id_fallback(cls, data):
        if hasattr(data, "__dict__") or isinstance(data, dict):
            raw_id = getattr(data, "id", None) if not isinstance(data, dict) else data.get("id")
            raw_log_id = getattr(data, "log_id", None) if not isinstance(data, dict) else data.get("log_id")
            
            final_log_id = raw_log_id or (f"MNT-{raw_id:04d}" if isinstance(raw_id, int) else str(raw_id or ""))
            
            if isinstance(data, dict):
                data["log_id"] = final_log_id
            else:
                if not getattr(data, "log_id", None):
                    setattr(data, "log_id", final_log_id)
        return data

    model_config = ConfigDict(from_attributes=True)

