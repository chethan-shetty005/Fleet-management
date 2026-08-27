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
            vin="1FTFW1ED4MFC12345",
            license_plate="FLT-101",
            make="Ford",
            model="F-150 Lightning",
            year=2023,
            fuel_type="Electric",
            status="Active",
            current_mileage=14250.0
        )
        v2 = Vehicle(
            vin="1FUJA6CV8DL567890",
            license_plate="FLT-202",
            make="Freightliner",
            model="Cascadia",
            year=2022,
            fuel_type="Diesel",
            status="Active",
            current_mileage=87400.5
        )
        v3 = Vehicle(
            vin="YV1A42CL9N1987654",
            license_plate="FLT-303",
            make="Volvo",
            model="FH16",
            year=2021,
            fuel_type="Diesel",
            status="Maintenance",
            current_mileage=112000.0
        )
        v4 = Vehicle(
            vin="5YJSA1E28HF345678",
            license_plate="FLT-404",
            make="Tesla",
            model="Semi",
            year=2024,
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
            trip_number="TRIP-1001",
            vehicle_id=v1.id,
            start_location="Chicago Depot",
            end_location="Milwaukee Distribution Center",
            start_time=datetime.utcnow() - timedelta(days=2),
            end_time=datetime.utcnow() - timedelta(days=2, hours=-3),
            status="Completed",
            distance_miles=92.5,
            fuel_consumed_gallons=0.0  # Electric
        )
        t2 = Trip(
            trip_number="TRIP-1002",
            vehicle_id=v2.id,
            start_location="Indianapolis Hub",
            end_location="Columbus Warehouse",
            start_time=datetime.utcnow() - timedelta(hours=5),
            status="In Progress",
            distance_miles=175.0,
            fuel_consumed_gallons=25.0
        )
        t3 = Trip(
            trip_number="TRIP-1003",
            vehicle_id=v4.id,
            start_location="Detroit Plant",
            end_location="Cleveland Hub",
            start_time=datetime.utcnow() + timedelta(days=1),
            status="Scheduled",
            distance_miles=170.0,
            fuel_consumed_gallons=0.0
        )

        db.add_all([t1, t2, t3])

        print("Seeding Maintenance Logs...")
        m1 = MaintenanceLog(
            vehicle_id=v3.id,
            service_type="Engine Repair",
            description="Turbine injector service and coolant system flush",
            cost=1250.0,
            service_date=date.today(),
            status="In Progress",
            performed_by="Volvo Heavy Diesel Repair"
        )
        m2 = MaintenanceLog(
            vehicle_id=v1.id,
            service_type="Tire Rotation",
            description="Standard 10,000 mile tire rotation and brake inspection",
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
