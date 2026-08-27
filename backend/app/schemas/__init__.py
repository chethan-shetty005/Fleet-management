from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from app.schemas.analytics import FleetOverviewResponse

__all__ = [
    "VehicleCreate", "VehicleUpdate", "VehicleResponse",
    "TripCreate", "TripUpdate", "TripResponse",
    "MaintenanceCreate", "MaintenanceUpdate", "MaintenanceResponse",
    "FleetOverviewResponse"
]
