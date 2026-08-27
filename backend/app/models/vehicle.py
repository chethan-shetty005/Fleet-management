from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class Vehicle(Base):
    """
    Vehicle ORM Model representing a fleet vehicle entity in the SQL database.
    """
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vin: Mapped[str] = mapped_column(String(17), unique=True, index=True, nullable=False)
    license_plate: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    make: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Diesel")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")  # Active, Maintenance, Out of Service
    current_mileage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
