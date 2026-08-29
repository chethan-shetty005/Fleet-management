from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from pydantic import model_validator

class VehicleBase(BaseModel):
    v_id: Optional[str] = Field(None, example="VH001", description="Vehicle ID string identifier")
    license_plate: str = Field(..., min_length=2, max_length=20, example="KA01AB1234", description="License plate identifier")
    vin: Optional[str] = Field(None, description="Random 17-character VIN (auto-generated if not provided)")
    make: str = Field(..., min_length=1, max_length=50, example="Ford")
    model: str = Field(..., min_length=1, max_length=50, example="F-150")
    year: int = Field(..., ge=1900, le=2100, example=2023)
    vehicle_type: Optional[str] = Field(None, max_length=50, example="Tractor", description="Vehicle type identifier (e.g. Tractor, Earth Mover, Truck, etc.)")
    fuel_type: str = Field("Diesel", example="Diesel")  # Diesel, Gasoline, Electric, Hybrid
    status: str = Field("Active", example="Active")      # Active, Maintenance, Out of Service
    current_mileage: float = Field(0.0, ge=0.0, example=15000.5)

    @model_validator(mode='before')
    @classmethod
    def populate_aliases(cls, data):
        if isinstance(data, dict):
            if not data.get("license_plate") and data.get("number_plate"):
                data["license_plate"] = data.get("number_plate")
        return data

class VehicleCreate(VehicleBase):
    pass

class VehicleStatusUpdate(BaseModel):
    status: str = Field(..., example="Maintenance", description="Vehicle status (Active, Maintenance, Out of Service)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "Maintenance"
            }
        }
    )

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = Field(None, min_length=2, max_length=20, example="KA01AB1234")
    vin: Optional[str] = Field(None, description="VIN is immutable and cannot be updated or modified once created")
    make: Optional[str] = Field(None, min_length=1, max_length=50, example="Ford")
    model: Optional[str] = Field(None, min_length=1, max_length=50, example="F-150")
    year: Optional[int] = Field(None, ge=1900, le=2100, example=2023)
    vehicle_type: Optional[str] = Field(None, max_length=50, example="Earth Mover")
    fuel_type: Optional[str] = Field(None, example="Electric")
    status: Optional[str] = Field(None, example="Maintenance")
    current_mileage: Optional[float] = Field(None, ge=0.0, example=16000.0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "license_plate": "KA01AB9999",
                "make": "Caterpillar",
                "model": "D8T",
                "year": 2024,
                "vehicle_type": "Earth Mover",
                "fuel_type": "Diesel",
                "status": "Active",
                "current_mileage": 18500.0
            }
        }
    )

class VehicleResponse(VehicleBase):
    v_id: str
    license_plate: str
    id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


