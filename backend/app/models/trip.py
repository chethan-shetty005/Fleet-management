from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class Trip(Base):
    """
    Trip ORM Model representing a vehicle trip/dispatch operation.
    """
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trip_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    vehicle_id: Mapped[str] = mapped_column(String(50), ForeignKey("vehicles.v_id", ondelete="CASCADE"), nullable=False)
    
    @property
    def v_id(self) -> str:
        return self.vehicle_id

    @v_id.setter
    def v_id(self, value: str):
        self.vehicle_id = value

    @property
    def trip_id(self) -> str:
        return self.trip_number or str(self.id)
    
    start_location: Mapped[str] = mapped_column(String(100), nullable=False)
    end_location: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fuel_consumed_liters: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    @property
    def distance_miles(self) -> float:
        return self.distance_km

    @distance_miles.setter
    def distance_miles(self, value: float):
        self.distance_km = value

    @property
    def fuel_consumed_gallons(self) -> float:
        return self.fuel_consumed_liters

    @fuel_consumed_gallons.setter
    def fuel_consumed_gallons(self, value: float):
        self.fuel_consumed_liters = value
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to Vehicle
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
