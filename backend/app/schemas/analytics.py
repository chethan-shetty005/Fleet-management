from pydantic import BaseModel

class FleetOverviewResponse(BaseModel):
    total_vehicles: int
    active_vehicles: int
    maintenance_vehicles: int
    out_of_service_vehicles: int
    total_trips: int
    in_progress_trips: int
    completed_trips: int
    total_distance_miles: float
    total_fuel_consumed_gallons: float
    total_maintenance_cost: float
    pending_maintenance_count: int
