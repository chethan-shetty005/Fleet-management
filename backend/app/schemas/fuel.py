from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class FuelRecordBase(BaseModel):
    date: Optional[str] = None
    vehicleNo: str = Field(..., alias="vehicleNo")
    fuelType: str = Field("Diesel", alias="fuelType")
    liters: float = Field(..., gt=0)
    amount: float = Field(..., gt=0)

    class Config:
        populate_by_name = True

class FuelRecordCreate(FuelRecordBase):
    id: Optional[str] = None

class FuelRecordResponse(FuelRecordBase):
    id: str
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
