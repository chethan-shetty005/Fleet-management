from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator

ALLOWED_VEHICLE_TYPES = [
    "Pushcart",
    "EV Auto",
    "Tata Ace",
    "Tractor",
    "Refuse Compactor Vehicle"
]

ALLOWED_FUEL_TYPES = [
    "Petrol",
    "Diesel",
    "Electric Charge"
]

class VehicleBase(BaseModel):
    vehicle_code: Optional[str] = Field(None, example="VH001", description="Vehicle ID/code identifier")
    v_id: Optional[str] = Field(None, example="VH001", description="Alias for vehicle_code")
    vehicleNo: Optional[str] = Field(None, example="KA01AB1234", description="Vehicle registration number")
    license_plate: Optional[str] = Field(None, example="KA01AB1234", description="Alias for vehicleNo")
    brand: str = Field("Tata", example="Tata", description="Vehicle brand")
    make: Optional[str] = Field(None, example="Tata", description="Alias for brand")
    vehicleType: str = Field(..., example="Refuse Compactor Vehicle", description="Vehicle type")
    vehicle_type: Optional[str] = Field(None, example="Refuse Compactor Vehicle", description="Alias for vehicleType")
    fuelType: str = Field("Diesel", example="Electric Charge", description="Fuel type")
    fuel_type: Optional[str] = Field(None, example="Electric Charge", description="Alias for fuelType")
    serviceDueFreq: int = Field(30, ge=1, example=30, description="Service due frequency in days")
    service_due_freq: Optional[int] = Field(None, ge=1, description="Alias for serviceDueFreq")
    serviceDueKm: int = Field(5000, ge=0, example=5000, description="Service due distance in KM")
    service_due_km: Optional[int] = Field(None, ge=0, description="Alias for serviceDueKm")
    ward: int = Field(1, ge=0, example=7, description="Ward number")
    status: str = Field("Active", example="Active")

    vin: Optional[str] = Field(None, description="VIN number")
    model: Optional[str] = Field(None, description="Model description")
    year: Optional[int] = Field(2024, ge=1900, le=2100)
    current_mileage: float = Field(0.0, ge=0.0)

    @model_validator(mode='before')
    @classmethod
    def populate_aliases(cls, data):
        if isinstance(data, dict):
            # vehicle_code / v_id
            code = data.get("vehicle_code") or data.get("v_id")
            if code:
                data["vehicle_code"] = str(code)
                data["v_id"] = str(code)

            # vehicleNo / license_plate / number_plate
            no = data.get("vehicleNo") or data.get("license_plate") or data.get("number_plate")
            if no:
                data["vehicleNo"] = str(no)
                data["license_plate"] = str(no)

            # brand / make
            brand = data.get("brand") or data.get("make") or "Tata"
            data["brand"] = str(brand)
            data["make"] = str(brand)

            # vehicleType / vehicle_type / type / model
            vt = data.get("vehicleType") or data.get("vehicle_type") or data.get("type")
            if vt:
                data["vehicleType"] = str(vt)
                data["vehicle_type"] = str(vt)

            # fuelType / fuel_type
            ft = data.get("fuelType") or data.get("fuel_type")
            if ft:
                data["fuelType"] = str(ft)
                data["fuel_type"] = str(ft)

            # serviceDueFreq / service_due_freq
            freq = data.get("serviceDueFreq") if data.get("serviceDueFreq") is not None else data.get("service_due_freq")
            if freq is not None:
                try:
                    data["serviceDueFreq"] = int(freq)
                    data["service_due_freq"] = int(freq)
                except (ValueError, TypeError):
                    pass

            # serviceDueKm / service_due_km
            km = data.get("serviceDueKm") if data.get("serviceDueKm") is not None else data.get("service_due_km")
            if km is not None:
                try:
                    data["serviceDueKm"] = int(km)
                    data["service_due_km"] = int(km)
                except (ValueError, TypeError):
                    pass

            # ward
            if data.get("ward") is not None:
                try:
                    data["ward"] = int(data.get("ward"))
                except (ValueError, TypeError):
                    pass

        return data

