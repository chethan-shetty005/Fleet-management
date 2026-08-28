from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_serializer

class TripBase(BaseModel):
    trip_number: str = Field(..., min_length=3, max_length=30, example="KA-TRIP-1001", description="Unique trip identifier string")
    vehicle_id: str = Field(..., description="String vehicle ID (v_id) used for this trip", example="VH001")
    v_id: Optional[str] = Field(None, description="Alias for vehicle_id", example="VH001")
    start_location: str = Field(..., example="Bengaluru Freight Hub")
    end_location: str = Field(..., example="Chennai Logistics Yard")
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = Field("Scheduled", example="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    distance_km: float = Field(0.0, ge=0.0, example=345.0, description="Trip distance in kilometers")
    fuel_consumed_liters: float = Field(0.0, ge=0.0, example=45.0, description="Fuel consumed in liters")

    @model_validator(mode='before')
    @classmethod
    def populate_aliases_and_units(cls, data):
        if isinstance(data, dict):
            # Map vehicle aliases
            if not data.get("vehicle_id") and data.get("v_id"):
                data["vehicle_id"] = data.get("v_id")
            elif not data.get("v_id") and data.get("vehicle_id"):
                data["v_id"] = data.get("vehicle_id")
            # Map unit aliases for backward compatibility
            if "distance_km" not in data and "distance_miles" in data:
                data["distance_km"] = data.get("distance_miles")
            if "fuel_consumed_liters" not in data and "fuel_consumed_gallons" in data:
                data["fuel_consumed_liters"] = data.get("fuel_consumed_gallons")
        return data

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    trip_number: Optional[str] = Field(None, min_length=3, max_length=30, example="KA-TRIP-1001")
    vehicle_id: Optional[str] = Field(None, example="VH001")
    v_id: Optional[str] = Field(None, example="VH001")
    start_location: Optional[str] = Field(None, example="Bengaluru Freight Hub")
    end_location: Optional[str] = Field(None, example="Chennai Logistics Yard")
    start_time: Optional[datetime] = Field(None)
    end_time: Optional[datetime] = Field(None)
    status: Optional[str] = Field(None, example="Completed")
    distance_km: Optional[float] = Field(None, ge=0.0, example=345.0)
    fuel_consumed_liters: Optional[float] = Field(None, ge=0.0, example=45.0)

    @model_validator(mode='before')
    @classmethod
    def populate_update_units(cls, data):
        if isinstance(data, dict):
            if "distance_km" not in data and "distance_miles" in data:
                data["distance_km"] = data.get("distance_miles")
            if "fuel_consumed_liters" not in data and "fuel_consumed_gallons" in data:
                data["fuel_consumed_liters"] = data.get("fuel_consumed_gallons")
        return data

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "trip_number": "KA-TRIP-1001",
                "vehicle_id": "VH001",
                "start_location": "Bengaluru Freight Hub",
                "end_location": "Chennai Logistics Yard",
                "status": "Completed",
                "distance_km": 345.0,
                "fuel_consumed_liters": 45.0
            }
        }
    )

class TripResponse(TripBase):
    id: Union[int, str] = Field(..., description="Trip primary key ID (serialized as string in response)")
    trip_id: str = Field(..., description="Trip string identifier (trip_number string or ID)")
    v_id: str
    created_at: datetime
    updated_at: datetime

    @field_serializer('id')
    def serialize_id(self, v: Union[int, str]) -> str:
        return str(v)

    model_config = ConfigDict(from_attributes=True)

