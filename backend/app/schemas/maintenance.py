from datetime import datetime, date
from typing import Optional, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_serializer

class MaintenanceBase(BaseModel):
    log_id: Optional[str] = Field(None, example="MNT-1001", description="String maintenance log identifier")
    v_id: str = Field(..., description="Vehicle string ID (v_id) undergoing maintenance", example="VH001")
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
            if "v_id" not in data and "vehicle_id" in data:
                data["v_id"] = data.pop("vehicle_id")
        return data

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    log_id: Optional[str] = Field(None, description="Optional log_id update")
    v_id: Optional[str] = Field(None, description="Optional v_id update")
    service_type: Optional[str] = Field(None, min_length=2, max_length=50, description="Optional service_type update")
    description: Optional[str] = Field(None, description="Optional description update")
    cost: Optional[float] = Field(None, ge=0.0, description="Optional cost update")
    service_date: Optional[date] = Field(None, description="Optional service_date update")
    status: Optional[str] = Field(None, description="Optional status update")
    performed_by: Optional[str] = Field(None, description="Optional performed_by update")

    @model_validator(mode='before')
    @classmethod
    def populate_vehicle_alias(cls, data):
        if isinstance(data, dict):
            if "v_id" not in data and "vehicle_id" in data:
                data["v_id"] = data.pop("vehicle_id")
        return data

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "Completed"
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
                if "v_id" not in data and "vehicle_id" in data:
                    data["v_id"] = data.get("vehicle_id")
            else:
                if not getattr(data, "log_id", None):
                    setattr(data, "log_id", final_log_id)
        return data

    model_config = ConfigDict(from_attributes=True)