class VehicleCreate(VehicleBase):
    @field_validator("vehicleType", mode="after")
    @classmethod
    def validate_vehicle_type(cls, v: str) -> str:
        if v not in ALLOWED_VEHICLE_TYPES:
            raise ValueError(f"Invalid vehicleType '{v}'. Allowed types: {', '.join(ALLOWED_VEHICLE_TYPES)}")
        return v

    @field_validator("fuelType", mode="after")
    @classmethod
    def validate_fuel_type(cls, v: str) -> str:
        if v not in ALLOWED_FUEL_TYPES:
            raise ValueError(f"Invalid fuelType '{v}'. Allowed fuel types: {', '.join(ALLOWED_FUEL_TYPES)}")
        return v

class VehicleStatusUpdate(BaseModel):
    status: str = Field(..., example="Maintenance", description="Vehicle status (Active, Inactive, Maintenance, Out of Service)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "Maintenance"
            }
        }
    )

class VehicleUpdate(BaseModel):
    vehicle_code: Optional[str] = Field(None)
    v_id: Optional[str] = Field(None)
    vehicleNo: Optional[str] = Field(None)
    license_plate: Optional[str] = Field(None)
    brand: Optional[str] = Field(None)
    make: Optional[str] = Field(None)
    vehicleType: Optional[str] = Field(None)
    vehicle_type: Optional[str] = Field(None)
    fuelType: Optional[str] = Field(None)
    fuel_type: Optional[str] = Field(None)
    serviceDueFreq: Optional[int] = Field(None, ge=1)
    service_due_freq: Optional[int] = Field(None, ge=1)
    serviceDueKm: Optional[int] = Field(None, ge=0)
    service_due_km: Optional[int] = Field(None, ge=0)
    ward: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None)
    current_mileage: Optional[float] = Field(None, ge=0.0)

    @model_validator(mode='before')
    @classmethod
    def populate_update_aliases(cls, data):
        if isinstance(data, dict):
            vt = data.get("vehicleType") or data.get("vehicle_type") or data.get("type")
            if vt:
                data["vehicleType"] = str(vt)
                data["vehicle_type"] = str(vt)
            ft = data.get("fuelType") or data.get("fuel_type")
            if ft:
                data["fuelType"] = str(ft)
                data["fuel_type"] = str(ft)
            brand = data.get("brand") or data.get("make")
            if brand:
                data["brand"] = str(brand)
                data["make"] = str(brand)
            code = data.get("vehicle_code") or data.get("v_id")
            if code:
                data["vehicle_code"] = str(code)
                data["v_id"] = str(code)
            no = data.get("vehicleNo") or data.get("license_plate")
            if no:
                data["vehicleNo"] = str(no)
                data["license_plate"] = str(no)
            freq = data.get("serviceDueFreq") if data.get("serviceDueFreq") is not None else data.get("service_due_freq")
            if freq is not None:
                data["serviceDueFreq"] = int(freq)
                data["service_due_freq"] = int(freq)
            km = data.get("serviceDueKm") if data.get("serviceDueKm") is not None else data.get("service_due_km")
            if km is not None:
                data["serviceDueKm"] = int(km)
                data["service_due_km"] = int(km)
        return data

    @field_validator("vehicleType", mode="after")
    @classmethod
    def validate_vehicle_type_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_VEHICLE_TYPES:
            raise ValueError(f"Invalid vehicleType '{v}'. Allowed types: {', '.join(ALLOWED_VEHICLE_TYPES)}")
        return v

    @field_validator("fuelType", mode="after")
    @classmethod
    def validate_fuel_type_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_FUEL_TYPES:
            raise ValueError(f"Invalid fuelType '{v}'. Allowed fuel types: {', '.join(ALLOWED_FUEL_TYPES)}")
        return v

class VehicleResponse(BaseModel):
    vehicle_code: str
    v_id: str
    vehicleNo: str
    license_plate: str
    brand: str
    make: str
    vehicleType: str
    vehicle_type: str
    fuelType: str
    fuel_type: str
    serviceDueFreq: int
    service_due_freq: int
    serviceDueKm: int
    service_due_km: int
    ward: int
    status: str
    current_mileage: float
    vin: Optional[str] = "VIN-AUTO-GENERATED"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)



