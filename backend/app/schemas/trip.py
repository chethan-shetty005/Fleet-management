from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from pydantic import model_validator

class TripBase(BaseModel):
    trip_number: str = Field(..., min_length=3, max_length=30, example="TRIP-1001")
    vehicle_id: str = Field(..., description="String vehicle ID (v_id) used for this trip", example="VH001")
    v_id: Optional[str] = Field(None, description="Alias for vehicle_id", example="VH001")
    start_location: str = Field(..., example="Warehouse A (Chicago)")
    end_location: str = Field(..., example="Distribution Center B (Detroit)")
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = Field("Scheduled", example="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    distance_miles: float = Field(0.0, ge=0.0, example=280.5)
    fuel_consumed_gallons: float = Field(0.0, ge=0.0, example=22.4)

    @model_validator(mode='before')
    @classmethod
    def populate_vehicle_alias(cls, data):
        if isinstance(data, dict):
            if not data.get("vehicle_id") and data.get("v_id"):
                data["vehicle_id"] = data.get("v_id")
            elif not data.get("v_id") and data.get("vehicle_id"):
                data["v_id"] = data.get("vehicle_id")
        return data

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    trip_number: Optional[str] = Field(None, min_length=3, max_length=30, example="TRIP-1001")
    vehicle_id: Optional[str] = Field(None, example="VH001")
    v_id: Optional[str] = Field(None, example="VH001")
    start_location: Optional[str] = Field(None, example="Depot A")
    end_location: Optional[str] = Field(None, example="Depot B")
    start_time: Optional[datetime] = Field(None)
    end_time: Optional[datetime] = Field(None)
    status: Optional[str] = Field(None, example="Completed")
    distance_miles: Optional[float] = Field(None, ge=0.0, example=120.0)
    fuel_consumed_gallons: Optional[float] = Field(None, ge=0.0, example=15.0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "trip_number": "TRIP-1001",
                "vehicle_id": "VH001",
                "start_location": "Chicago Hub",
                "end_location": "Detroit Depot",
                "status": "Completed",
                "distance_miles": 280.5,
                "fuel_consumed_gallons": 22.0
            }
        }
    )

class TripResponse(TripBase):
    id: int
    v_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

