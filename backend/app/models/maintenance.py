from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class MaintenanceLog(Base):
    """
    MaintenanceLog ORM Model representing vehicle service and repair logs.
    """
    __tablename__ = "maintenance_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[str] = mapped_column(String(50), ForeignKey("vehicles.v_id", ondelete="CASCADE"), nullable=False)
    
    @property
    def v_id(self) -> str:
        return self.vehicle_id

    @v_id.setter
    def v_id(self, value: str):
        self.vehicle_id = value
    
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Oil Change, Tire Rotation, Brake Service, Engine Repair, Inspection
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Scheduled")  # Scheduled, In Progress, Completed
    performed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to Vehicle
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="maintenance_logs")
