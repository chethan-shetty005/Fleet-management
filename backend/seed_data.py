import os
import sys
from datetime import datetime, date, timedelta

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog

def seed_database():
    """
    Populates SQLite database with initial realistic sample fleet data.
    """
    print("Re-creating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding Vehicles...")
        v1 = Vehicle(
            v_id="VH001",
            license_plate="KA01AB1234",
            vin="1FTFW1ED4MFC12345",
            make="Ford",
            model="F-150 Lightning",
            year=2023,
            vehicle_type="Truck",
            fuel_type="Electric",
            status="Active",
            current_mileage=14250.0
        )
        v2 = Vehicle(
            v_id="VH002",
            license_plate="FLT-202",
            vin="1FUJA6CV8DL567890",
            make="Freightliner",
            model="Cascadia",
            year=2022,
            vehicle_type="Tractor",
            fuel_type="Diesel",
            status="Active",
            current_mileage=87400.5
        )
        v3 = Vehicle(
            v_id="VH003",
            license_plate="FLT-303",
            vin="YV1A42CL9N1987654",
            make="Caterpillar",
            model="D8T",
            year=2021,
            vehicle_type="Earth Mover",
            fuel_type="Diesel",
            status="Maintenance",
            current_mileage=11200.0
        )
        v4 = Vehicle(
            v_id="VH004",
            license_plate="FLT-404",
            vin="5YJSA1E28HF345678",
            make="Tesla",
            model="Semi",
            year=2024,
            vehicle_type="Truck",
            fuel_type="Electric",
            status="Active",
            current_mileage=5300.2
        )

        db.add_all([v1, v2, v3, v4])
        db.commit()

        # Refresh to get IDs
        db.refresh(v1)
        db.refresh(v2)
        db.refresh(v3)
        db.refresh(v4)

        print("Seeding Trips...")
        t1 = Trip(
            trip_number="KA-TRIP-1001",
            vehicle_id=v1.v_id,
            start_location="Bengaluru Hub",
            end_location="Mysuru Distribution Center",
            start_time=datetime.utcnow() - timedelta(days=2),
            end_time=datetime.utcnow() - timedelta(days=2, hours=-3),
            status="Completed",
            distance_km=145.0,
            fuel_consumed_liters=0.0  # Electric
        )
        t2 = Trip(
            trip_number="MH-TRIP-1002",
            vehicle_id=v2.v_id,
            start_location="Mumbai Freight Hub",
            end_location="Pune Industrial Yard",
            start_time=datetime.utcnow() - timedelta(hours=5),
            status="In Progress",
            distance_km=150.0,
            fuel_consumed_liters=35.0
        )
        t3 = Trip(
            trip_number="DL-TRIP-1003",
            vehicle_id=v4.v_id,
            start_location="Delhi Logistics Center",
            end_location="Jaipur Distribution Hub",
            start_time=datetime.utcnow() + timedelta(days=1),
            status="Scheduled",
            distance_km=280.0,
            fuel_consumed_liters=0.0
        )

        db.add_all([t1, t2, t3])

        print("Seeding Maintenance Logs...")
        m1 = MaintenanceLog(
            log_id="MNT-1001",
            vehicle_id=v3.v_id,
            service_type="Engine Repair",
            description="Turbine injector service and coolant system flush",
            cost=1250.0,
            service_date=date.today(),
            status="In Progress",
            performed_by="Volvo Heavy Diesel Repair"
        )
        m2 = MaintenanceLog(
            log_id="MNT-1002",
            vehicle_id=v1.v_id,
            service_type="Tire Rotation",
            description="Standard 10,000 km tire rotation and brake inspection",
            cost=120.0,
            service_date=date.today() - timedelta(days=15),
            status="Completed",
            performed_by="QuickFleet Service"
        )

        db.add_all([m1, m2])
        db.commit()

        print("✅ Database successfully seeded!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
