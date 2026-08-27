from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class VehicleBase(BaseModel):
    vin: str = Field(..., min_length=17, max_length=17, description="17-character VIN")
    license_plate: str = Field(..., min_length=2, max_length=20, description="License plate identifier")
    make: str = Field(..., min_length=1, max_length=50, example="Ford")
    model: str = Field(..., min_length=1, max_length=50, example="F-150")
    year: int = Field(..., ge=1900, le=2100, example=2023)
    fuel_type: str = Field("Diesel", example="Diesel")  # Diesel, Gasoline, Electric, Hybrid
    status: str = Field("Active", example="Active")      # Active, Maintenance, Out of Service
    current_mileage: float = Field(0.0, ge=0.0, example=15000.5)

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    vin: Optional[str] = Field(None, min_length=17, max_length=17)
    license_plate: Optional[str] = Field(None, min_length=2, max_length=20)
    make: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    fuel_type: Optional[str] = None
    status: Optional[str] = None
    current_mileage: Optional[float] = Field(None, ge=0.0)

class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
