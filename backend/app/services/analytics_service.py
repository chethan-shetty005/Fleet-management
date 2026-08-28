from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog
from app.schemas.analytics import FleetOverviewResponse

def get_fleet_overview(db: Session) -> FleetOverviewResponse:
    """
    Calculate and aggregate total fleet performance metrics for dashboard KPI cards.
    """
    # Vehicles metrics
    total_vehicles = db.scalar(select(func.count(Vehicle.v_id))) or 0
    active_vehicles = db.scalar(select(func.count(Vehicle.v_id)).where(Vehicle.status == "Active")) or 0
    maintenance_vehicles = db.scalar(select(func.count(Vehicle.v_id)).where(Vehicle.status == "Maintenance")) or 0
    out_of_service_vehicles = db.scalar(select(func.count(Vehicle.v_id)).where(Vehicle.status == "Out of Service")) or 0

    # Trips metrics
    total_trips = db.scalar(select(func.count(Trip.id))) or 0
    in_progress_trips = db.scalar(select(func.count(Trip.id)).where(Trip.status == "In Progress")) or 0
    completed_trips = db.scalar(select(func.count(Trip.id)).where(Trip.status == "Completed")) or 0
    total_distance_km = db.scalar(select(func.sum(Trip.distance_km))) or 0.0
    total_fuel_consumed_liters = db.scalar(select(func.sum(Trip.fuel_consumed_liters))) or 0.0

    # Maintenance metrics
    total_maintenance_cost = db.scalar(select(func.sum(MaintenanceLog.cost))) or 0.0
    pending_maintenance_count = db.scalar(
        select(func.count(MaintenanceLog.id)).where(MaintenanceLog.status.in_(["Scheduled", "In Progress"]))
    ) or 0

    return FleetOverviewResponse(
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        maintenance_vehicles=maintenance_vehicles,
        out_of_service_vehicles=out_of_service_vehicles,
        total_trips=total_trips,
        in_progress_trips=in_progress_trips,
        completed_trips=completed_trips,
        total_distance_km=round(total_distance_km, 2),
        total_fuel_consumed_liters=round(total_fuel_consumed_liters, 2),
        total_distance_miles=round(total_distance_km, 2),
        total_fuel_consumed_gallons=round(total_fuel_consumed_liters, 2),
        total_maintenance_cost=round(total_maintenance_cost, 2),
        pending_maintenance_count=pending_maintenance_count
    )
