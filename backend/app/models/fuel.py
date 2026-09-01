from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class FuelRecord(Base):
    """
    FuelRecord ORM Model representing a fuel fill-up transaction in the database.
    """
    __tablename__ = "fuel_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    record_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    vehicle_no: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    fuel_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Diesel")
    liters: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
