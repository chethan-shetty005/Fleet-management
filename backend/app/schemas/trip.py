from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class TripBase(BaseModel):
    trip_number: str = Field(..., min_length=3, max_length=30, example="TRIP-1001")
    vehicle_id: int = Field(..., description="ID of the vehicle used for this trip")
    start_location: str = Field(..., example="Warehouse A (Chicago)")
    end_location: str = Field(..., example="Distribution Center B (Detroit)")
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = Field("Scheduled", example="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    distance_miles: float = Field(0.0, ge=0.0, example=280.5)
    fuel_consumed_gallons: float = Field(0.0, ge=0.0, example=22.4)

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    trip_number: Optional[str] = Field(None, min_length=3, max_length=30)
    vehicle_id: Optional[int] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    distance_miles: Optional[float] = Field(None, ge=0.0)
    fuel_consumed_gallons: Optional[float] = Field(None, ge=0.0)

class TripResponse(TripBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
