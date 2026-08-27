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
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    
    start_location: Mapped[str] = mapped_column(String(100), nullable=False)
    end_location: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    distance_miles: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fuel_consumed_gallons: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to Vehicle
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
