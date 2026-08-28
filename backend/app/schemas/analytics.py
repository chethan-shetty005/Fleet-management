from pydantic import BaseModel, Field, model_validator

class FleetOverviewResponse(BaseModel):
    total_vehicles: int
    active_vehicles: int
    maintenance_vehicles: int
    out_of_service_vehicles: int
    total_trips: int
    in_progress_trips: int
    completed_trips: int
    total_distance_km: float = Field(..., description="Total distance driven in kilometers")
    total_fuel_consumed_liters: float = Field(..., description="Total fuel consumed in liters")
    total_distance_miles: float = Field(..., description="Alias for total_distance_km")
    total_fuel_consumed_gallons: float = Field(..., description="Alias for total_fuel_consumed_liters")
    total_maintenance_cost: float
    pending_maintenance_count: int

    @model_validator(mode='before')
    @classmethod
    def populate_unit_aliases(cls, data):
        if isinstance(data, dict):
            if "total_distance_km" in data and "total_distance_miles" not in data:
                data["total_distance_miles"] = data["total_distance_km"]
            elif "total_distance_miles" in data and "total_distance_km" not in data:
                data["total_distance_km"] = data["total_distance_miles"]

            if "total_fuel_consumed_liters" in data and "total_fuel_consumed_gallons" not in data:
                data["total_fuel_consumed_gallons"] = data["total_fuel_consumed_liters"]
            elif "total_fuel_consumed_gallons" in data and "total_fuel_consumed_liters" not in data:
                data["total_fuel_consumed_liters"] = data["total_fuel_consumed_gallons"]
        return data
