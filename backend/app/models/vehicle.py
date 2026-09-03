from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class Vehicle(Base):
    """
    Vehicle ORM Model representing a fleet vehicle entity in the SQL database.
    Supports WASTRAQ vehicle domain fields.
    """
    __tablename__ = "vehicles"

    v_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    license_plate: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(50), nullable=False, default="Tata")
    make: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=2024)
    vin: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Refuse Compactor Vehicle")
    fuel_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Diesel")
    service_due_freq: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    service_due_km: Mapped[int] = mapped_column(Integer, nullable=False, default=5000)
    ward: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")  # Active, Inactive, Maintenance, Out of Service
    current_mileage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def vehicle_code(self) -> str:
        return self.v_id

    @vehicle_code.setter
    def vehicle_code(self, value: str):
        self.v_id = value

    @property
    def id(self) -> str:
        return self.v_id

    @id.setter
    def id(self, value: str):
        self.v_id = value

    @property
    def vehicleNo(self) -> str:
        return self.license_plate

    @vehicleNo.setter
    def vehicleNo(self, value: str):
        self.license_plate = value

    @property
    def number_plate(self) -> str:
        return self.license_plate

    @number_plate.setter
    def number_plate(self, value: str):
        self.license_plate = value

    @property
    def vehicleType(self) -> str:
        return self.vehicle_type

    @vehicleType.setter
    def vehicleType(self, value: str):
        self.vehicle_type = value

    @property
    def fuelType(self) -> str:
        return self.fuel_type

    @fuelType.setter
    def fuelType(self, value: str):
        self.fuel_type = value

    @property
    def serviceDueFreq(self) -> int:
        return self.service_due_freq

    @serviceDueFreq.setter
    def serviceDueFreq(self, value: int):
        self.service_due_freq = value

    @property
    def serviceDueKm(self) -> int:
        return self.service_due_km

    @serviceDueKm.setter
    def serviceDueKm(self, value: int):
        self.service_due_km = value

    # Relationships
    trips: Mapped[List["Trip"]] = relationship(
        "Trip",
        back_populates="vehicle",
        cascade="all, delete-orphan"
    )
    maintenance_logs: Mapped[List["MaintenanceLog"]] = relationship(
        "MaintenanceLog",
        back_populates="vehicle",
        cascade="all, delete-orphan"
    )

